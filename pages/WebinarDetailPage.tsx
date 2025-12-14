import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Webinar, User, UserRole, WebinarTimeSlot, WebinarGroup, ProductType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart, CartItem } from '../context/CartContext';
import { Spinner, CalendarIcon, UserIcon, ClockIcon, UploadIcon } from '../components/Icons';
import { BANK_DETAILS } from '../constants';

import EmbeddableViewer from '../components/EmbeddableViewer';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

const isHtmlString = (str: string | null | undefined): boolean => {
    if (!str) return false;
    return str.trim().startsWith('<') && str.trim().endsWith('>') && (/<[a-z][\s\S]*>/i.test(str) || /&lt;[a-z][\s\S]*&gt;/i.test(str));
};

const formatUrl = (url: string | undefined): string => {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    return url;
};

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
            return 'https://pharmaconseilbmb.com/photos/site/cropt/crop-tunis.png';
        case WebinarGroup.PHARMIA:
            return '/assets/logo-pharmia.png';
        default:
            return '';
    }
};

// WebinarActionButtons component to encapsulate the button rendering logic
const WebinarActionButtons: React.FC<{
    webinar: Webinar;
    userMasterClassCredits: number;
    onUseCredit: (webinarId: string) => Promise<void>;
    isAdded: boolean;
    handleGoToCart: () => void;
    handleAction: () => Promise<void>;
    buttonClassName: string;
    buttonText: string;
    buttonOnClick: () => Promise<void> | void;
    selectedSlots: WebinarTimeSlot[];
    isMasterClass: boolean;
    isUpdateMode: boolean;
}> = ({ webinar, userMasterClassCredits, onUseCredit, isAdded, handleGoToCart, handleAction, buttonClassName, buttonText, buttonOnClick, selectedSlots, isMasterClass, isUpdateMode }) => {
    const { addToCart } = useCart(); // Assuming addToCart is available in this scope

    if (isMasterClass && !isUpdateMode && !isAdded) {
        return (
            <div className="flex flex-col space-y-2 mt-4">
                {userMasterClassCredits > 0 && onUseCredit && (
                    <button
                        onClick={() => onUseCredit(webinar._id as string)}
                        className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700"
                        disabled={isAdded}
                    >
                        Payer avec 1 crédit
                    </button>
                )}
                <button
                    onClick={() => addToCart({ webinar: webinar, type: ProductType.WEBINAR, selectedSlots: [] })}
                    className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700"
                    disabled={isAdded}
                >
                    Ajouter au panier
                </button>
            </div>
        );
    } else {
        return (
            <button
                onClick={buttonOnClick}
                disabled={!isMasterClass && selectedSlots.length === 0 && !isAdded}
                className={buttonClassName}
            >
                {buttonText}
            </button>
        );
    }
};

// Simplified component for time slot selection leading to Add to Cart or updating registration
    const AddToCartForm: React.FC<{ 
    webinar: Webinar; // Added webinar prop
    initialSelectedSlots?: WebinarTimeSlot[]; // For already registered users
    onUpdateRegistration?: (newSlots: WebinarTimeSlot[]) => Promise<void>; // For registered users
    userMasterClassCredits?: number; // New prop for Master Class credit logic
    onUseCredit?: (webinarId: string) => Promise<void>; // New prop for Master Class credit registration
    isAdded: boolean; // Prop received from parent
    setIsAdded: React.Dispatch<React.SetStateAction<boolean>>; // Prop received from parent
}> = ({ webinar, initialSelectedSlots, onUpdateRegistration, userMasterClassCredits = 0, onUseCredit, isAdded, setIsAdded }) => {
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const isMasterClass = webinar.group === WebinarGroup.MASTER_CLASS;
    const [selectedSlots, setSelectedSlots] = useState<WebinarTimeSlot[]>(initialSelectedSlots || []);
    
    // isAdded and setIsAdded are now props
    // isInitiallyInCart removed

    // Determine if we are in "update registration" mode
    const isUpdateMode = !!onUpdateRegistration;

    // Check if the webinar date has passed
    const now = new Date();
    const webinarDateTime = new Date(webinar.date);
    const isPastWebinar = webinarDateTime < now;

    const handleCheckboxChange = (slot: WebinarTimeSlot) => {
        setSelectedSlots(prev => {
            const newSlots = prev.includes(slot)
                ? prev.filter(s => s !== slot)
                : [...prev, slot];
            
            // If in cart mode and item is already in cart, update it immediately
            if (!isUpdateMode && isInitiallyInCart) {
                // We need to update the item in the cart context if slots change
                // This assumes addToCart can also handle updates if item exists
                addToCart({ webinar: webinar, type: ProductType.WEBINAR, selectedSlots: newSlots });
            }
            return newSlots;
        });
    };

    const handleAction = async () => {
        if (!isMasterClass && selectedSlots.length === 0) { // Only check for slots if not a Master Class
            alert("Veuillez sélectionner au moins un créneau.");
            return;
        }

        if (isUpdateMode) {
            // Call the provided update registration function
            await onUpdateRegistration(selectedSlots);
            alert("Vos créneaux horaires ont été mis à jour avec succès.");
        } else {
            // Add to cart flow
            addToCart({ webinar: webinar, type: ProductType.WEBINAR, selectedSlots: selectedSlots });
            setIsAdded(true);
        }
    };

    const handleGoToCart = () => {
        navigate('/cart');
    };

    const buttonText = isUpdateMode
        ? 'Modifier les créneaux'
        : (isAdded ? 'Ajouté' : 'Ajouter au panier');

    const buttonOnClick = isUpdateMode
        ? handleAction
        : (isAdded ? handleGoToCart : handleAction);

    const buttonClassName = `w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors ${
        isUpdateMode
            ? 'bg-blue-600 text-white hover:bg-blue-700' // Blue for update mode
            : (isAdded
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed')
    }`;

    if (isPastWebinar && !isUpdateMode) { // If it's a past webinar and not in update mode (meaning not already registered)
        return (
            <div className="text-center text-red-600 font-semibold mt-4">
                Ce webinaire est passé. L'inscription n'est plus possible.
            </div>
        );
    }

    return (
        <div>
            {isMasterClass ? (
                <div className="text-center text-slate-700 font-semibold mb-4">
                    Inscription via crédits Master Class.
                    <p className="text-sm text-slate-500 mt-1">Choisissez ce webinaire et validez via votre panier.</p>
                </div>
            ) : (
                <>
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
                </>
            )}
            <WebinarActionButtons
                webinar={webinar}
                userMasterClassCredits={userMasterClassCredits}
                onUseCredit={onUseCredit}
                isAdded={isAdded}
                handleGoToCart={handleGoToCart}
                handleAction={handleAction}
                buttonClassName={buttonClassName}
                buttonText={buttonText}
                buttonOnClick={buttonOnClick}
                selectedSlots={selectedSlots}
                isMasterClass={isMasterClass}
                isUpdateMode={isUpdateMode}
            />
            {isAdded && !isUpdateMode && (
                <button
                    onClick={() => navigate('/webinars')}
                    className="w-full mt-2 text-center text-teal-600 font-semibold py-2 px-4 rounded-lg hover:bg-teal-50 transition-colors"
                >
                    Continuer à choisir un autre wébinaire
                </button>
            )}
        </div>
    );
};
const WebinarDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const webinarId = id;
    const [webinar, setWebinar] = useState<Webinar | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [webinarDescription, setWebinarDescription] = useState<string | null>(null);
    const { user, token } = useAuth();
    const { findItem } = useCart(); // Access findItem from useCart
    const [isAdded, setIsAdded] = useState(false); // New state elevated to WebinarDetailPage
    const navigate = useNavigate();

    // Effect to update isAdded state when webinar or cart items change
    useEffect(() => {
        if (webinar) {
            setIsAdded(!!findItem(webinar._id as string));
        }
    }, [webinar, findItem]);

    const handleUseCreditForMasterClass = async (webinarId: string) => {
        if (!user || !token || !webinarId) return;
        if (!window.confirm("Voulez-vous utiliser 1 crédit Master Class pour vous inscrire à ce webinaire ?")) return;

        try {
            const response = await fetch(`/api/webinars/${webinarId}/register-with-credit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ userId: user._id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to register with credit');
            }

            alert("Inscription confirmée avec succès ! 1 crédit a été utilisé.");
            window.location.reload(); 

        } catch (err: any) {
            alert(`Erreur lors de l'inscription avec crédit : ${err.message}`);
        }
    };

    const handleUpdateRegistration = async (newSlots: WebinarTimeSlot[]) => {
        if (!user || !webinarId) return;

        try {
            const response = await fetch(`/api/webinars/${webinarId}/attendees/${user._id}/slots`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ newSlots }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update time slots');
            }

            // Refetch webinar data to show updated slots
            // The useEffect will handle the refetch
        } catch (err: any) {
            alert(`Erreur lors de la mise à jour des créneaux : ${err.message}`);
        }
    };

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
            // The useEffect will handle the refetch
            alert('Participant supprimé avec succès.');

        } catch (err: any) {
            alert(`Erreur: ${err.message}`);
        }
    };

    useEffect(() => {
        const fetchWebinar = async () => {
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

                // --- NEW LOGIC FOR MASTERCLASS DESCRIPTION ---
                if (data.group === WebinarGroup.MASTER_CLASS) {
                    try {
                        const mdResponse = await fetch('/content/master_class_description.md');
                        if (mdResponse.ok) {
                            const mdText = await mdResponse.text();
                            setWebinarDescription(mdText);
                        } else {
                            console.warn("Failed to fetch global master_class_description.md");
                            setWebinarDescription(data.description); // Fallback to webinar's own description
                        }
                    } catch (mdErr) {
                        console.error("Error fetching global master_class_description.md:", mdErr);
                        setWebinarDescription(data.description); // Fallback to webinar's own description
                    }
                } else {
                    // Existing logic for non-MasterClass webinars
                    try {
                        const mdResponse = await fetch(`/content/webinars/${webinarId}.md`);
                        if (mdResponse.ok) {
                            const mdText = await mdResponse.text();
                            setWebinarDescription(mdText);
                        } else {
                            setWebinarDescription(null); // Explicitly set to null if no specific MD found
                        }
                    } catch (mdErr) {
                        console.warn("No specific markdown description found, using default.", mdErr);
                        setWebinarDescription(null); // Fallback to null (which means it will use webinar.description)
                    }
                }
                // --- END NEW LOGIC ---

            } catch (err: any) {
                setError(err.message);
            }
        };

        const initialLoad = async () => {
            setIsLoading(true);
            await fetchWebinar();
            setIsLoading(false);
        };
        initialLoad();

        if (webinar?.registrationStatus === 'PAYMENT_SUBMITTED') {
            const intervalId = setInterval(fetchWebinar, 5000);
            return () => clearInterval(intervalId);
        }
    }, [webinarId, token, webinar?.registrationStatus]);

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
    const registeredAttendee = webinar.attendees?.find(att => {
        // Handle both ObjectId string and populated User object for att.userId
        const attendeeId = typeof att.userId === 'object' ? att.userId._id.toString() : att.userId.toString();
        return attendeeId === user?._id?.toString();
    });
    const logoUrl = getGroupLogo(webinar.group);

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-2xl mx-auto">

                    <div className="flex flex-col items-center gap-4 mb-6">
                        {logoUrl && <img src={logoUrl} alt={`${webinar.group} Logo`} className="h-24 w-auto mb-2" />}
                        <h1 className="text-3xl font-bold text-teal-600 text-center">
                            {webinar.group === WebinarGroup.CROP_TUNIS ? (
                                <>Préparateurs en Ligne - {webinar.group}</>
                            ) : (
                                <>Wébinaires - {webinar.group}</>
                            )}
                        </h1>
                    </div>

                    <div className="relative mb-6 pb-[56.25%] rounded-lg overflow-hidden shadow-lg"> {/* 16:9 Aspect Ratio */}
                        <img
                            src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'}
                            alt={webinar.title}
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                        {/* Overlay for text */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10 flex flex-col justify-end p-6">
                            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">{webinar.title}</h2>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg opacity-90 text-white">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5" />
                                    <span className="font-medium">
                                        {webinar.group === WebinarGroup.MASTER_CLASS
                                            ? `Date : ${new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                                            : new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserIcon className="h-5 w-5" />
                                    <span className="font-medium">Animé par {webinar.presenter}</span>
                                </div>
                            </div>
                        </div>
                    </div>                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-8">
                            <div className="relative prose prose-lg max-w-none text-slate-700 mb-8 mt-8"> {/* Added mt-8 here */}
                                <MarkdownRenderer content={
                                    webinar.group === WebinarGroup.MASTER_CLASS
                                        ? (
                                            (webinar.description ? webinar.description + "\n\n---\n\n" : "") +
                                            (webinarDescription || "")
                                        )
                                        : (
                                            webinarDescription && !isHtmlString(webinarDescription)
                                                ? webinarDescription
                                                : (
                                                    webinar.description && !isHtmlString(webinar.description)
                                                        ? webinar.description
                                                        : "Description non disponible ou formatée incorrectement."
                                                )
                                        )
                                } />
                                {webinar.group === WebinarGroup.MASTER_CLASS && (
                                    <div className="absolute top-0 right-0 mt-0 mr-2 text-right"> {/* Adjusted mt-0 */}
                                        <p className="text-sm font-semibold text-slate-700">Prix du Master Class</p>
                                        <p className="text-2xl font-extrabold text-teal-600">
                                            {webinar.price ? `${webinar.price.toFixed(3)} DT` : 'Crédits Master Class'}
                                        </p>
                                        {webinar.price && (
                                            <p className="text-xs text-slate-500">Hors taxes</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            {webinar.group === WebinarGroup.MASTER_CLASS && !registeredAttendee && (
                                <div className="mt-6">
                                    <WebinarActionButtons
                                        webinar={webinar}
                                        userMasterClassCredits={user?.masterClassCredits || 0}
                                        onUseCredit={handleUseCreditForMasterClass}
                                        isAdded={isAdded}
                                        handleGoToCart={() => navigate('/cart')}
                                        handleAction={async () => { /* no action here, buttons handle their own */ }}
                                        buttonClassName="w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700"
                                        buttonText="S'inscrire" // Generic text, actual text comes from WebinarActionButtons
                                        buttonOnClick={async () => { /* no action here */ }}
                                        selectedSlots={[]}
                                        isMasterClass={true}
                                        isUpdateMode={false}
                                    />
                                </div>
                            )}

                            {webinar.calculatedStatus === 'PAST' && webinar.resources && webinar.resources.length > 0 && (
                                <div className="mt-8 pt-6 border-t">
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Ressources du Webinaire</h3>
                                    <div className="space-y-6">
                                        {webinar.resources.map((resource, index) => (
                                            <div key={index} className="border rounded-lg p-4">
                                                <h4 className="text-xl font-semibold mb-2">{resource.title}</h4>
                                                {resource.type === 'Diaporama' ? (
                                                    <EmbeddableViewer source={resource.source} />
                                                ) : (
                                                    <a href={resource.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        Accéder à la ressource
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50 p-6 rounded-lg mt-8">
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">INSCRIPTION</h2>
                                
                                {registeredAttendee && (registeredAttendee.status === 'PAYMENT_SUBMITTED' || registeredAttendee.status === 'CONFIRMED') ? (
                                    <div>
                                        <p className={`font-semibold text-center mb-4 ${registeredAttendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>
                                            {registeredAttendee.status === 'CONFIRMED' ? 'Votre inscription est confirmée !' : 'Votre inscription est en attente de validation.'}
                                        </p>
                                        {registeredAttendee.timeSlots && registeredAttendee.timeSlots.length > 0 && webinar.group !== WebinarGroup.MASTER_CLASS && (
                                            <>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Vos créneaux choisis :</h3>
                                                {/* Display current slots or allow modification */}
                                                                                                 <AddToCartForm 
                                                                                                    webinar={webinar} // Pass the webinar object
                                                                                                    initialSelectedSlots={registeredAttendee.timeSlots}
                                                                                                    onUpdateRegistration={handleUpdateRegistration}
                                                                                                    userMasterClassCredits={user?.masterClassCredits || 0}
                                                                                                    onUseCredit={handleUseCreditForMasterClass}
                                                                                                    isAdded={isAdded} // Pass isAdded state
                                                                                                    setIsAdded={setIsAdded} // Pass setIsAdded setter
                                                                                                />
                                                                                            </>
                                                                                        )}
                                                                                        {registeredAttendee.status === 'CONFIRMED' && webinar.googleMeetLink && webinar.googleMeetLink.trim() && (
                                                                                            <a
                                                                                                href={formatUrl(webinar.googleMeetLink)}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="w-full mt-4 inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                                                                                            >
                                                                                                <span className="mr-2">Rejoindre la conférence</span>
                                                                                                <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6" />
                                                                                            </a>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <AddToCartForm 
                                                                                        webinar={webinar} 
                                                                                        userMasterClassCredits={user?.masterClassCredits || 0}
                                                                                        onUseCredit={handleUseCreditForMasterClass}
                                                                                        isAdded={isAdded} // Pass isAdded state
                                                                                        setIsAdded={setIsAdded} // Pass setIsAdded setter
                                                                                    /> // Pass the webinar object
                                                                                )}                            </div>

                            {(user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR) && webinar.attendees && (
                                 <div className="mt-8 p-4 border-t border-gray-200">
                                    <h3 className="text-xl font-semibold text-slate-800">Participants ({webinar.attendees.length})</h3>
                                    <ul className="list-disc list-inside mt-2 text-slate-600">
                                        {webinar.attendees.map(attendee => (
                                            <li key={attendee.userId.toString()} className="flex items-center justify-between">
                                                <span>
                                                    {getUserDisplayName(attendee.userId as User)} - <span className={`font-semibold ${attendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>{attendee.status}</span>
                                                    {attendee.proofUrl && <a href={attendee.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 ml-2">(Voir justificatif)</a>}
                                                </span>
                                                {(user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR) && (
                                                    <button
                                                        onClick={() => handleDeleteAttendee((attendee.userId as User)._id.toString())}
                                                        className="ml-4 text-red-500 hover:text-red-700 text-sm"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
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