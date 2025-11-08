import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Webinar, UserRole, WebinarGroup } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Spinner, SparklesIcon } from '../components/Icons';

const CropTunisIntro: React.FC = () => (
    <div className="mb-12 p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center gap-4">
            <img 
                src="https://pharmaconseilbmb.com/photos/site/crop/crop-tunis.png" 
                alt="CROP Tunis Logo" 
                className="w-32 h-32 object-contain"
            />
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-3">Projet "Préparateurs en Ligne"</h2>
                <div className="text-sm text-slate-600 space-y-2">
                    <p>"Préparateurs en ligne" est un programme de formation continue spécifiquement conçu pour les préparateurs en pharmacie d'officine. Il vise à améliorer et actualiser leurs connaissances et compétences.</p>
                    <p>Le programme propose des sessions en ligne (16 nouvelles séances pour la session 2025/2026), planifiées pour offrir une flexibilité maximale (trois présentations d'un même thème durant les mardis de chaque semaine.) afin de ne pas perturber l'organisation quotidienne de la pharmacie.</p>
                    <p>L'objectif final est de faire de cette formation un atout majeur pour les pharmaciens en assurant la montée en compétence et la fidélisation de leurs équipes.</p>
                </div>
            </div>
        </div>
    </div>
);


const WebinarsPage: React.FC = () => {
    const [webinars, setWebinars] = useState<Webinar[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<WebinarGroup>(WebinarGroup.CROP_TUNIS);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWebinars = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/webinars?group=${encodeURIComponent(activeTab)}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch webinars');
                }
                const data = await response.json();
                setWebinars(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWebinars();
    }, [activeTab]);

    const isAdmin = user?.role === UserRole.ADMIN;

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
            </nav>
        </div>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Nos Webinaires</h1>
                    <p className="text-lg text-slate-600 mt-1">Découvrez nos sessions en direct et à venir.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => navigate('/admin/webinars')}
                        className="inline-flex items-center bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700"
                    >
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Gérer les webinaires
                    </button>
                )}
            </div>

            {renderTabs()}

            {activeTab === WebinarGroup.CROP_TUNIS && <CropTunisIntro />}

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold">Erreur de chargement</h3>
                    <p className="mt-2">{error}</p>
                </div>
            ) : webinars.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {webinars.map(webinar => (
                        <Link to={`/webinars/${webinar._id}`} key={webinar._id.toString()} className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
                            <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-40 w-full object-cover" />
                            <div className="p-4 flex-grow flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate">{webinar.title}</h3>
                                <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mt-1">Animé par {webinar.presenter}</p>
                                <p className="text-xs text-slate-500 mt-1">Le {new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">{webinar.description}</p>
                            </div>
                            <div className="mt-auto p-3 border-t border-slate-100 bg-slate-50 text-center">
                                <span className="text-teal-600 font-bold">Voir les détails</span>
                            </div>
                        </Link>
                    ))}
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
