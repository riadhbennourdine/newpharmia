import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Webinar, WebinarGroup, UserRole, WebinarStatus, WebinarResource, ProductType, Pack } from '../types';
import { MASTER_CLASS_PACKS, PHARMIA_CREDIT_PACKS, TAX_RATES, PHARMIA_WEBINAR_PRICE_HT } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import WebinarCard from '../components/WebinarCard';
import ExpandableText from '../components/ExpandableText';
import Loader from '../components/Loader';
import { Spinner, UploadIcon, ChevronDownIcon, ShoppingCartIcon } from '../components/Icons';
import MediaViewerModal from '../components/MediaViewerModal';
import ManageWebinarResourcesModal from '../components/ManageWebinarResourcesModal';
import MasterClassProgramModal from '../components/MasterClassProgramModal';
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
    const [view, setView] = useState<'hub' | WebinarGroup | 'MY_WEBINARS_CROP' | 'MY_WEBINARS_PHARMIA' | 'PHARMIA_PHARMACIEN' | 'PHARMIA_PREPARATEUR'>('hub');
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [allWebinars, setAllWebinars] = useState<Webinar[]>([]);
    const [myRegisteredWebinars, setMyRegisteredWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [masterClassDescription, setMasterClassDescription] = useState<string>('');
    const [activePricingTab, setActivePricingTab] = useState<string>('MC_PACK_3'); // Default to popular pack

    const [isPharmiaPricingOpen, setIsPharmiaPricingOpen] = useState(false);
    const [activePharmiaPricingTab, setActivePharmiaPricingTab] = useState<string>('PIA_PACK_5'); // Default to popular pack

    useEffect(() => {
        // Redirect ADMIN_WEBINAR to CROP Tunis by default as they don't have access to PharmIA
        if (user?.role === UserRole.ADMIN_WEBINAR && view === WebinarGroup.PHARMIA) {
            setView(WebinarGroup.CROP_TUNIS);
        }
    }, [user, view]);

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
    const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);

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

    const handleBuyPack = (pack: Pack) => {
        if (!user || !token) {
            navigate('/login', { state: { from: '/webinars' } });
            return;
        }
        // Use Cart Context to add pack (triggering security check)
        addToCart({
            type: ProductType.PACK,
            pack: pack,
        });
        navigate('/cart');
    };

    const handleUseCredit = async (webinarId: string, webinarGroup: WebinarGroup) => {
        if (!token) return;

        const creditType = webinarGroup === WebinarGroup.MASTER_CLASS ? "Master Class" : "PharmIA";
        if (!window.confirm(`Voulez-vous utiliser 1 crédit ${creditType} pour vous inscrire ?`)) return;

        try {
            await registerForWebinar(webinarId, [WebinarTimeSlot.MORNING], token, true);
            
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

    const calculateStatus = useCallback((date: string, duration: number = 90, group?: string): WebinarStatus => {
        const now = new Date();
        const startDate = new Date(date);
        let effectiveDuration = duration || 90;
        
        // Extended duration for PharmIA (until Friday Replay)
        // Adding 3 days (approx 4320 mins) to cover until Friday
        if (group === WebinarGroup.PHARMIA) {
             effectiveDuration += (3 * 24 * 60); 
        }

        const endDate = new Date(startDate.getTime() + effectiveDuration * 60000);

        if (now > endDate) {
            return WebinarStatus.PAST;
        } else if (now >= startDate && now <= endDate) {
            return WebinarStatus.LIVE;
        } else {
            // For PharmIA, allow registration even if "started" (Tuesday passed) but before Friday end
            if (group === WebinarGroup.PHARMIA && now > startDate) {
                 return WebinarStatus.LIVE; // or UPCOMING? LIVE keeps it active.
            }

            const registrationDeadline = new Date(startDate.getTime() - 60 * 60000);
            if (now > registrationDeadline && group !== WebinarGroup.PHARMIA) {
                return WebinarStatus.REGISTRATION_CLOSED;
            }
            return WebinarStatus.UPCOMING;
        }
    }, []);

    const processWebinars = useCallback((webinars: Webinar[]): Webinar[] => {
        return webinars.map(w => ({
            ...w,
            calculatedStatus: calculateStatus(w.date, w.duration, w.group),
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
                    // Include both CROP Tunis and PharmIA
                    const filteredMyW = myW.filter(w => w.group === WebinarGroup.CROP_TUNIS || w.group === WebinarGroup.PHARMIA);
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
        if (allWebinars.length === 0 && (typeof view === 'string' && !view.startsWith('MY_WEBINARS'))) {
            setLiveWebinars([]);
            setCurrentMonthWebinars([]);
            setFutureMonthsWebinars({});
            setPastWebinars([]);
            setNearestWebinar(null);
            return;
        }

        let tabSpecificWebinars: Webinar[] = [];

        if (view === 'MY_WEBINARS_CROP') {
            tabSpecificWebinars = myRegisteredWebinars.filter(w => w.group === WebinarGroup.CROP_TUNIS);
        } else if (view === 'MY_WEBINARS_PHARMIA') {
             tabSpecificWebinars = myRegisteredWebinars.filter(w => w.group === WebinarGroup.PHARMIA);
        } else if (view === 'PHARMIA_PHARMACIEN') {
            tabSpecificWebinars = allWebinars.filter(w => w.group === WebinarGroup.PHARMIA && (w.targetAudience === 'Pharmacien' || w.targetAudience === 'Tous'));
        } else if (view === 'PHARMIA_PREPARATEUR') {
            tabSpecificWebinars = allWebinars.filter(w => w.group === WebinarGroup.PHARMIA && (w.targetAudience === 'Préparateur' || w.targetAudience === 'Tous'));
        }
        else {
            tabSpecificWebinars = allWebinars.filter(w => w.group === view);
        }

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

        if (view !== 'MY_WEBINARS' && upcoming.length > 0) {
            setNearestWebinar(upcoming[0]);
        } else {
            setNearestWebinar(null);
        }

    }, [view, allWebinars, myRegisteredWebinars, processWebinars]);


    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR;
    const isSuperAdmin = user?.role === UserRole.ADMIN;
    const isWebinarAdmin = user?.role === UserRole.ADMIN_WEBINAR;

    const renderHub = () => (
        <div className="space-y-12">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">Nos Formations en Ligne</h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                    Développez vos compétences avec nos programmes de formation continue conçus pour les pharmaciens et préparateurs en pharmacie.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Card for CROP Tunis */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow">
                        <img src="/assets/logo-crop.png" alt="CROP Tunis Logo" className="h-16 w-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800">Wébinaires CROP Tunis</h3>
                        <p className="text-sm font-semibold text-teal-600 mt-1">Pour Préparateurs</p>
                        <p className="mt-4 text-slate-600">
                           Le programme de formation de référence pour les préparateurs en pharmacie d'officine.
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50">
                        <button onClick={() => setView(WebinarGroup.CROP_TUNIS)} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Découvrir les sessions
                        </button>

                    </div>
                </div>

                {/* Card for PharmIA */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow">
                        <img src="/assets/logo-pharmia.png" alt="PharmIA Logo" className="h-16 w-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800">Wébinaires PharmIA</h3>
                         <p className="text-sm font-semibold text-teal-600 mt-1">Pour Pharmaciens & Préparateurs</p>
                        <p className="mt-4 text-slate-600">
                            Des sessions interactives pour maîtriser les outils et la méthodologie PharmIA au comptoir.
                        </p>
                        <button onClick={() => setView(WebinarGroup.PHARMIA)} className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                            Découvrir les sessions PharmIA
                        </button>
                    </div>
                    <div className="p-6 bg-slate-50 border-t">
                        <button onClick={() => setIsPharmiaPricingOpen(!isPharmiaPricingOpen)} className="w-full flex items-center justify-center gap-2 text-slate-600 font-bold py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                            <ShoppingCartIcon className="h-6 w-6" />
                            <span>Acheter des crédits</span>
                        </button>

                    </div>
                </div>

                {/* Card for MasterClass */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
                    <div className="p-8 flex-grow">
                        <img src="/assets/logo-masterclass.png" alt="Master Class Logo" className="h-16 w-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800">Master Class Officine 2026</h3>
                        <p className="text-sm font-semibold text-teal-600 mt-1">Pour Pharmaciens</p>
                        <p className="mt-4 text-slate-600">
                            Un programme d'excellence pour approfondir vos connaissances sur des thèmes majeurs de l'officine.
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50">
                        <button onClick={() => setView(WebinarGroup.MASTER_CLASS)} className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors">
                            Explorer le programme
                        </button>

                    </div>
                </div>
            </div>
             <div className="mt-12 text-center space-x-4">
                
                {/* Remove the old links here as they are now embedded in the cards */}
            </div>
        </div>
    );

    const renderMasterClassList = (webinars: Webinar[]) => {
        // Group by Master Class Title (e.g., "MC1: Dermatologie")
        const grouped = webinars.reduce((acc, w) => {
            const match = w.title.match(/^(MC\d+:\s*[^-\n]+)/);
            const groupTitle = match ? match[1].trim() : "Autres Sessions";
            
            if (!acc[groupTitle]) acc[groupTitle] = [];
            acc[groupTitle].push(w);
            return acc;
        }, {} as Record<string, Webinar[]>);

        // Sort Groups Numerically (MC1, MC2...)
        const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
            const numA = parseInt(a.match(/MC(\d+)/)?.[1] || '999');
            const numB = parseInt(b.match(/MC(\d+)/)?.[1] || '999');
            return numA - numB;
        });

        if (sortedGroupKeys.length === 0) {
             return (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-700">Aucune Master Class disponible</h3>
                    <p className="text-slate-500 mt-2">Le programme sera bientôt en ligne.</p>
                </div>
            );
        }

        return (
            <div className="space-y-16 max-w-7xl mx-auto">
                {sortedGroupKeys.map(groupTitle => {
                    const sessions = grouped[groupTitle].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const firstSession = sessions[0];
                    const isPast = sessions.every(s => s.calculatedStatus === WebinarStatus.PAST);
                    
                    return (
                        <div key={groupTitle} className={`rounded-2xl border transition-all duration-300 ${isPast ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-teal-100 bg-white shadow-lg shadow-teal-900/5'}`}>
                            {/* Header of the MC Group */}
                            <div className={`px-8 py-6 border-b rounded-t-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isPast ? 'border-slate-200 bg-slate-100/50' : 'border-teal-100 bg-gradient-to-r from-teal-50/50 to-white'}`}>
                                <div>
                                    <h3 className={`text-2xl font-extrabold tracking-tight ${isPast ? 'text-slate-600' : 'text-slate-800'}`}>{groupTitle}</h3>
                                    <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
                                        Cycle de 3 sessions • Début le {new Date(firstSession.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                {isPast && <span className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide">Terminé</span>}
                            </div>

                            {/* Timeline Connector (Visual only, subtle) */}
                            <div className="relative p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {sessions.map((webinar, idx) => (
                                        <div key={webinar._id.toString()} className="relative">
                                            <WebinarCard 
                                                webinar={webinar} 
                                                onResourceClick={handleResourceClick} 
                                                onManageResources={handleOpenResourcesModal} 
                                                userCredits={user?.masterClassCredits} 
                                                onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

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
                                    <WebinarCard key={webinar._id.toString()} webinar={webinar} isLiveCard={true} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {nearestWebinar && !isMyList && (
                    <div className="mb-12 p-6 rounded-lg shadow-xl border-2 border-teal-500 max-w-4xl" style={{ backgroundColor: '#CBDFDE' }}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center text-left">Prochain Webinaire</h2>
                        <WebinarCard webinar={nearestWebinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, nearestWebinar.group)} />
                    </div>
                )}

                {currentMonthWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">Autres webinaires ce mois-ci</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {currentMonthWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
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
                                        <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isMyList && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {webinarsToRender.map(webinar => (
                            <WebinarCard key={webinar._id.toString()} webinar={webinar} isMyWebinarCard={true} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                        ))}
                    </div>
                )}

                {pastWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-slate-500 pb-2">Webinaires Passés</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {pastWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={handleOpenResourcesModal} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
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
                {view !== 'hub' && (
                    <div className="mb-8">
                        <button onClick={() => setView('hub')} className="text-teal-600 hover:text-teal-800 font-medium">
                            &larr; Retour à toutes les formations
                        </button>
                        {(view === WebinarGroup.CROP_TUNIS || view === 'MY_WEBINARS_CROP') && (
                            <div className="mt-4 flex flex-wrap gap-4">
                                {user && (
                                    <button onClick={() => setView('MY_WEBINARS_CROP')} className="text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors">
                                        Mes wébinaires CROP Tunis
                                    </button>
                                )}
                                {isAdmin && (
                                    <button onClick={() => navigate('/admin/webinars')} className="text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg hover:bg-red-100 transition-colors">
                                        Gérer les wébinaires CROP
                                    </button>
                                )}
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center py-12"><Loader /></div>
                ) : error ? (
                    <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold">Erreur de chargement</h3>
                        <p className="mt-2">{error}</p>
                    </div>
                ) : view === 'hub' ? (
                    renderHub()
                ) : view === 'MY_WEBINARS_CROP' ? (
                    myRegisteredWebinars.filter(w => w.group === WebinarGroup.CROP_TUNIS).length > 0 ? (
                        <div className="space-y-12">
                            <h2 className="text-3xl font-bold text-slate-800 mb-4">Mes wébinaires CROP Tunis</h2>
                            {renderWebinarList(myRegisteredWebinars.filter(w => w.group === WebinarGroup.CROP_TUNIS), true)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-700">Vous n'êtes inscrit à aucun wébinaire CROP Tunis pour le moment</h3>
                            <p className="text-slate-500 mt-2">Découvrez nos prochaines sessions CROP Tunis et inscrivez-vous !</p>
                        </div>
                    )
                ) : view === 'MY_WEBINARS_PHARMIA' ? (
                    myRegisteredWebinars.filter(w => w.group === WebinarGroup.PHARMIA).length > 0 ? (
                        <div className="space-y-12">
                            <h2 className="text-3xl font-bold text-slate-800 mb-4">Mes wébinaires PharmIA</h2>
                            {renderWebinarList(myRegisteredWebinars.filter(w => w.group === WebinarGroup.PHARMIA), true)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-700">Vous n'êtes inscrit à aucun wébinaire PharmIA pour le moment</h3>
                            <p className="text-slate-500 mt-2">Découvrez nos prochaines sessions PharmIA et inscrivez-vous !</p>
                        </div>
                    )
                ) : view === WebinarGroup.MASTER_CLASS ? (
                    renderMasterClassList(allWebinars.filter(w => w.group === WebinarGroup.MASTER_CLASS))
                ) : view === 'PHARMIA_PHARMACIEN' ? (
                    renderWebinarList(allWebinars.filter(w => w.group === WebinarGroup.PHARMIA && (w.targetAudience === 'Pharmacien' || w.targetAudience === 'Tous')))
                ) : view === 'PHARMIA_PREPARATEUR' ? (
                    renderWebinarList(allWebinars.filter(w => w.group === WebinarGroup.PHARMIA && (w.targetAudience === 'Préparateur' || w.targetAudience === 'Tous')))
                ) : (
                    renderWebinarList(allWebinars.filter(w => w.group === view))
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
            {isProgramModalOpen && (
                <MasterClassProgramModal onClose={() => setIsProgramModalOpen(false)} />
            )}
        </div>
    );
};

export default WebinarsPage;
