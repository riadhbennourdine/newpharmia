import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webinar, User, UserRole, WebinarTimeSlot } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Spinner, CalendarIcon, UserIcon, ClockIcon, UploadIcon } from '../components/Icons';

const getUserDisplayName = (user: Partial<User>): string => {
    if (typeof user !== 'object' || user === null) return 'ID Inconnu';
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Utilisateur inconnu';
};

// Component for the payment submission step (for both public and private users)
const SubmitPayment: React.FC<{ 
    webinarId: string; 
    token: string | null; 
    onPaymentSubmitted: () => void; 
}> = ({ webinarId, token, onPaymentSubmitted }) => { 
    
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setError('Veuillez sélectionner un fichier.');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!uploadResponse.ok) throw new Error('File upload failed');
            const uploadData = await uploadResponse.json();
            const proofUrl = uploadData.fileUrl;

            const paymentResponse = await fetch(`/api/webinars/${webinarId}/submit-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ proofUrl }),
            });

            if (!paymentResponse.ok) throw new Error('Failed to submit proof of payment');
            
            onPaymentSubmitted();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-800">Finaliser l\'inscription</h3>
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-bold text-blue-800">Pass Journée Formation : 80 DT pour toute l\'équipe officinale</p>
                <p className="text-sm text-blue-700 mt-1">Veuillez trouver les détails pour le paiement (RIB, etc.) dans la description du webinaire ci-dessus.</p>
            </div>
            
            <div className="mt-4">
                <label htmlFor="proof" className="block text-sm font-medium text-slate-700">Téléverser votre justificatif</label>
                <div className="mt-1 flex items-center gap-4">
                    <input 
                        type="file" 
                        name="proof" 
                        id="proof" 
                        onChange={handleFileChange} 
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" 
                    />
                </div>
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={isUploading || !file}
                className="w-full mt-4 inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
                <UploadIcon className="h-5 w-5 mr-2" />
                {isUploading ? 'Envoi en cours...' : 'Soumettre le justificatif'}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

// Component for authenticated user registration
const AuthenticatedRegistrationForm: React.FC<{
    isRegistering: boolean;
    onRegister: (timeSlots: WebinarTimeSlot[]) => void;
}> = ({ isRegistering, onRegister }) => {
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<WebinarTimeSlot[]>([]);

    const handleCheckboxChange = (slot: WebinarTimeSlot) => {
        setSelectedTimeSlots(prev =>
            prev.includes(slot)
                ? prev.filter(s => s !== slot)
                : [...prev, slot]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTimeSlots.length > 0) {
            onRegister(selectedTimeSlots);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Choisissez vos créneaux</h3>
            <p className="text-sm text-slate-500 mb-3">Vous pouvez sélectionner un ou plusieurs créneaux.</p>
            <div className="space-y-2">
                {Object.values(WebinarTimeSlot).map((slot) => (
                    <label key={slot} className="flex items-center p-3 border rounded-lg has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-colors cursor-pointer">
                        <input
                            type="checkbox"
                            name="timeSlot"
                            value={slot}
                            checked={selectedTimeSlots.includes(slot)}
                            onChange={() => handleCheckboxChange(slot)}
                            className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="ml-3 font-medium text-slate-700">{slot}</span>
                    </label>
                ))}
            </div>
            <button
                type="submit"
                disabled={isRegistering || selectedTimeSlots.length === 0}
                className="w-full mt-4 bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
            >
                {isRegistering ? 'Inscription en cours...' : 'Confirmer l\'inscription'}
            </button>
        </form>
    );
};

// New component for public (unauthenticated) user registration
const PublicRegistrationForm: React.FC<{
    webinarId: string;
    onRegistrationSuccess: () => void;
}> = ({ webinarId, onRegistrationSuccess }) => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<WebinarTimeSlot[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { setGuestToken } = useAuth();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (slot: WebinarTimeSlot) => {
        setSelectedTimeSlots(prev =>
            prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTimeSlots.length === 0 || !formData.firstName || !formData.lastName || !formData.email) {
            setMessage('Veuillez remplir tous les champs et sélectionner au moins un créneau.');
            return;
        }

        setIsRegistering(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/webinars/${webinarId}/public-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, timeSlots: selectedTimeSlots }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Public registration failed');
            }
            
            if (data.guestToken) {
                setGuestToken(data.guestToken);
            }
            
            // The parent component will automatically refetch on token change.
            setMessage(data.message);

        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">Prénom</label>
                <input type="text" name="firstName" id="firstName" onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">Nom</label>
                <input type="text" name="lastName" id="lastName" onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" name="email" id="email" onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
            </div>
            
            <div>
                <h3 className="text-md font-semibold text-slate-800 mb-2">Choisissez vos créneaux</h3>
                <div className="space-y-2">
                    {Object.values(WebinarTimeSlot).map((slot) => (
                        <label key={slot} className="flex items-center p-3 border rounded-lg has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-colors cursor-pointer">
                            <input type="checkbox" name="timeSlot" value={slot} checked={selectedTimeSlots.includes(slot)} onChange={() => handleCheckboxChange(slot)} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                            <span className="ml-3 font-medium text-slate-700">{slot}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button type="submit" disabled={isRegistering || selectedTimeSlots.length === 0} className="w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors">
                {isRegistering ? 'Inscription en cours...' : 'Confirmer l\'inscription'}
            </button>
            {message && <p className="mt-2 text-center text-sm font-medium">{message}</p>}
        </form>
    );
};


const WebinarDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const webinarId = id;
    const [webinar, setWebinar] = useState<Webinar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const fetchWebinar = useCallback(async () => {
        if (!webinarId) return;
        
        try {
            const headers: HeadersInit = { 'Cache-Control': 'no-cache' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/webinars/${webinarId}`, { headers });

            if (!response.ok) {
                throw new Error('Failed to fetch webinar details');
            }
            const data = await response.json();
            setWebinar(data);
        } catch (err: any) {
            setError(err.message);
        }
    }, [webinarId, token]);

    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            await fetchWebinar();
            setIsLoading(false);
        };
        initialLoad();
    }, [fetchWebinar]);

    useEffect(() => {
        if (webinar?.registrationStatus === 'PAYMENT_SUBMITTED') {
            const intervalId = setInterval(fetchWebinar, 5000);
            return () => clearInterval(intervalId);
        }
    }, [webinar?.registrationStatus, fetchWebinar]);


    const handleRegister = async (timeSlots: WebinarTimeSlot[]) => {
        if (!user) {
            navigate('/login');
            return;
        }

        setIsRegistering(true);
        setRegistrationMessage(null);

        try {
            const response = await fetch(`/api/webinars/${webinarId}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ timeSlots }),
            });

            const data = await response.json();

            if (response.ok || response.status === 409) {
                setRegistrationMessage(data.message);
                await fetchWebinar(); 
            } else {
                throw new Error(data.message || 'Registration failed');
            }

        } catch (err: any) {
            setRegistrationMessage(err.message);
        } finally {
            setIsRegistering(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="h-16 w-16 text-teal-600" /></div>;
    }

    if (error) {
        return <div className="text-center py-20 bg-red-50 text-red-700">Error: {error}</div>;
    }

    if (!webinar) {
        return <div className="text-center py-20">Webinar not found.</div>;
    }

    const registrationStatus = webinar.registrationStatus;
    const registeredAttendee = webinar.attendees?.find(att => att.userId.toString() === user?._id.toString());


    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg relative h-80 flex items-end p-8 text-white bg-slate-800">
                <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
                <div className="relative z-20">
                    <h1 className="text-4xl font-extrabold tracking-tight">{webinar.title}</h1>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg opacity-90">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            <span className="font-medium">{new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
                            <span className="font-medium">Animé par {webinar.presenter}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-16">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-8">
                        <div className="prose prose-lg max-w-none text-slate-700 mb-8" dangerouslySetInnerHTML={{ __html: webinar.description.replace(/\n/g, '<br />') }} />

                        <div className="bg-slate-50 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">INSCRIPTION</h2>
                            
                            {registrationStatus === 'CONFIRMED' ? (
                                <div className="text-center">
                                    <p className="text-green-600 font-semibold mb-2">Votre inscription est confirmée !</p>
                                    {registeredAttendee?.timeSlots && registeredAttendee.timeSlots.length > 0 && (
                                        <p className="text-slate-600 font-medium mb-4">Créneaux horaires : <span className="font-bold text-teal-700">{registeredAttendee.timeSlots.join(', ')}</span></p>
                                    )}
                                    {webinar.googleMeetLink ? (
                                        <><button
                                            onClick={() => window.open(webinar.googleMeetLink, '_blank', 'noopener,noreferrer')}
                                            className="inline-flex items-center justify-center bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors"
                                        >
                                            Rejoindre avec
                                        </button><div className="mt-4">
                                                <a href={webinar.googleMeetLink} target="_blank" rel="noopener noreferrer">
                                                    <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-12 mx-auto" />
                                                </a>
                                            </div></>
                                    ) : (
                                        <p className="text-slate-500">Le lien de la réunion sera bientôt disponible.</p>
                                    )}
                                </div>
                            ) : registrationStatus === 'PAYMENT_SUBMITTED' ? (
                                <p className="text-center text-blue-600 font-semibold">Votre justificatif a été soumis et est en cours de validation.</p>
                            ) : registrationStatus === 'PENDING' ? (
                                <SubmitPayment webinarId={webinarId!} token={token} onPaymentSubmitted={fetchWebinar} />
                            ) : (
                                // No registration status, decide which form to show
                                user ? (
                                    <AuthenticatedRegistrationForm isRegistering={isRegistering} onRegister={handleRegister} />
                                ) : (
                                    <PublicRegistrationForm webinarId={webinarId!} onRegistrationSuccess={fetchWebinar} />
                                )
                            )}

                            {registrationMessage && <p className="mt-4 text-center text-sm font-medium">{registrationMessage}</p>}
                        </div>

                        {user?.role === UserRole.ADMIN && webinar.attendees && (
                             <div className="mt-8 p-4 border-t border-gray-200">
                                <h3 className="text-xl font-semibold text-slate-800">Participants ({webinar.attendees.length})</h3>
                                <ul className="list-disc list-inside mt-2 text-slate-600">
                                    {webinar.attendees.map(attendee => (
                                        <li key={attendee.userId.toString()}>
                                            {getUserDisplayName(attendee.userId as User)} - <span className={`font-semibold ${attendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>{attendee.status}</span>
                                            {attendee.proofUrl && <a href={attendee.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 ml-2">(Voir justificatif)</a>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebinarDetailPage;
