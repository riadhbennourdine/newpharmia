import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Webinar, WebinarGroup, UserRole, WebinarStatus, WebinarResource, ProductType } from '../types';
import { MASTER_CLASS_PACKS, TAX_RATES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import WebinarCard from '../components/WebinarCard';
import ExpandableText from '../components/ExpandableText';
import Loader from '../components/Loader';
import { Spinner, UploadIcon, ChevronDownIcon } from '../components/Icons';
import MediaViewerModal from '../components/MediaViewerModal';
import ManageWebinarResourcesModal from '../components/ManageWebinarResourcesModal';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import {
    fetchWebinars,
    fetchMyWebinars,
    updateWebinarResources,
    registerForWebinar
} from '../services/webinarService';
import { createOrder } from '../services/orderService';

const WebinarsPage: React.FC = () => {
    const { user, token } = useAuth();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>(WebinarGroup.CROP_TUNIS);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [allWebinars, setAllWebinars] = useState<Webinar[]>([]);
    const [myRegisteredWebinars, setMyRegisteredWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [masterClassDescription, setMasterClassDescription] = useState<string>('');
    const [activePricingTab, setActivePricingTab] = useState<string>('MC25'); // Default to popular pack

    useEffect(() => {
        fetch('/content/master_class_description.md')
            .then(res => res.text())
            .then(text => setMasterClassDescription(text))
            .catch(err => console.error("Failed to load Master Class description", err));
    }, []);

    // States for displaying content
    const [liveWebinars, setLiveWebinars] = useState<Webinar[]>([]);
    const [currentMonthWebinars, setCurrentMonthWebinars] = useState<Webinar[]>([]);
    const [futureMonthsWebinars, setFutureMonthsWebinars] = useState<Record<string, Webinar[]>>({});
    const [pastWebinars, setPastWebinars] = useState<Webinar[]>([]);
    const [nearestWebinar, setNearestWebinar] = useState<Webinar | null>(null);

    // Modals state
    const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<WebinarResource | null>(null);
    const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false);
    const [selectedWebinarForResources, setSelectedWebinarForResources] = useState<Webinar | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDropdownOpen, setDropdownOpen] = useState(false);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setDropdownOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [handleClickOutside]);

    const handleBuyPack = (packId: string, packName: string) => {
        if (!user || !token) {
            navigate('/login', { state: { from: '/webinars' } });
            return;
        }
        // Use Cart Context to add pack (triggering security check)
        addToCart({
            type: ProductType.PACK,
            packId: packId,
            packName: packName
        });
        navigate('/cart');
    };

    const handleUseCredit = async (webinarId: string) => {
        if (!token) return;
        if (!window.confirm("Voulez-vous utiliser 1 crédit Master Class pour vous inscrire ?")) return;

        try {
            await registerForWebinar(webinarId, ['15:30'], token, true);
            
            // Refresh data
            const allCROPWebinars = await fetchWebinars(token, WebinarGroup.CROP_TUNIS);
            const allPharmIAWebinars = await fetchWebinars(token, WebinarGroup.PHARMIA);
            const allMasterClassWebinars = await fetchWebinars(token, WebinarGroup.MASTER_CLASS);
            const combinedAllWebinars = [
                ...processWebinars(allCROPWebinars), 
                ...processWebinars(allPharmIAWebinars),
                ...processWebinars(allMasterClassWebinars)
            ];
            setAllWebinars(combinedAllWebinars);
            alert("Inscription confirmée avec succès !");
        } catch (err: any) {
            console.error("Failed to register with credit:", err);
            setError(err.message || "Erreur lors de l'inscription avec crédit.");
        }
    };

    const calculateStatus = useCallback((date: string, duration: number = 90): WebinarStatus => {
        const now = new Date();
        const startDate = new Date(date);
        const effectiveDuration = duration || 90;
        const endDate = new Date(startDate.getTime() + effectiveDuration * 60000);

        if (now > endDate) {
            return WebinarStatus.PAST;
        } else if (now >= startDate && now <= endDate) {
            return WebinarStatus.LIVE;
        } else {
            const registrationDeadline = new Date(startDate.getTime() - 60 * 60000);
            if (now > registrationDeadline) {
                return WebinarStatus.REGISTRATION_CLOSED;
            }
            return WebinarStatus.UPCOMING;
        }
    }, []);

    const processWebinars = useCallback((webinars: Webinar[]): Webinar[] => {
        return webinars.map(w => ({
            ...w,
            calculatedStatus: calculateStatus(w.date, w.duration),
        }));
    }, [calculateStatus]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const allCROPWebinars = await fetchWebinars(token, WebinarGroup.CROP_TUNIS);
                const allPharmIAWebinars = await fetchWebinars(token, WebinarGroup.PHARMIA);
                const allMasterClassWebinars = await fetchWebinars(token, WebinarGroup.MASTER_CLASS);
                
                const combinedAllWebinars = [
                    ...processWebinars(allCROPWebinars), 
                    ...processWebinars(allPharmIAWebinars),
                    ...processWebinars(allMasterClassWebinars)
                ];
                setAllWebinars(combinedAllWebinars);

                if (user && token) {
                    const myW = await fetchMyWebinars(token);
                    const filteredMyW = myW.filter(w => w.group === WebinarGroup.CROP_TUNIS);
                    setMyRegisteredWebinars(processWebinars(filteredMyW));
                } else {
                    setMyRegisteredWebinars([]);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(`Impossible de charger les webinaires. Raison: ${errorMessage}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user, token, processWebinars]);

    const handleResourceClick = (resource: WebinarResource) => {
        setSelectedResource(resource);
        setIsMediaViewerOpen(true);
    };

    const handleCloseMediaViewer = () => {
        setSelectedResource(null);
        setIsMediaViewerOpen(false);
    };

    const handleOpenResourcesModal = (webinar: Webinar) => {
        setSelectedWebinarForResources(webinar);
        setIsResourcesModalOpen(true);
    };

    const handleCloseResourcesModal = () => {
        setSelectedWebinarForResources(null);
        setIsResourcesModalOpen(false);
    };

    const handleSaveResources = async (webinarId: string, resources: WebinarResource[]) => {
        if (!token) {
            setError("Vous devez être connecté pour sauvegarder les ressources.");
            return;
        }
        try {
            await updateWebinarResources(webinarId, resources, token);
            const allCROPWebinars = await fetchWebinars(token, WebinarGroup.CROP_TUNIS);
            const allPharmIAWebinars = await fetchWebinars(token, WebinarGroup.PHARMIA);
            const allMasterClassWebinars = await fetchWebinars(token, WebinarGroup.MASTER_CLASS);
            const combinedAllWebinars = [
                ...processWebinars(allCROPWebinars), 
                ...processWebinars(allPharmIAWebinars),
                ...processWebinars(allMasterClassWebinars)
            ];
            setAllWebinars(combinedAllWebinars);

            if (user && token) {
                const myW = await fetchMyWebinars(token);
                const filteredMyW = myW.filter(w => w.group === WebinarGroup.CROP_TUNIS);
                setMyRegisteredWebinars(processWebinars(filteredMyW));
            }
        } catch (err: any) {
            console.error("Failed to save resources:", err);
            setError("Erreur lors de la sauvegarde des ressources.");
        }
    };

    useEffect(() => {
        if (allWebinars.length === 0 && activeTab !== 'MY_WEBINARS') {
            setLiveWebinars([]);
            setCurrentMonthWebinars([]);
            setFutureMonthsWebinars({});
            setPastWebinars([]);
            setNearestWebinar(null);
            return;
        }

        const tabSpecificWebinars = activeTab === 'MY_WEBINARS'
            ? myRegisteredWebinars.filter(w => w.group === WebinarGroup.CROP_TUNIS)
            : allWebinars.filter(w => w.group === activeTab);

        const processedTabWebinars = processWebinars(tabSpecificWebinars);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const live = processedTabWebinars.filter(w => w.calculatedStatus === WebinarStatus.LIVE);
        const upcoming = processedTabWebinars
            .filter(w => w.calculatedStatus === WebinarStatus.UPCOMING || w.calculatedStatus === WebinarStatus.REGISTRATION_CLOSED)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = processedTabWebinars
            .filter(w => w.calculatedStatus === WebinarStatus.PAST)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setLiveWebinars(live);
        setPastWebinars(past);

        const currentMonthUpcoming = upcoming.filter(w => {
            const d = new Date(w.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        setCurrentMonthWebinars(currentMonthUpcoming);

        const futureMonthsUpcoming = upcoming.filter(w => {
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

        if (activeTab !== 'MY_WEBINARS' && upcoming.length > 0) {
            setNearestWebinar(upcoming[0]);
        } else {
            setNearestWebinar(null);
        }

    }, [activeTab, allWebinars, myRegisteredWebinars, processWebinars]);


    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR;
    const isSuperAdmin = user?.role === UserRole.ADMIN;

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
                {user && (
                    <button
                        onClick={() => setActiveTab('MY_WEBINARS')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'MY_WEBINARS'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Mes wébinaires CROP Tunis
                    </button>
                )}
                {isSuperAdmin && (
                    <button
                        onClick={() => setActiveTab(WebinarGroup.MASTER_CLASS)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === WebinarGroup.MASTER_CLASS
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Master Class Officine 2026 (Admin)
                    </button>
                )}
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

    const renderWebinarList = (webinarsToRender: Webinar[], isMyList: boolean = false) => {
        if (webinarsToRender.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-700">Aucun wébinaire pour le moment</h3>
                    <p className="text-slate-500 mt-2">Revenez bientôt pour découvrir nos prochaines sessions.</p>
                </div>
            );
        }
        return (
            <div className="space-y-12">
                {liveWebinars.length > 0 && !isMyList && (
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-slate-800 mb-4 flex items-center">Webinaire en Direct</h2>
                        <div className="p-6 text-slate-800 rounded-lg shadow-xl" style={{ backgroundColor: '#CBDFDE' }}>
                            <div className="grid grid-cols-1 gap-6">
                                {liveWebinars.map(webinar => (
                                    <WebinarCard key={webinar._id.toString()} webinar={webinar} isLiveCard={true} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {nearestWebinar && !isMyList && (
                    <div className="mb-12 p-6 rounded-lg shadow-xl border-2 border-teal-500 max-w-4xl" style={{ backgroundColor: '#CBDFDE' }}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center text-left">Prochain Webinaire</h2>
                        <WebinarCard webinar={nearestWebinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                    </div>
                )}

                {currentMonthWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">Autres webinaires ce mois-ci</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {currentMonthWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                            ))}
                        </div>
                    </div>
                )}

                {Object.entries(futureMonthsWebinars).length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">Prochains Mois</h2>
                        {Object.entries(futureMonthsWebinars).map(([monthYear, monthWebinars]) => (
                            <div key={monthYear} className="mb-12">
                                <h3 className="text-xl font-bold text-slate-700 mb-4">{monthYear}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {monthWebinars.map(webinar => (
                                        <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isMyList && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {webinarsToRender.map(webinar => (
                            <WebinarCard key={webinar._id.toString()} webinar={webinar} isMyWebinarCard={true} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                        ))}
                    </div>
                )}

                {pastWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-slate-500 pb-2">Webinaires Passés</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {pastWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} onUseCredit={handleUseCredit} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <Helmet>
                <title>Webinaires - Pharmia</title>
                <meta name="description" content="Découvrez nos webinaires pour pharmaciens et préparateurs." />
            </Helmet>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderTabs()}

                {activeTab === WebinarGroup.CROP_TUNIS && (
                    <div className="mb-8">
                        <img
                            src="https://pharmaconseilbmb.com/photos/site/cropt/prepenligne.png"
                            alt="Couverture Webinaires"
                            className="max-w-4xl w-full h-auto rounded-lg shadow-lg object-cover"
                        />
                        <div className="my-6 max-w-4xl"> {/* Removed mx-auto to un-center */}
                            <ExpandableText
                                text={`<span class="font-bold text-teal-600">Préparateurs en Ligne - Saison 2</span>: Le projet "Préparateurs en ligne" est un programme de formation continue spécifiquement conçu pour les préparateurs en pharmacie d'officine. Il vise à améliorer et actualiser leurs connaissances et compétences en combinant l'expertise des préparateurs seniors et juniors. Le programme propose des sessions en ligne (16 nouvelles séances pour la session 2025/2026), planifiées pour offrir une flexibilité maximale (trois présentations quotidiennes d'un même thème) afin de ne pas perturber l'organisation quotidienne de la pharmacie. L'objectif final est de faire de cette formation un atout majeur pour les pharmaciens en assurant la montée en compétence et la fidélisation de leurs équipes.`}
                                maxLength={250}
                                youtubeShortUrl="https://youtube.com/shorts/KwUvB51Wcp8?feature=share"
                                textSizeClass="text-base"
                            />
                        </div>
                        <p className="mt-4 text-2xl font-extrabold text-red-600 max-w-4xl">
                            Pass journée: 80,000 DT
                        </p>
                    </div>
                )}

                {activeTab === WebinarGroup.MASTER_CLASS && (
                    <div className="mb-16">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
                                Master Class Officine 2026
                            </h2>
                            <div className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
                                <MarkdownRenderer content={masterClassDescription} />
                            </div>
                        </div>

                        {/* Pricing Accordion Toggle */}
                        <button
                            onClick={() => setIsPricingOpen(!isPricingOpen)}
                            className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-white border-l-8 border-teal-500 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer group mb-8"
                        >
                            <div className="flex flex-col text-center">
                                <span className="text-2xl font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                                    Consulter les Tarifs & Packs
                                </span>
                                <span className="text-sm text-slate-500 mt-1">
                                    {isPricingOpen ? "Cliquez pour masquer les offres" : "Cliquez pour voir nos offres de lancement (MC10, MC25, MC50...)"}
                                </span>
                            </div>
                            {/* Icon moved below text */}
                            <div className={`mt-4 p-2 rounded-full bg-slate-100 group-hover:bg-teal-50 transition-colors duration-300 transform ${isPricingOpen ? 'rotate-180' : ''}`}>
                                <ChevronDownIcon className="h-8 w-8 text-teal-600" />
                            </div>
                        </button>

                        {isPricingOpen && (
                            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                                {/* Tabs Header */}
                                <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
                                    {MASTER_CLASS_PACKS.map((pack) => (
                                        <button
                                            key={pack.id}
                                            onClick={() => setActivePricingTab(pack.id)}
                                            className={`flex-1 py-4 px-2 text-center text-sm font-bold transition-all duration-200 focus:outline-none ${
                                                activePricingTab === pack.id
                                                    ? 'bg-white text-teal-600 border-t-4 border-teal-500 shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-4 border-transparent'
                                            }`}
                                        >
                                            {pack.name}
                                            {pack.badge && (
                                                <span className={`block mt-1 text-[10px] uppercase tracking-wide ${
                                                    activePricingTab === pack.id ? 'text-teal-500' : 'text-slate-400'
                                                }`}>
                                                    {pack.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="p-8 md:p-12">
                                    {MASTER_CLASS_PACKS.map((pack) => {
                                        if (pack.id !== activePricingTab) return null;
                                        
                                        const priceHT = pack.priceHT;
                                        const unitPriceHT = priceHT / pack.credits;
                                        
                                        // Feature list logic
                                        let features: string[] = [];
                                        if (pack.id === 'MC_UNIT') features = ["Accès à 1 wébinaire en direct au choix", "Support de cours PDF inclus", "Replay disponible pendant 48h", "Idéal pour tester le format"];
                                        else if (pack.id === 'MC10') features = ["Accès à 10 wébinaires au choix", "Économie de ~12% sur le tarif unitaire", "Support de cours PDF inclus", "Replay illimité sur les sessions choisies", "Certificat de participation"];
                                        else if (pack.id === 'MC25') features = ["Accès à 25 wébinaires au choix", "Économie de ~25% (Meilleure Valeur)", "Support de cours PDF inclus", "Replay illimité", "Certificat de participation avancé", "Accès prioritaire aux questions/réponses"];
                                        else if (pack.id === 'MC50') features = ["Accès à 50 wébinaires (Programme Expert)", "Économie massive de ~37%", "Bibliothèque complète de ressources", "Replay illimité", "Certificat d'Expertise Officine", "Support prioritaire"];
                                        else if (pack.id === 'MC100') features = ["Accès INTÉGRAL à tous les wébinaires", "Tarif imbattable (-50%)", "Toutes les ressources pédagogiques incluses", "Accès à vie aux replays de la saison", "Diplôme d'Honneur PharmIA", "Statut VIP lors des événements"];

                                        return (
                                            <div key={pack.id} className="flex flex-col md:flex-row gap-8 items-center md:items-start animate-fadeIn">
                                                {/* Left Column: Price & Info */}
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-3xl font-extrabold text-slate-900 mb-2">{pack.name}</h3>
                                                    <p className="text-lg text-slate-600 mb-6">{pack.description}</p>
                                                    
                                                    <div className="mb-6 inline-block bg-teal-50 rounded-xl p-6 border border-teal-100">
                                                        <div className="flex items-baseline justify-center md:justify-start">
                                                            <span className="text-5xl font-extrabold text-teal-700">{priceHT.toFixed(3)}</span>
                                                            <span className="ml-2 text-2xl font-medium text-teal-600">DT</span>
                                                            <span className="ml-2 text-sm font-medium text-slate-400">HT</span>
                                                        </div>
                                                        <div className="mt-2 text-sm text-slate-500 font-medium text-center md:text-left">
                                                            Soit <span className="font-bold text-teal-700">{unitPriceHT.toFixed(3)} DT</span> / séance
                                                        </div>
                                                        <p className="mt-2 text-xs text-slate-400 italic text-center md:text-left">+ 19% TVA</p>
                                                    </div>
                                                </div>

                                                {/* Right Column: Features & CTA */}
                                                <div className="flex-1 w-full bg-slate-50 rounded-xl p-8 border border-slate-100">
                                                    <h4 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-sm">Ce pack inclut :</h4>
                                                    <ul className="space-y-3 mb-8">
                                                        {features.map((feat, idx) => (
                                                            <li key={idx} className="flex items-start">
                                                                <svg className="h-5 w-5 text-teal-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span className="text-slate-700">{feat}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    
                                                    <button
                                                        onClick={() => handleBuyPack(pack.id, pack.name)}
                                                        className="w-full py-4 px-6 rounded-lg font-bold text-lg text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-500/30 transition-all transform hover:-translate-y-1 focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                                    >
                                                        Choisir ce pack
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center py-12"><Loader /></div> // Using Loader
                ) : error ? (
                    <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold">Erreur de chargement</h3>
                        <p className="mt-2">{error}</p>
                    </div>
                ) : activeTab === 'MY_WEBINARS' ? (
                    myRegisteredWebinars.length > 0 ? (
                        <div className="space-y-12">
                            <h2 className="text-3xl font-bold text-slate-800 mb-4">Mes Webinaire CROP Tunis</h2>
                            {renderWebinarList(myRegisteredWebinars, true)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-700">Vous n'êtes inscrit à aucun wébinaire CROP Tunis pour le moment</h3>
                            <p className="text-slate-500 mt-2">Découvrez nos prochaines sessions CROP Tunis et inscrivez-vous !</p>
                        </div>
                    )
                ) : (
                    renderWebinarList(allWebinars.filter(w => w.group === activeTab))
                )}
            </div>

            {isMediaViewerOpen && selectedResource && (
                <MediaViewerModal
                    resource={selectedResource}
                    onClose={handleCloseMediaViewer}
                />
            )}
            {isResourcesModalOpen && selectedWebinarForResources && (
                <ManageWebinarResourcesModal
                    webinarId={selectedWebinarForResources._id as string}
                    resources={selectedWebinarForResources.resources || []}
                    onClose={handleCloseResourcesModal}
                    onSave={handleSaveResources}
                />
            )}
        </div>
    );
};

export default WebinarsPage;