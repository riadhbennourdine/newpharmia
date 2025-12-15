import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Spinner, ArrowRightIcon } from './Icons';
import MemoFichePreviewCard from './MemoFichePreviewCard';
import { Group, CaseStudy } from '../types';
import PreparateurLearningJourneyPopup from './PreparateurLearningJourneyPopup';

interface Props {
    initialGroup?: Group | null; // Make prop optional
}

const LearnerDashboard: React.FC<Props> = ({ initialGroup }) => {
    const { user, isLoading: isLoadingUser } = useAuth();
    const { fiches, isLoading: fichesLoading } = useData();

    const [group, setGroup] = useState<Group | null>(initialGroup || null);
    const [isLoadingGroup, setIsLoadingGroup] = useState(!initialGroup); // If initialGroup is provided, it's not loading
    const [groupError, setGroupError] = useState<string | null>(null);

    const [primaryFicheDetails, setPrimaryFicheDetails] = useState<CaseStudy | null>(null);
    const [additionalFicheDetails, setAdditionalFicheDetails] = useState<CaseStudy[]>([]);
    const [validReadFichesCount, setValidReadFichesCount] = useState(user?.readFiches?.length || 0);
    const [showJourneyPopup, setShowJourneyPopup] = useState(false);

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
                const response = await fetch('/api/groups', { headers: { 'x-user-id': user._id as string } });
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
                const responses = await Promise.all(
                    ficheIdsToFetch.map(ficheId => 
                        fetch(`/api/memofiches/${ficheId}`, { headers: { 'x-user-id': user._id as string } })
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
            <div>
                <h2 className="text-2xl font-bold text-teal-600 mb-4">Statistiques d'apprentissage</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                        <h1 className="text-lg text-slate-600 font-medium">Score moyen</h1>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <p className="text-teal-700 font-semibold text-base">
                    "{encouragement}"
                </p>
                <Link 
                    to="/memofiches" 
                    className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:bg-teal-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    Explorer les mémofiches
                    <ArrowRightIcon className="h-4 w-4" />
                </Link>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-teal-600 mb-6">Dernières mémofiches ajoutées</h2>
                {fichesLoading ? (
                    <div className="flex justify-center items-center h-40"><Spinner className="h-10 w-10 text-teal-600" /></div>
                ) : fiches.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fiches.map(cs => (
                                <MemoFichePreviewCard key={cs._id} caseStudy={cs} />
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <Link to="/memofiches" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                                Voir toutes les mémofiches &rarr;
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                        <p className="text-slate-500">Aucune mémofiche à afficher pour le moment.</p>
                    </div>
                )}
            </div>
            {showJourneyPopup && user && (
                <PreparateurLearningJourneyPopup
                    preparerId={user._id as string}
                    preparerName={`${user.firstName} ${user.lastName}`}
                    onClose={() => setShowJourneyPopup(false)}
                />
            )}
        </>
    );
};

export default LearnerDashboard;