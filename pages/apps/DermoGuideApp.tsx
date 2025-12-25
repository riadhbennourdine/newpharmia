import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, Spinner, BookOpenIcon, SparklesIcon, TrendingUpIcon } from '../../components/Icons';
import { useNavigate } from 'react-router-dom';
import { CaseStudy } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import getAbsoluteImageUrl from '../../utils/image';

const DermoGuideApp: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [fiches, setFiches] = useState<CaseStudy[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDermoFiches = async () => {
            setIsLoading(true);
            try {
                // Explicitly request the Dermatologie theme to bypass the general library filter
                const response = await fetch('/api/memofiches?theme=Dermatologie&limit=100');
                if (!response.ok) throw new Error("Fetch failed");
                const data = await response.json();
                setFiches(data.data || []);
            } catch (error) {
                console.error("Error fetching dermo fiches:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDermoFiches();
    }, []);

    const groups = [
        { id: 'A', name: 'Groupe A : "Ça gratte" (Prurit & Rougeurs)' },
        { id: 'B', name: 'Groupe B : "Boutons & Visage" (Acné, Rosacée...)' },
        { id: 'C', name: 'Groupe C : "Plaques & Squames" (Psoriasis, Mycoses...)' },
        { id: 'D', name: 'Groupe D : "Mains, Pieds & Ongles"' }
    ];

    const getFichesByGroup = (groupId: string) => {
        // Match fiches that have "Groupe [A/B/C/D]" in their system field
        return fiches.filter(f => f.system?.includes(`Groupe ${groupId}`));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <button onClick={() => navigate('/apps')} className="mr-4 text-gray-500 hover:text-pink-600 transition-colors">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 font-poppins flex items-center">
                            <span className="text-2xl mr-2">🧴</span> DermoGuide
                            <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline-block">Approche PHARMA</span>
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 font-poppins">Catalogue DermoGuide</h2>
                    <p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
                        Priorité à la simulation : Entraînez-vous d'abord, accédez à la fiche ensuite pour progresser.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-64 space-y-4">
                        <Spinner className="h-12 w-12 text-pink-600" />
                        <p className="text-slate-500 font-medium animate-pulse">Chargement du catalogue...</p>
                    </div>
                ) : fiches.length > 0 ? (
                    <div className="space-y-16">
                        {groups.map(group => {
                            const groupFiches = getFichesByGroup(group.id);
                            if (groupFiches.length === 0) return null;
                            return (
                                <section key={group.id} className="animate-fade-in">
                                    <div className="flex items-center mb-8">
                                        <div className="h-10 w-1.5 bg-pink-500 rounded-full mr-4"></div>
                                        <h2 className="text-2xl font-bold text-slate-800">{group.name}</h2>
                                        <span className="ml-4 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 uppercase">
                                            {groupFiches.length} {groupFiches.length > 1 ? 'Fiches' : 'Fiche'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {groupFiches.map(fiche => (
                                            <DermoFicheCard key={fiche._id} fiche={fiche} user={user} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <span className="text-6xl mb-4 block">🔍</span>
                        <h3 className="text-xl font-bold text-slate-800">Aucune fiche DermoGuide disponible</h3>
                        <p className="text-slate-500 mt-2">Utilisez le Générateur DermoGuide pour créer vos premières fiches.</p>
                        <button 
                            onClick={() => navigate('/apps/dermoguide-generator')}
                            className="mt-6 px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md"
                        >
                            Ouvrir le Générateur
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

const DermoFicheCard: React.FC<{ fiche: CaseStudy, user: any }> = ({ fiche, user }) => {
    const navigate = useNavigate();
    
    // Find simulations for this specific fiche
    const sims = user?.simulationHistory?.filter((s: any) => s.ficheId === fiche._id) || [];
    const isSimulated = sims.length > 0;
    
    // Get pre-reading and post-reading scores
    const preReadSim = sims.find((s: any) => !s.isPostReading);
    const postReadSim = sims.find((s: any) => s.isPostReading);

    // Find the lesion image in patientSituation content
    const lesionImage = Array.isArray(fiche.patientSituation?.content) 
        ? fiche.patientSituation.content.find((c: any) => c.type === 'image')?.value 
        : fiche.coverImageUrl;

    return (
        <div className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="h-52 bg-slate-100 relative overflow-hidden">
                {lesionImage ? (
                    <img 
                        src={getAbsoluteImageUrl(lesionImage)} 
                        alt={fiche.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <span className="text-5xl mb-2 opacity-50">🧴</span>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Image non dispo</p>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Score badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {preReadSim && (
                        <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Initial</span>
                            <span className="text-sm font-bold text-slate-800 leading-none">{preReadSim.score}%</span>
                        </div>
                    )}
                    {postReadSim && (
                        <div className="bg-teal-500/90 backdrop-blur px-2 py-1 rounded-lg shadow-md border border-teal-400 flex flex-col items-center">
                            <span className="text-[9px] font-black text-white uppercase leading-none mb-1">Final</span>
                            <span className="text-sm font-bold text-white leading-none">{postReadSim.score}%</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-pink-600 transition-colors leading-tight line-clamp-2">
                        {fiche.title}
                    </h3>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-6 flex-grow leading-relaxed">
                    {fiche.shortDescription}
                </p>

                {preReadSim && postReadSim && (
                    <div className="mb-4 flex items-center gap-2 p-2 bg-teal-50 rounded-lg border border-teal-100">
                        <TrendingUpIcon className="h-4 w-4 text-teal-600" />
                        <span className="text-xs font-bold text-teal-800">
                            Progression : {postReadSim.score - preReadSim.score > 0 ? '+' : ''}{postReadSim.score - preReadSim.score}%
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => navigate(`/apps/dermo/simulation/${fiche._id}`)}
                        className="flex items-center justify-center px-4 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-bold transition-all duration-200 shadow-lg shadow-pink-200 hover:shadow-pink-300"
                    >
                        <SparklesIcon className="h-5 w-5 mr-2" /> Simulation
                    </button>
                    <button 
                        onClick={() => isSimulated && navigate(`/memofiche/${fiche._id}`)}
                        disabled={!isSimulated}
                        className={`flex items-center justify-center px-4 py-2.5 rounded-xl font-bold transition-all duration-200 border ${
                            isSimulated 
                                ? 'bg-slate-100 text-slate-700 hover:bg-pink-50 hover:text-pink-700 border-transparent hover:border-pink-200' 
                                : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                        }`}
                    >
                        <BookOpenIcon className="h-5 w-5 mr-2" /> Lire { !isSimulated && '🔒' }
                    </button>
                </div>
                {!isSimulated && (
                    <p className="text-[10px] text-center mt-3 font-bold text-slate-400 uppercase tracking-widest">
                        Faites une simulation pour débloquer
                    </p>
                )}
            </div>
        </div>
    );
};

export default DermoGuideApp;

export default DermoGuideApp;