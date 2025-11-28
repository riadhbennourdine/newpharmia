import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import { Webinar, WebinarStatus, UserRole, WebinarResource } from '../types';
import Loader from '../components/Loader';
import { SparklesIcon, ShoppingCartIcon, CheckCircleIcon, PlayIcon, DocumentTextIcon, PhotoIcon, BookOpenIcon } from '../components/Icons';

interface WebinarResourceIconProps {
    resource: WebinarResource;
}

const WebinarResourceIcon: React.FC<WebinarResourceIconProps> = ({ resource }) => {
    let IconComponent: React.ElementType;
    let label: string;

    switch (resource.type) {
        case 'youtube':
            IconComponent = PlayIcon;
            label = resource.title || 'Replay Vidéo';
            break;
        case 'infographic':
            IconComponent = PhotoIcon;
            label = resource.title || 'Infographie';
            break;
        case 'pdf':
            IconComponent = DocumentTextIcon;
            label = resource.title || 'Diaporama';
            break;
        case 'link':
            IconComponent = BookOpenIcon; // Using BookOpen for general link or MemoFiche
            label = resource.title || 'Lien';
            break;
        default:
            return null;
    }

    return (
        <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex flex-col items-center p-2 text-slate-600 hover:text-teal-600 transition-colors"
            title={label}
        >
            <IconComponent className="h-6 w-6" />
            <span className="text-xs mt-1 truncate w-full text-center">{label}</span>
        </a>
    );
};

const WebinarCard: React.FC<{ 
    webinar: Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus },
    isLiveCard?: boolean,
    isMyWebinarCard?: boolean // New prop
}> = ({ webinar, isLiveCard, isMyWebinarCard = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { findItem } = useCart();
    const isInCart = !!findItem(webinar._id as string);

    const isAdmin = user?.role === UserRole.ADMIN;
    const isWebinarAdmin = user?.role === UserRole.ADMIN_WEBINAR;

    const renderButtons = () => {
        if (webinar.calculatedStatus === WebinarStatus.PAST) {
            return (
                <p className="text-sm text-slate-500 italic">Webinaire passé</p>
            );
        }
        if (webinar.registrationStatus === 'CONFIRMED' && !webinar.googleMeetLink) {
            return (
                <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    Inscription validée
                </button>
            );
        }
        if (webinar.registrationStatus === 'CONFIRMED' && webinar.googleMeetLink) {
            return (
                <a
                    href={webinar.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                    <span className="mr-2">Rejoindre</span>
                    <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6" />
                </a>
            );
        }
        if (webinar.registrationStatus === 'PENDING' || webinar.registrationStatus === 'PAYMENT_SUBMITTED') {
            return (
                 <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                >
                    Voir inscription
                </button>
            );
        }
        if (isInCart) {
            return (
                <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors"
                >
                    Ajouté
                </button>
            );
        }
        return (
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="text-sm bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-lg hover:bg-slate-300 transition-colors"
                >
                    Détails et Inscriptions
                </button>
            </div>
        );
    };

    if (isLiveCard) {
        return (
            <div className="group bg-white rounded-lg border border-slate-200 hover:border-teal-500 transition-shadow duration-300 overflow-hidden flex flex-col">
                <Link to={`/webinars/${webinar._id}`} className="block relative">
                    <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-24 w-full object-cover" />
                    {webinar.calculatedStatus === WebinarStatus.LIVE && (
                        <img src="https://newpharmia-production.up.railway.app/uploads/imageFile-1762858268856-857165789.gif" alt="Live Icon" className="absolute top-2 left-2 h-12 w-12" />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm font-bold px-2 py-1 rounded">
                        {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </Link>
                <div className="p-4 flex flex-col">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center">
                            <Link to={`/webinars/${webinar._id}`} className="flex items-center">
                                <SparklesIcon className="h-5 w-5 text-teal-500 mr-2" />
                                {webinar.title}
                            </Link>
                        </h3>
                        {webinar.registrationStatus === 'CONFIRMED' && webinar.googleMeetLink && (
                            <a
                                href={webinar.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                            >
                                <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6 mr-2" />
                                Rejoindre
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group bg-white rounded-lg border border-slate-200 hover:border-teal-500 transition-shadow duration-300 overflow-hidden flex flex-col">
            <Link to={`/webinars/${webinar._id}`} className="block relative">
                <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-40 w-full object-cover" />
                {webinar.calculatedStatus === WebinarStatus.LIVE && (
                    <img src="https://newpharmia-production.up.railway.app/uploads/imageFile-1762858268856-857165789.gif" alt="Live Icon" className="absolute top-2 left-2 h-12 w-12" />
                )}
            </Link>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center">
                    <Link to={`/webinars/${webinar._id}`} className="flex items-center">
                        <SparklesIcon className="h-5 w-5 text-teal-500 mr-2" />
                        {webinar.title}
                    </Link>
                </h3>
                <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mt-1">Animé par {webinar.presenter}</p>
                <p className="text-xs text-slate-500 mt-1">Le {new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                {!isMyWebinarCard && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">{webinar.description}</p>
                )}
            </div>
            <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50 flex flex-row justify-between items-center">
                <p className="text-xl font-bold text-teal-600 py-2">
                    {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                {renderButtons()}
            </div>
            {isMyWebinarCard && (webinar.resources && webinar.resources.length > 0) && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-around items-center">
                    {webinar.resources.map((resource, index) => (
                        <WebinarResourceIcon key={index} resource={resource} />
                    ))}
                </div>
            )}
            {isMyWebinarCard && (isAdmin || isWebinarAdmin) && (
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Documents et Médias</h4>
                    {webinar.resources && webinar.resources.length > 0 ? (
                        <ul className="space-y-2">
                            {webinar.resources.map((resource, index) => (
                                <li key={index} className="flex items-center justify-between text-sm text-slate-600">
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                                        {resource.title || resource.url} ({resource.type})
                                    </a>
                                    <div className="flex space-x-2">
                                        <button className="text-blue-500 hover:text-blue-700">Modifier</button>
                                        <button className="text-red-500 hover:text-red-700">Supprimer</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">Aucun média ajouté pour ce webinaire.</p>
                    )}
                    <button className="mt-3 bg-teal-600 text-white text-sm px-3 py-1 rounded hover:bg-teal-700">Ajouter un média</button>
                </div>
            )}
        </div>
    );
};

const WebinarsPage: React.FC = () => {
    const [webinars, setWebinars] = useState<(Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus })[]>([]);
    const [myWebinars, setMyWebinars] = useState<(Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus })[]>([]);
    const [liveWebinar, setLiveWebinar] = useState<(Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchWebinars = async () => {
            if (authLoading) return;
            setLoading(true);
            try {
                const response = await fetch('/api/webinars/list-for-user', {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch webinars');
                }
                const data = await response.json();
                
                const now = new Date();
                const upcoming = data.filter((w: any) => new Date(w.date) > now && w.calculatedStatus !== WebinarStatus.LIVE);
                const userRegistered = data.filter((w: any) => w.registrationStatus === 'CONFIRMED' && new Date(w.date) > now);
                const live = data.find((w: any) => w.calculatedStatus === WebinarStatus.LIVE);

                setWebinars(upcoming);
                setMyWebinars(userRegistered);
                setLiveWebinar(live || null);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWebinars();
    }, [user, authLoading]);

    if (loading || authLoading) {
        return <Loader />;
    }

    if (error) {
        return <div className="text-center text-red-500 mt-10">Erreur: {error}</div>;
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* En-tête */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-teal-600 mb-2">Nos Webinaires</h1>
                    <p className="text-lg text-slate-600">Formations en direct, conçues pour vous par des experts.</p>
                </div>

                {/* Webinaire en direct */}
                {liveWebinar && (
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-slate-800 mb-6 flex items-center">
                            <span className="text-red-500 mr-4">●</span> En Direct
                        </h2>
                        <WebinarCard webinar={liveWebinar} isLiveCard={true} />
                    </div>
                )}
                
                {/* Mes Webinaires */}
                {user && myWebinars.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-slate-800 mb-6">Mes Prochains Webinaires</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myWebinars.map(webinar => <WebinarCard key={webinar._id} webinar={webinar} isMyWebinarCard={true} />)}
                        </div>
                    </div>
                )}
                
                {/* Prochains Webinaires */}
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-6">Tous les Prochains Webinaires</h2>
                    {webinars.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {webinars.map(webinar => <WebinarCard key={webinar._id} webinar={webinar} />)}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500">Aucun webinaire à venir pour le moment.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebinarsPage;
