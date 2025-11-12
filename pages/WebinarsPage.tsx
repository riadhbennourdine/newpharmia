import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Webinar, UserRole, WebinarGroup, WebinarStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext'; // Import useCart
import { Spinner, SparklesIcon, ShoppingCartIcon, CheckCircleIcon } from '../components/Icons';

const CropTunisIntro: React.FC = () => (
    <div className="mb-12">
        <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
            <img 
                src="https://pharmaconseilbmb.com/photos/site/crop/prepenligne.png" 
                alt="Préparateurs en ligne" 
                className="w-full h-auto"
            />
        </div>
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="text-base text-slate-600 space-y-3">
                <p>"Préparateurs en ligne" est un programme de formation continue spécifiquement conçu pour les préparateurs en pharmacie d'officine. Il vise à améliorer et actualiser leurs connaissances et compétences.</p>
                <p>Le programme propose des sessions en ligne (16 nouvelles séances pour la session 2025/2026), planifiées pour offrir une flexibilité maximale (trois présentations d'un même thème durant les mardis de chaque semaine.) afin de ne pas perturber l'organisation quotidienne de la pharmacie.</p>
                <p>L'objectif final est de faire de cette formation un atout majeur pour les pharmaciens en assurant la montée en compétence et la fidélisation de leurs équipes.</p>
            </div>
        </div>
    </div>
);

const WebinarCard: React.FC<{ 
    webinar: Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus },
    isLiveCard?: boolean
}> = ({ webinar, isLiveCard }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToCart, cartItems } = useCart();
    const isInCart = cartItems.includes(webinar._id as string);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation when clicking the button
        addToCart(webinar._id as string);
    };

    const renderButtons = () => {
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
        return (
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="text-sm bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-lg hover:bg-slate-300 transition-colors"
                >
                    Détails
                </button>
                <button
                    onClick={handleAddToCart}
                    disabled={isInCart}
                    className={`font-bold py-2 px-3 rounded-lg shadow-md transition-colors flex items-center ${
                        isInCart
                            ? 'bg-green-500 text-white cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                >
                    {isInCart ? <CheckCircleIcon className="h-5 w-5 mr-2" /> : <ShoppingCartIcon className="h-5 w-5 mr-2" />}
                    {isInCart ? 'Ajouté' : 'Ajouter'}
                </button>
            </div>
        );
    };

    if (isLiveCard) {
        // Simplified rendering for Live cards
        return (
            <div className="group bg-white rounded-lg border border-slate-200 hover:border-teal-500 transition-shadow duration-300 overflow-hidden flex flex-col">
                <Link to={`/webinars/${webinar._id}`} className="block relative">
                    <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-24 w-full object-cover" />
                    {webinar.calculatedStatus === WebinarStatus.LIVE && (
                        <img src="https://newpharmia-production.up.railway.app/uploads/imageFile-1762858268856-857165789.gif" alt="Live Icon" className="absolute top-2 left-2 h-12 w-12" />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm font-bold px-2 py-1 rounded">
                        {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </Link>
                <div className="p-4 flex flex-col">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate">{webinar.title}</h3>
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
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate">{webinar.title}</h3>
                <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mt-1">Animé par {webinar.presenter}</p>
                <p className="text-xs text-slate-500 mt-1">Le {new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">{webinar.description}</p>
            </div>
            <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50 flex flex-row justify-between items-center">
                <p className="text-xl font-bold text-teal-600 py-2">
                    {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {renderButtons()}
            </div>
        </div>
    );
};


const WebinarsPage: React.FC = () => {
    const [webinars, setWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<WebinarGroup>(WebinarGroup.CROP_TUNIS);
    const [nearestWebinar, setNearestWebinar] = useState<Webinar | null>(null);
    const [currentMonthWebinars, setCurrentMonthWebinars] = useState<Webinar[]>([]);
    const [futureMonthsWebinars, setFutureMonthsWebinars] = useState<Record<string, Webinar[]>>({});
    const [liveWebinars, setLiveWebinars] = useState<Webinar[]>([]);
    const [pastWebinars, setPastWebinars] = useState<Webinar[]>([]);
    const { user, token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWebinars = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch(`/api/webinars?group=${encodeURIComponent(activeTab)}`, { headers });
                if (!response.ok) {
                    throw new Error('Failed to fetch webinars');
                }
                const data = await response.json();

                const now = new Date();

                const liveWebinars = data.filter((w: Webinar) => w.calculatedStatus === WebinarStatus.LIVE);
                const upcomingWebinars = data
                    .filter((w: Webinar) => w.calculatedStatus === WebinarStatus.UPCOMING)
                    .sort((a: Webinar, b: Webinar) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const pastWebinars = data
                    .filter((w: Webinar) => w.calculatedStatus === WebinarStatus.PAST)
                    .sort((a: Webinar, b: Webinar) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Tri décroissant pour les passés

                setWebinars(data); // Garder tous les webinaires pour le rendu

                // Trouver le webinaire le plus proche parmi les prochains
                setNearestWebinar(upcomingWebinars.length > 0 ? upcomingWebinars[0] : null);

                // Séparer les webinaires du mois en cours et des mois futurs pour les prochains webinaires
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const currentMonthUpcoming = upcomingWebinars.filter(w => {
                    const d = new Date(w.date);
                    const isNearest = nearestWebinar && nearestWebinar._id === w._id;
                    return (d.getMonth() === currentMonth && d.getFullYear() === currentYear) && !isNearest;
                });
                setCurrentMonthWebinars(currentMonthUpcoming);

                const futureMonthsUpcoming = upcomingWebinars.filter(w => {
                    const d = new Date(w.date);
                    return d.getMonth() !== currentMonth || d.getFullYear() !== currentYear;
                });

                const groupedFutureWebinars = futureMonthsUpcoming.reduce((acc, webinar) => {
                    const date = new Date(webinar.date);
                    const monthYear = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

                    if (!acc[capitalizedMonthYear]) {
                        acc[capitalizedMonthYear] = [];
                    }
                    acc[capitalizedMonthYear].push(webinar);
                    return acc;
                }, {} as Record<string, Webinar[]>);
                setFutureMonthsWebinars(groupedFutureWebinars);

                // Stocker les webinaires live et passés séparément pour le rendu
                setLiveWebinars(liveWebinars);
                setPastWebinars(pastWebinars);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWebinars();
    }, [activeTab]);

    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR;

    const renderTabs = () => (
        <div className="mb-8 border-b border-slate-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab(WebinarGroup.CROP_TUNIS)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === WebinarGroup.CROP_TUNIS
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {WebinarGroup.CROP_TUNIS}
                </button>
                <button
                    onClick={() => setActiveTab(WebinarGroup.PHARMIA)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === WebinarGroup.PHARMIA
                            ? 'border-teal-500 text-teal-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {WebinarGroup.PHARMIA}
                </button>
                {isAdmin && (
                    <button
                        onClick={() => navigate('/admin/webinars')}
                        className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    >
                        Gérer les webinaires
                    </button>
                )}
            </nav>
        </div>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderTabs()}

            {activeTab === WebinarGroup.CROP_TUNIS && <CropTunisIntro />}

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold">Erreur de chargement</h3>
                    <p className="mt-2">{error}</p>
                </div>
            ) : webinars.length > 0 || liveWebinars.length > 0 || pastWebinars.length > 0 ? (
                <div className="space-y-12">
                                        {/* Live Webinars */}
                                        {liveWebinars.length > 0 && (
                                            <div className="mb-12">
                                                <h2 className="text-3xl font-bold text-slate-800 mb-4 flex items-center">
                                                    Webinaire en Direct
                                                </h2>
                                                <div className="p-6 bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-lg shadow-xl">
                                                    <div className="grid grid-cols-1 gap-6">
                                                        {liveWebinars.map(webinar => (
                                                            <WebinarCard key={webinar._id.toString()} webinar={webinar} isLiveCard={true} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                    {/* Next Upcoming Webinar (if not live) */}
                    {nearestWebinar && liveWebinars.length === 0 && (
                        <div className="mb-12 p-6 bg-white rounded-lg shadow-xl border-t-4 border-teal-500">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
                                <SparklesIcon className="h-6 w-6 text-teal-500 mr-2" /> Prochain Webinaire
                            </h2>
                            <WebinarCard webinar={nearestWebinar} />
                        </div>
                    )}

                    {/* Upcoming Webinars (Current Month) */}
                    {currentMonthWebinars.length > 0 && (
                         <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">
                                Prochains webinaires ce mois-ci
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentMonthWebinars.map(webinar => (
                                    <WebinarCard key={webinar._id.toString()} webinar={webinar} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Webinars (Future Months) */}
                    {Object.entries(futureMonthsWebinars).length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">
                                Prochains Mois
                            </h2>
                            {Object.entries(futureMonthsWebinars).map(([monthYear, monthWebinars]) => (
                                <div key={monthYear} className="mb-12">
                                    <h3 className="text-xl font-bold text-slate-700 mb-4">{monthYear}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {monthWebinars.map(webinar => (
                                            <WebinarCard key={webinar._id.toString()} webinar={webinar} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Past Webinars */}
                    {pastWebinars.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-slate-500 pb-2">
                                Webinaires Passés
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pastWebinars.map(webinar => (
                                    <WebinarCard key={webinar._id.toString()} webinar={webinar} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-700">Aucun webinaire pour le moment</h3>
                    <p className="text-slate-500 mt-2">Revenez bientôt pour découvrir nos prochaines sessions.</p>
                </div>
            )}
        </div>
    );
};

export default WebinarsPage;