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
    const [activePharmiaPricingTab, setActivePharmiaPricingTab] = useState<string>('PIA_PACK_4'); // Default to "Pack 4 Crédits"

    // The ADMIN_WEBINAR redirect useEffect block has been intentionally removed here.

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
            }
            catch (err) {
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
        // Vérification de l'autorisation
        if (!user || (![UserRole.ADMIN, UserRole.ADMIN_WEBINAR].includes(user.role))) {
            setError("Vous n'avez pas la permission de modifier les ressources.");
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
    const canManageResources = user?.role === UserRole.ADMIN; // Only full ADMIN can manage resources

    const isMasterClassPublished = useMemo(() => {
        return allWebinars.some(w => 
            w.group === WebinarGroup.MASTER_CLASS && w.publicationStatus === 'PUBLISHED'
        );
    }, [allWebinars]);
    
    const shouldShowPricingButton = isMasterClassPublished || isSuperAdmin;

    const renderHub = () => (
        <div className="space-y-12">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">Nos Formations en Ligne</h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                    Développez vos compétences avec nos programmes de formation continue conçus pour les pharmaciens et préparateurs en pharmacie.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
                {/* Card for CROP Tunis */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col p-8 border border-slate-200">
                    <div className="flex-grow">
                        <img src="/api/ftp/view?filePath=%2Fpharmia%2Fcropt%2Fcrop-tunis.jpg" alt="CROP Tunis Logo" className="h-24 w-auto mx-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Wébinaires CROP Tunis</h3>
                        <p className="text-sm font-semibold text-teal-600 mb-4">Pour Préparateurs</p>
                        <p className="text-slate-600 mb-6 flex-grow">
                           Le programme de formation de référence pour les préparateurs en pharmacie d'officine.
                        </p>
                    </div>
                    <div className="mt-auto">
                        <button onClick={() => setView(WebinarGroup.CROP_TUNIS)} className="w-full text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg" style={{ backgroundColor: '#197738', '&:hover': { backgroundColor: '#15652D' } }}>
                            Découvrir les sessions
                        </button>
                    </div>
                </div>

                {/* Card for PharmIA */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col p-8 border border-slate-200">
                    <div className="flex-grow">
                        <img src="https://pharmaconseilbmb.com/photos/site/P.png" alt="PharmIA Logo" className="h-24 w-auto mx-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Wébinaires PharmIA</h3>
                         <p className="text-sm font-semibold text-teal-600 mb-4">Pour Pharmaciens & Préparateurs</p>
                        <p className="text-slate-600 mb-6 flex-grow">
                            Des sessions interactives pour maîtriser les outils et la méthodologie PharmIA au comptoir.
                        </p>
                    </div>
                    <div className="mt-auto">
                        <button onClick={() => setView(WebinarGroup.PHARMIA)} className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
                            Découvrir les sessions
                        </button>
                    </div>
                </div>

                {/* Card for MasterClass */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col p-8 border border-slate-200">
                    <div className="flex-grow">
                        <img src="https://pharmaconseilbmb.com/photos/site/P.png" alt="Master Class Logo" className="h-24 w-auto mx-auto mb-4 object-contain" />
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Master Class Officine 2026</h3>
                        <p className="text-sm font-semibold text-teal-600 mb-4">Pour Pharmaciens</p>
                        <p className="text-slate-600 mb-6 flex-grow">
                            Un programme d'excellence pour approfondir vos connaissances sur des thèmes majeurs de l'officine.
                        </p>
                    </div>
                    <div className="mt-auto">
                        <button onClick={() => setView(WebinarGroup.MASTER_CLASS)} className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg">
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
                                                onManageResources={canManageResources ? handleOpenResourcesModal : undefined} 
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
                                    <WebinarCard key={webinar._id.toString()} webinar={webinar} isLiveCard={true} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {nearestWebinar && !isMyList && (
                    <div className="mb-12 p-6 rounded-lg shadow-xl border-2 border-teal-500 max-w-4xl" style={{ backgroundColor: '#CBDFDE' }}>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center text-left">Prochain Webinaire</h2>
                        <WebinarCard webinar={nearestWebinar} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, nearestWebinar.group)} />
                    </div>
                )}

                {currentMonthWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-teal-500 pb-2">Autres webinaires ce mois-ci</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {currentMonthWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
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
                                        <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isMyList && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {webinarsToRender.map(webinar => (
                            <WebinarCard key={webinar._id.toString()} webinar={webinar} isMyWebinarCard={true} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
                        ))}
                    </div>
                )}

                {pastWebinars.length > 0 && !isMyList && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b-2 border-slate-500 pb-2">Webinaires Passés</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {pastWebinars.map(webinar => (
                                <WebinarCard key={webinar._id.toString()} webinar={webinar} onResourceClick={handleResourceClick} onManageResources={canManageResources ? handleOpenResourcesModal : undefined} userCredits={user?.masterClassCredits} pharmiaCredits={user?.pharmiaCredits} onUseCredit={(webinarId) => handleUseCredit(webinarId, webinar.group)} />
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
                            <div className="mt-6 p-4 border rounded-lg bg-blue-50 border-blue-200">
                                <h3 className="text-lg font-bold text-blue-800 mb-3">Actions CROP Tunis</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {user && (
                                        <button onClick={() => setView('MY_WEBINARS_CROP')} className="w-full sm:w-auto text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors border border-blue-400">
                                            Mes wébinaires CROP Tunis
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => navigate('/admin/webinars')} className="w-full sm:w-auto text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg hover:bg-red-100 transition-colors border border-red-400">
                                            Gérer les wébinaires CROP
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {(view === WebinarGroup.PHARMIA || view === 'PHARMIA_PHARMACIEN' || view === 'PHARMIA_PREPARATEUR' || view === 'MY_WEBINARS_PHARMIA') && (
                            <div className="mt-6 p-4 border rounded-lg bg-teal-50 border-teal-200">
                                <h3 className="text-lg font-bold text-teal-800 mb-3">Actions PharmIA</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {user && !isWebinarAdmin && (
                                        <button onClick={() => setView('MY_WEBINARS_PHARMIA')} className="w-full sm:w-auto text-teal-600 hover:text-teal-800 font-medium py-2 px-4 rounded-lg hover:bg-teal-100 transition-colors border border-teal-400">
                                            Mes wébinaires PharmIA
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button onClick={() => navigate('/admin/webinars')} className="w-full sm:w-auto text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg hover:bg-red-100 transition-colors border border-red-400">
                                            Gérer les wébinaires PharmIA
                                        </button>
                                    )}
                                    <button onClick={() => { console.log('Toggling isPharmiaPricingOpen:', !isPharmiaPricingOpen); setIsPharmiaPricingOpen(!isPharmiaPricingOpen); }} className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-600 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors border border-slate-400">
                                        <ShoppingCartIcon className="h-5 w-5" />
                                        <span>Acheter des crédits PharmIA</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {view === WebinarGroup.MASTER_CLASS && (
                            <div className="mt-6 p-4 border rounded-lg bg-slate-50 border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-3">Actions Master Class</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button onClick={() => setIsProgramModalOpen(true)} className="w-full sm:w-auto text-slate-600 hover:text-slate-800 font-medium py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors border border-slate-400">
                                        Voir le Programme & Calendrier Complet
                                    </button>
                                    {shouldShowPricingButton && (
                                        <button onClick={() => setIsPricingOpen(!isPricingOpen)} className="w-full sm:w-auto text-slate-600 hover:text-slate-800 font-medium py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors border border-slate-400">
                                            Consulter les Tarifs & Packs Master Class
                                        </button>
                                    )}
                                    {isSuperAdmin && (
                                        <button onClick={() => navigate('/admin/webinars')} className="w-full sm:w-auto text-red-600 hover:text-red-800 font-medium py-2 px-4 rounded-lg hover:bg-red-100 transition-colors border border-red-400">
                                            Gérer les Master Class
                                        </button>
                                    )}
                                </div>
                            </div>
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

            {isPharmiaPricingOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative"> {/* Added relative for positioning */}
                    <button
                        onClick={() => setIsPharmiaPricingOpen(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
                        {PHARMIA_CREDIT_PACKS.map((pack) => (
                            <button
                                key={pack.id}
                                onClick={() => setActivePharmiaPricingTab(pack.id)}
                                className={`flex-1 py-4 px-2 text-center text-sm font-bold transition-all duration-200 focus:outline-none ${activePharmiaPricingTab === pack.id
                                        ? 'bg-white text-teal-600 border-t-4 border-teal-500 shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-4 border-transparent'
                                }
                            `}>
                                {pack.name}
                                {pack.badge && (
                                    <span className={`block mt-1 text-[10px] uppercase tracking-wide ${activePharmiaPricingTab === pack.id ? 'text-teal-500' : 'text-slate-400'}`}>
                                        {pack.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="p-8 md:p-12">
                        {PHARMIA_CREDIT_PACKS.map((pack) => {
                            if (pack.id !== activePharmiaPricingTab) return null;
                            
                            const priceHT = pack.priceHT;
                            const unitPriceHT = priceHT / pack.credits;
                            const originalPriceHT = PHARMIA_WEBINAR_PRICE_HT * pack.credits;

                            return (
                                <div key={pack.id} className="flex flex-col md:flex-row gap-8 items-center md:items-start animate-fadeIn">
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-3xl font-extrabold text-slate-900 mb-2">{pack.name}</h3>
                                        <p className="text-lg text-slate-600 mb-6">{pack.description}</p>
                                        
                                        <div className="mb-6 inline-block bg-teal-50 rounded-xl p-6 border border-teal-100">
                                            {pack.discountPercentage && pack.discountPercentage > 0 && (
                                                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                                                    <span className="text-xl font-medium text-slate-400 line-through">
                                                        {originalPriceHT.toFixed(3)} DT
                                                    </span>
                                                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                                                        -{pack.discountPercentage}%
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-baseline justify-center md:justify-start">
                                                <span className="text-5xl font-extrabold text-teal-700">{priceHT.toFixed(3)}</span>
                                                <span className="ml-2 text-2xl font-medium text-teal-600">DT</span>
                                                <span className="ml-2 text-sm font-medium text-slate-400">HT</span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-500 font-medium text-center md:text-left">
                                                Soit <span className="font-bold text-teal-700">{unitPriceHT.toFixed(3)} DT</span> / Crédit
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400 italic text-center md:text-left">+ 19% TVA</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full bg-slate-50 rounded-xl p-8 border border-slate-100">
                                        <button
                                            onClick={() => handleBuyPack(pack)}
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
                </div>
            )}

            {isPricingOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
                        {MASTER_CLASS_PACKS.map((pack) => (
                            <button
                                key={pack.id}
                                onClick={() => setActivePricingTab(pack.id)}
                                className={`flex-1 py-4 px-2 text-center text-sm font-bold transition-all duration-200 focus:outline-none ${activePricingTab === pack.id
                                        ? 'bg-white text-teal-600 border-t-4 border-teal-500 shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t-4 border-transparent'
                                }
                            `}>
                                {pack.name}
                                {pack.badge && (
                                    <span className={`block mt-1 text-[10px] uppercase tracking-wide ${activePricingTab === pack.id ? 'text-teal-500' : 'text-slate-400'}`}>
                                        {pack.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="p-8 md:p-12">
                        {MASTER_CLASS_PACKS.map((pack) => {
                            if (pack.id !== activePricingTab) return null;
                            
                            const priceHT = pack.priceHT;
                            const numberOfMasterClasses = pack.credits / 3;
                            const unitPriceHT = priceHT / numberOfMasterClasses;
                            const originalPriceHT = 120.000 * numberOfMasterClasses; // Base unit price * number of MCs in pack

                            let features: string[] = [];
                            if (pack.id === 'MC_UNIT') features = ["Accès au cycle complet (3 sessions)", "Support de cours PDF inclus", "Replay disponible pendant 48h", "Idéal pour se former sur un sujet précis"];
                            else if (pack.id === 'MC_PACK_3') features = ["Accès à 3 Master Classes complètes", "Économie de ~16.54% sur le tarif unitaire", "Supports de cours PDF inclus", "Replay illimité sur les sessions choisies", "Certificat de participation"];
                            else if (pack.id === 'MC_PACK_6') features = ["Accès à 6 Master Classes complètes", "Économie de ~33.20% (Formation Semestrielle)", "Supports de cours PDF inclus", "Replay illimité", "Accès prioritaire aux questions/réponses"];
                            else if (pack.id === 'MC_FULL') features = ["Accès INTÉGRAL aux 10 Master Classes", "Tarif imbattable (-50%)", "Bibliothèque complète de ressources", "Accès à vie aux replays de la saison", "Diplôme d'Honneur PharmIA", "Statut VIP lors des événements"];

                            return (
                                <div key={pack.id} className="flex flex-col md:flex-row gap-8 items-center md:items-start animate-fadeIn">
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-3xl font-extrabold text-slate-900 mb-2">{pack.name}</h3>
                                        <p className="text-lg text-slate-600 mb-6">{pack.description}</p>
                                        
                                        {/* NEW: Discount display similar to PharmIA packs */}
                                        <div className="mb-6 inline-block bg-teal-50 rounded-xl p-6 border border-teal-100">
                                            {pack.discountPercentage > 0 && (
                                                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                                                    <span className="text-xl font-medium text-slate-400 line-through">
                                                        {originalPriceHT.toFixed(3)} DT
                                                    </span>
                                                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                                                        -{pack.discountPercentage}%
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-baseline justify-center md:justify-start">
                                                <span className="text-5xl font-extrabold text-teal-700">{priceHT.toFixed(3)}</span>
                                                <span className="ml-2 text-2xl font-medium text-teal-600">DT</span>
                                                <span className="ml-2 text-sm font-medium text-slate-400">HT</span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-500 font-medium text-center md:text-left">
                                                Soit <span className="font-bold text-teal-700">{unitPriceHT.toFixed(3)} DT</span> / Master Class
                                            </div>
                                            <p className="mt-2 text-xs text-slate-400 italic text-center md:text-left">+ 19% TVA</p>
                                        </div>
                                        
                                        {/* NEW: Features list below pricing */}
                                        <ul className="text-slate-700 text-left space-y-2 mt-6">
                                            {features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center">
                                                    <svg className="h-5 w-5 text-teal-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                    </div>
                                    <div className="flex-1 w-full bg-slate-50 rounded-xl p-8 border border-slate-100">
                                        <button
                                            onClick={() => handleBuyPack(pack)}
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
                </div>
            )}

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
    )
};

export default WebinarsPage;