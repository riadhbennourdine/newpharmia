import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webinar, User, UserRole, WebinarTimeSlot, WebinarGroup } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart, CartItem } from '../context/CartContext';
import { Spinner, CalendarIcon, UserIcon, ClockIcon, UploadIcon } from '../components/Icons';
import { BANK_DETAILS } from '../constants';

const getUserDisplayName = (user: Partial<User>): string => {
    if (typeof user !== 'object' || user === null) return 'ID Inconnu';
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || 'Utilisateur inconnu';
};

const getGroupLogo = (group: WebinarGroup): string => {
    switch (group) {
        case WebinarGroup.CROP_TUNIS:
            return 'https://pharmaconseilbmb.com/photos/site/crop/crop-tunis.png';
        case WebinarGroup.PHARMIA:
            return '/assets/logo-pharmia.png';
        default:
            return '';
    }
};

// Simplified component for time slot selection leading to Add to Cart
const AddToCartForm: React.FC<{ webinarId: string }> = ({ webinarId }) => {
    const { addToCart, findItem } = useCart();
    const navigate = useNavigate();
    const [selectedSlots, setSelectedSlots] = useState<WebinarTimeSlot[]>(() => {
        const existingItem = findItem(webinarId);
        return existingItem ? existingItem.slots : [];
    });
    
    // Check if the item is in the cart on initial render
    const isInitiallyInCart = !!findItem(webinarId);
    const [isAdded, setIsAdded] = useState(isInitiallyInCart);

    const handleCheckboxChange = (slot: WebinarTimeSlot) => {
        setSelectedSlots(prev => {
            const newSlots = prev.includes(slot)
                ? prev.filter(s => s !== slot)
                : [...prev, slot];
            
            // If item is already in cart, update it immediately
            if (isInitiallyInCart) {
                addToCart({ webinarId, slots: newSlots });
            }
            return newSlots;
        });
    };

    const handleAddToCart = () => {
        if (selectedSlots.length === 0) {
            alert("Veuillez sélectionner au moins un créneau.");
            return;
        }
        addToCart({ webinarId, slots: selectedSlots });
        setIsAdded(true);
    };

    const handleGoToCart = () => {
        navigate('/cart');
    };

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Choisissez vos créneaux</h3>
            <p className="text-sm text-slate-500 mb-3">Vous pouvez sélectionner un ou plusieurs créneaux.</p>
            <div className="space-y-2">
                {Object.values(WebinarTimeSlot).map((slot) => (
                    <label key={slot} className="flex items-center p-3 border rounded-lg has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-colors cursor-pointer">
                        <input
                            type="checkbox"
                            name="timeSlot"
                            value={slot}
                            checked={selectedSlots.includes(slot)}
                            onChange={() => handleCheckboxChange(slot)}
                            className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="ml-3 font-medium text-slate-700">{slot}</span>
                    </label>
                ))}
            </div>
            <button
                onClick={isAdded ? handleGoToCart : handleAddToCart}
                disabled={!isAdded && selectedSlots.length === 0}
                className={`w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors ${
                    isAdded
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                }`}
            >
                {isAdded ? 'Ajouté' : 'Ajouter au panier'}
            </button>
        </div>
    );
};

const WebinarDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const webinarId = id;
    const [webinar, setWebinar] = useState<Webinar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

    const handleDeleteAttendee = async (attendeeUserId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) {
            return;
        }
        try {
            const response = await fetch(`/api/webinars/${webinarId}/attendees/${attendeeUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete attendee');
            }

            // Refetch webinar details to update the attendee list
            await fetchWebinar();
            alert('Participant supprimé avec succès.');

        } catch (err: any) {
            alert(`Erreur: ${err.message}`);
        }
    };

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

    if (isLoading) {
        return <div className="flex justify-center items-center py-12"><Spinner className="text-teal-600" /></div>;
    }

    if (error) {
        return <div className="text-center py-20 bg-red-50 text-red-700">Error: {error}</div>;
    }

    if (!webinar) {
        return <div className="text-center py-20">Webinar not found.</div>;
    }

    const registrationStatus = webinar.registrationStatus;
    const registeredAttendee = webinar.attendees?.find(att => att.userId.toString() === user?._id.toString());
    const logoUrl = getGroupLogo(webinar.group);

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-2xl mx-auto">

                    <div className="flex items-center gap-4 mb-6">
                        {logoUrl && <img src={logoUrl} alt={`${webinar.group} Logo`} className="h-12 w-auto" />}
                        <h1 className="text-3xl font-bold text-teal-600">
                            {webinar.group === WebinarGroup.CROP_TUNIS ? (
                                <>Préparateurs en Ligne - {webinar.group}</>
                            ) : (
                                <>Wébinaires - {webinar.group}</>
                            )}
                        </h1>
                    </div>

                    <div className="rounded-lg overflow-hidden shadow-lg relative h-80 flex items-end p-8 text-white bg-slate-800">
                        <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
                        <div className="relative z-20">
                            <h2 className="text-4xl font-extrabold tracking-tight">{webinar.title}</h2>
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

                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-8">
                            <div className="prose prose-lg max-w-none text-slate-700 mb-8" dangerouslySetInnerHTML={{ __html: webinar.description.replace(/\n/g, '<br />') }} />

                            <div className="bg-slate-50 p-6 rounded-lg">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">INSCRIPTION</h2>
                                
                                <AddToCartForm webinarId={webinarId!} />

                            </div>

                            {user?.role === UserRole.ADMIN && webinar.attendees && (
                                 <div className="mt-8 p-4 border-t border-gray-200">
                                    <h3 className="text-xl font-semibold text-slate-800">Participants ({webinar.attendees.length})</h3>
                                    <ul className="list-disc list-inside mt-2 text-slate-600">
                                        {webinar.attendees.map(attendee => (
                                            <li key={attendee.userId.toString()} className="flex items-center justify-between">
                                                <span>
                                                    {getUserDisplayName(attendee.userId as User)} - <span className={`font-semibold ${attendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>{attendee.status}</span>
                                                    {attendee.proofUrl && <a href={attendee.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 ml-2">(Voir justificatif)</a>}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteAttendee((attendee.userId as User)._id.toString())}
                                                    className="ml-4 text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Supprimer
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebinarDetailPage;
