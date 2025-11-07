import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webinar, User, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Spinner, CalendarIcon, UserIcon, ClockIcon, UploadIcon } from '../components/Icons';

// New component for the payment submission step
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
            // 1. Upload the file
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('File upload failed');
            }
            const uploadData = await uploadResponse.json();
            const proofUrl = uploadData.fileUrl;

            // 2. Submit the payment proof URL
            const paymentResponse = await fetch(`/api/webinars/${webinarId}/submit-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ proofUrl }),
            });

            if (!paymentResponse.ok) {
                throw new Error('Failed to submit proof of payment');
            }

            // 3. Notify parent component
            onPaymentSubmitted();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-800">Finaliser l'inscription</h3>
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-bold text-blue-800">Pass Journée Formation : 80 DT pour toute l'équipe officinale</p>
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

const WebinarDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [webinar, setWebinar] = useState<Webinar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // This derived state will be the base truth from the server
    const serverRegistration = useMemo(() => {
        if (!webinar || !user) return null;
        return webinar.attendees.find(att => att.userId.toString() === user._id.toString());
    }, [webinar, user]);

    // This local state will drive the UI for a more responsive experience
    const [localRegStatus, setLocalRegStatus] = useState<string | null>(null);

    useEffect(() => {
        // Sync local state with server state whenever webinar data changes
        setLocalRegStatus(serverRegistration?.status || null);
    }, [serverRegistration]);


    const fetchWebinar = async () => {
        if (!id) return;
        // Set loading to true only on initial load
        if (!webinar) setIsLoading(true);
        try {
            const response = await fetch(`/api/webinars/${id}?cacheBust=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch webinar details');
            }
            const data = await response.json();
            setWebinar(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWebinar();
    }, [id]);

    const handleRegister = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setIsRegistering(true);
        setRegistrationMessage(null);

        try {
            const response = await fetch(`/api/webinars/${id}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            // Immediately update the UI state to show the next step
            setLocalRegStatus('PENDING');
            setRegistrationMessage(data.message || 'Successfully registered!');
            
            // Fetch fresh data from server in the background to ensure consistency
            await fetchWebinar();

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

    const isRegistered = !!serverRegistration;

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-8">
                        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{webinar.title}</h1>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 mb-6">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                <span className="font-medium">{new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-5 w-5" />
                                <span className="font-medium">{new Date(webinar.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                <span className="font-medium">Animé par {webinar.presenter}</span>
                            </div>
                        </div>

                        <div className="prose prose-lg max-w-none text-slate-700 mb-8" dangerouslySetInnerHTML={{ __html: webinar.description.replace(/\n/g, '<br />') }} />

                        <div className="bg-slate-50 p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Inscription</h2>
                            
                            {!isRegistered && localRegStatus !== 'PENDING' ? (
                                <button 
                                    onClick={handleRegister}
                                    disabled={isRegistering}
                                    className="w-full bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                                >
                                    {isRegistering ? 'Inscription en cours...' : 'S\'inscrire à ce webinaire'}
                                </button>
                            ) : localRegStatus === 'PENDING' ? (
                                <SubmitPayment webinarId={id!} token={token} onPaymentSubmitted={fetchWebinar} />
                            ) : localRegStatus === 'PAYMENT_SUBMITTED' ? (
                                <p className="text-center text-blue-600 font-semibold">Votre justificatif a été soumis et est en cours de validation.</p>
                            ) : localRegStatus === 'CONFIRMED' ? (
                                <div className="text-center">
                                    <p className="text-green-600 font-semibold mb-4">Votre inscription est confirmée !</p>
                                    {webinar.googleMeetLink ? (
                                        <a 
                                            href={webinar.googleMeetLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                                        >
                                            Rejoindre avec Google Meet
                                        </a>
                                    ) : (
                                        <p className="text-slate-500">Le lien de la réunion sera bientôt disponible.</p>
                                    )}
                                </div>
                            ) : null}

                            {registrationMessage && <p className="mt-4 text-center text-sm font-medium">{registrationMessage}</p>}
                        </div>

                        {user?.role === UserRole.ADMIN && (
                             <div className="mt-8 p-4 border-t border-gray-200">
                                <h3 className="text-xl font-semibold text-slate-800">Participants ({webinar.attendees.length})</h3>
                                <ul className="list-disc list-inside mt-2 text-slate-600">
                                    {webinar.attendees.map(attendee => (
                                        <li key={attendee.userId.toString()}>
                                            {attendee.userId.toString()} - <span className={`font-semibold ${attendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>{attendee.status}</span>
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
