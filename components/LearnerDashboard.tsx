import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Spinner, ArrowRightIcon, CalendarIcon, LockClosedIcon, CheckCircleIcon } from './Icons';
import MemoFichePreviewCard from './MemoFichePreviewCard';
import { Group, CaseStudy, GroupAssignment } from '../types';
import PreparateurLearningJourneyPopup from './PreparateurLearningJourneyPopup';
import CompagnonIA from './CompagnonIA';
import SkillHeatmap from './SkillHeatmap';
import TeamBriefingPlayer from './TeamBriefingPlayer';

interface Props {
    initialGroup?: Group | null; // Make prop optional
}

const LearnerDashboard: React.FC<Props> = ({ initialGroup }) => {
    const { user, token, isLoading: isLoadingUser } = useAuth();
    const { fiches, isLoading: fichesLoading } = useData();

    const [group, setGroup] = useState<Group | null>(initialGroup || null);
    const [isLoadingGroup, setIsLoadingGroup] = useState(!initialGroup); // If initialGroup is provided, it's not loading
    const [groupError, setGroupError] = useState<string | null>(null);

    const [primaryFicheDetails, setPrimaryFicheDetails] = useState<CaseStudy | null>(null);
    const [additionalFicheDetails, setAdditionalFicheDetails] = useState<CaseStudy[]>([]);
    const [validReadFichesCount, setValidReadFichesCount] = useState(user?.readFiches?.length || 0);
    const [showJourneyPopup, setShowJourneyPopup] = useState(false);
    const [showCompagnon, setShowCompagnon] = useState(false);
    const [skills, setSkills] = useState<any[]>([]);
    
    // Planning State
    const [planningDetails, setPlanningDetails] = useState<{ active: (GroupAssignment & { title: string })[], upcoming: (GroupAssignment & { title: string })[] }>({ active: [], upcoming: [] });

    useEffect(() => {
        const fetchLearningJourney = async () => {
            if (!user?._id) return;
            try {
                const response = await fetch(`/api/users/${user._id}/learning-journey`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.skillsHeatmap) {
                        setSkills(data.skillsHeatmap);
                    }
                }
            } catch (error) {
                console.error('Error fetching skills heatmap:', error);
            }
        };

        if (user?._id) {
            fetchLearningJourney();
        }
    }, [user?._id]);

    useEffect(() => {
        const fetchGroup = async () => {
            if (initialGroup) {
                setGroup(initialGroup);
                setIsLoadingGroup(false);
                return;
            }
            if (!user || isLoadingUser) {
                setIsLoadingGroup(false);
                return;
            }

            setIsLoadingGroup(true);
            setGroupError(null);
            try {
                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch('/api/groups', { headers });
                if (response.ok) {
                    const data = await response.json();
                    setGroup(data);
                } else if (response.status === 404) {
                    setGroup(null); // User might not be part of a group
                } else {
                    throw new Error('Failed to fetch group');
                }
            } catch (error: any) {
                console.error('Error fetching group:', error);
                setGroupError(error.message || 'Erreur lors du chargement du groupe.');
            } finally {
                setIsLoadingGroup(false);
            }
        };

        fetchGroup();
    }, [user, initialGroup, isLoadingUser]);

    // Process Planning
    useEffect(() => {
        if (!group?.planning || group.planning.length === 0) return;

        const processPlanning = async () => {
            const now = new Date();
            const activeItems: (GroupAssignment & { title: string })[] = [];
            const upcomingItems: (GroupAssignment & { title: string })[] = [];

            const idsToFetch = group.planning!.map(p => p.ficheId);
            
            // Fetch titles
            const titles: Record<string, string> = {};
            await Promise.all(idsToFetch.map(async (id) => {
                try {
                    const res = await fetch(`/api/memofiches/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        titles[id] = data.title;
                    }
                } catch (e) { console.error(e); }
            }));

            group.planning!.forEach(item => {
                const startDate = new Date(item.startDate);
                const endDate = item.endDate ? new Date(item.endDate) : null;
                const title = titles[item.ficheId] || "Chargement...";

                if (!item.active) return;

                if (startDate > now) {
                    upcomingItems.push({ ...item, title });
                } else if (!endDate || endDate >= now) {
                    activeItems.push({ ...item, title });
                }
            });

            setPlanningDetails({ active: activeItems, upcoming: upcomingItems });
        };

        processPlanning();
    }, [group]);

    useEffect(() => {
        const validateReadFiches = async () => {
            if (user?.readFiches && user.readFiches.length > 0) {
                try {
                    const idsToValidate = user.readFiches.map(f => f.ficheId);
                    const response = await fetch('/api/memofiches/validate-ids', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsToValidate })
                    });
                    if (response.ok) {
                        const { validIds } = await response.json();
                        setValidReadFichesCount(validIds.length);
                    } else {
                        // Fallback to the old count if the endpoint fails
                        setValidReadFichesCount(user.readFiches.length);
                    }
                } catch (error) {
                    console.error('Error validating read fiches:', error);
                    setValidReadFichesCount(user.readFiches.length);
                }
            }
        };

        if (!isLoadingUser && user) {
            validateReadFiches();
        }
    }, [user, isLoadingUser]);

    useEffect(() => {
        const fetchInstructionFiches = async () => {
            if (!group || !user || !user._id) {
                return;
            }

            const ficheIdsToFetch: string[] = [];
            if (group.primaryMemoFicheId) {
                ficheIdsToFetch.push(group.primaryMemoFicheId.toString());
            }
            if (group.instructionFiches && group.instructionFiches.length > 0) {
                ficheIdsToFetch.push(...group.instructionFiches.map(id => id.toString()));
            }

            if (ficheIdsToFetch.length === 0) return;

            try {
                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const responses = await Promise.all(
                    ficheIdsToFetch.map(ficheId => 
                        fetch(`/api/memofiches/${ficheId}`, { headers })
                    )
                );

                const data = await Promise.all(responses.map(res => res.json()));

                if (group.primaryMemoFicheId) {
                    const primary = data.find(d => d._id === group.primaryMemoFicheId.toString());
                    setPrimaryFicheDetails(primary || null);
                }

                const additional = data.filter(d => 
                    group.instructionFiches?.map(id => id.toString()).includes(d._id) && 
                    d._id !== group.primaryMemoFicheId?.toString()
                );
                setAdditionalFicheDetails(additional);

            } catch (error) {
                console.error('Error fetching instruction fiches:', error);
            }
        };
        if (!isLoadingUser && user && group) { 
            fetchInstructionFiches();
        }
    }, [group, user, isLoadingUser]);

    const quizHistory = user?.quizHistory || [];
    const quizRealises = quizHistory.length;
    
    const averageScore = quizRealises > 0
        ? Math.round(quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) / quizRealises)
        : 0;

    const simulationHistory = user?.simulationHistory || [];
    const simulationsRealisees = simulationHistory.length;
    const averageSimulationScore = simulationsRealisees > 0
        ? Math.round(simulationHistory.reduce((acc, sim) => acc + (sim.score || 0), 0) / simulationsRealisees)
        : 0;

    const encouragementMessages = [
        "Chaque mémofiche lue est un pas de plus vers l'excellence.",
        "La connaissance est votre plus grand atout. Continuez comme ça !",
        "Impressionnant ! Votre dévouement est la clé de votre succès.",
        "Ne lâchez rien, vous êtes sur la bonne voie.",
    ];
    const encouragement = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];

    if (isLoadingUser || isLoadingGroup) {
        return <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    }

    if (groupError) {
        return <div className="text-center text-red-500 p-4">{groupError}</div>;
    }

    return (
        <>
            <TeamBriefingPlayer />

            {/* Planning Section */}
            {(planningDetails.active.length > 0 || planningDetails.upcoming.length > 0) && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-teal-500">
                    <h2 className="text-2xl font-bold text-teal-600 mb-4 flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6" />
                        Planning de la semaine
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Active Fiches */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                À étudier maintenant
                            </h3>
                            {planningDetails.active.length > 0 ? (
                                <ul className="space-y-3">
                                    {planningDetails.active.map((item, idx) => (
                                        <li key={idx}>
                                            <Link 
                                                to={`/memofiche/${item.ficheId}`}
                                                className="block p-3 bg-teal-50 rounded-lg border border-teal-100 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-teal-800 group-hover:text-teal-600">{item.title}</span>
                                                    <ArrowRightIcon className="h-4 w-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                                {item.endDate && (
                                                    <p className="text-xs text-teal-600 mt-1">
                                                        Jusqu'au {new Date(item.endDate).toLocaleDateString('fr-FR')}
                                                    </p>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Rien de prévu pour le moment.</p>
                            )}
                        </div>

                        {/* Upcoming Fiches */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                Bientôt disponible
                            </h3>
                            {planningDetails.upcoming.length > 0 ? (
                                <ul className="space-y-3">
                                    {planningDetails.upcoming.map((item, idx) => (
                                        <li key={idx} className="block p-3 bg-slate-50 rounded-lg border border-slate-200 opacity-75">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-600">{item.title}</span>
                                                <LockClosedIcon className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Disponible le {new Date(item.startDate).toLocaleDateString('fr-FR')}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Pas de fiche à venir.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {group?.instruction && (
                <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                    <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne du Pharmacien</h2>
                    <p className="text-slate-700 font-semibold text-base">{group.instruction}</p>
                    {group.instructionDate && <p className="text-sm text-gray-500 mt-2">Donnée le: {new Date(group.instructionDate).toLocaleDateString('fr-FR')}</p>}
                    
                    {primaryFicheDetails && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-600">Mémofiche principale :</p>
                            <Link to={`/memofiche/${primaryFicheDetails._id}`} className="text-teal-600 hover:underline font-medium">
                                {primaryFicheDetails.title}
                            </Link>
                        </div>
                    )}

                    {additionalFicheDetails.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-600">Mémofiches additionnelles :</p>
                            <ul className="list-disc list-inside text-left mx-auto w-fit">
                                {additionalFicheDetails.map(fiche => (
                                    <li key={fiche._id as string}>
                                        <Link to={`/memofiche/${fiche._id}`} className="text-teal-600 hover:underline font-medium">
                                            {fiche.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            {/* Nouveau : Compagnon IA Agent Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-teal-600 mb-4">Bonjour, {user?.firstName} !</h2>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-teal-100 overflow-hidden relative">
                    <div className="relative z-10">
                        <p className="text-slate-700 font-semibold text-lg mb-4">Que souhaites-tu faire aujourd'hui ?</p>
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
                            <div className="flex justify-center md:justify-start">
                                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-teal-100 shadow-md">
                                    <img 
                                        src="/api/ftp/view?filePath=%2Fcoach-pharmia.png" 
                                        alt="Coach PharmIA" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCompagnon(true)}
                                className="flex items-center justify-between p-6 bg-teal-50 border border-teal-200 rounded-2xl hover:bg-teal-100 transition-all group shadow-sm hover:shadow-md active:scale-95 h-full"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-teal-600 text-white p-3 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-teal-800 text-xl mb-1">Réviser avec mon Coach</h3>
                                        <p className="text-sm text-teal-600 font-medium">Teste tes connaissances sur les fiches</p>
                                    </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-teal-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-teal-600 mb-4">Statistiques d'apprentissage</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
                        <p className="text-6xl font-bold text-teal-600 my-2 animated-gradient-text">
                            {validReadFichesCount}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Mémofiches lues</h1>
                        {user?._id && (
                            <button 
                                onClick={() => setShowJourneyPopup(true)}
                                className="absolute top-2 right-2 text-teal-600 hover:text-teal-800"
                                title="Voir le détail"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {quizRealises}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Quiz réalisés</h1>
                        {user?._id && (
                            <button 
                                onClick={() => setShowJourneyPopup(true)}
                                className="absolute top-2 right-2 text-teal-600 hover:text-teal-800"
                                title="Voir le détail"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {averageScore}%
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Score Quiz</h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {averageSimulationScore}%
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Score Simulations</h1>
                    </div>
                </div>

                <div className="mb-8">
                    <SkillHeatmap skills={skills} />
                </div>
            </div>
            {/* Modal Compagnon IA */}
            {showCompagnon && user && (
                <CompagnonIA 
                    user={user} 
                    onClose={() => setShowCompagnon(false)} 
                />
            )}
        </>
    );
};

export default LearnerDashboard;