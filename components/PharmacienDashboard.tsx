import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Group, User, CaseStudy } from '../types';
import LearnerDashboard from './LearnerDashboard';
import { useAuth } from '../hooks/useAuth';
import PreparatorCard from './PreparatorCard';
import EditInstructionModal from './EditInstructionModal';
import { Spinner, EyeIcon } from './Icons'; // Assuming Spinner is available
import PreparateurLearningJourneyPopup from './PreparateurLearningJourneyPopup';
import CompagnonIA from './CompagnonIA';

const PharmacienDashboard: React.FC = () => {
    const { user, token } = useAuth();
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoadingGroup, setIsLoadingGroup] = useState(true);
    const [groupError, setGroupError] = useState<string | null>(null);

    const [selectedMenu, setSelectedMenu] = useState('equipe');
    const [preparators, setPreparators] = useState<User[]>([]);
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [primaryFicheDetails, setPrimaryFicheDetails] = useState<CaseStudy | null>(null);
    const [additionalFicheDetails, setAdditionalFicheDetails] = useState<CaseStudy[]>([]);
    
    // State for viewing learning journey
    const [viewingPreparator, setViewingPreparator] = useState<{id: string, name: string} | null>(null);
    const [showCompagnon, setShowCompagnon] = useState(false);

    useEffect(() => {
        const fetchGroup = async () => {
            if (!user) {
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
    }, [user]);

    const fetchPreparators = useCallback(async () => {
        if (!group || !token) return;
        try {
            const response = await fetch(`/api/users/groups/${group._id}/preparateurs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setPreparators(data);
                } else {
                    console.error('Expected array of preparators, got:', data);
                    setPreparators([]);
                }
            } else {
                console.error('Failed to fetch preparators:', response.status);
            }
        } catch (error) {
            console.error('Error fetching preparators:', error);
        }
    }, [group, token]);

    useEffect(() => {
        if (selectedMenu === 'equipe' && group) {
            fetchPreparators();
        }
    }, [selectedMenu, group, fetchPreparators]);

    useEffect(() => {
        const fetchInstructionFiches = async () => {
            if (!group) return;

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
                        fetch(`/api/memofiches/${ficheId}`)
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
        fetchInstructionFiches();
    }, [group]);

    if (isLoadingGroup) {
        return <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    }

    if (groupError) {
        return <div className="text-center text-red-500 p-4">{groupError}</div>;
    }

    if (!group) {
        return (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Aucun groupe trouvé</h2>
                <p className="text-slate-600">Il semble que vous ne soyez pas encore associé à un groupe. Veuillez contacter l'administrateur.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-center mb-8">
                <button
                    className={`px-4 py-2 font-semibold rounded-l-lg ${selectedMenu === 'equipe' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                    onClick={() => setSelectedMenu('equipe')}
                >
                    Gestion de l'équipe
                </button>
                <button
                    className={`px-4 py-2 font-semibold rounded-r-lg ${selectedMenu === 'parcours' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                    onClick={() => setSelectedMenu('parcours')}
                >
                    Parcours d'apprentissage
                </button>
            </div>

            {selectedMenu === 'parcours' && <LearnerDashboard initialGroup={group} />}
            {selectedMenu === 'equipe' && (
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne de l'équipe</h2>
                        <p className="text-slate-700 font-semibold text-base">{group?.instruction || 'Aucune consigne pour le moment.'}</p>
                        {group?.instructionDate && <p className="text-sm text-gray-500 mt-2">Donnée le: {new Date(group.instructionDate).toLocaleDateString('fr-FR')}</p>}
                        
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

                        <button onClick={() => setIsInstructionModalOpen(true)} className="text-sm text-teal-600 hover:text-teal-800 font-semibold mt-4">Modifier la consigne</button>
                    </div>

                    {/* Votre Coach PharmIA d'apprentissage au quotidien Section for Pharmacist */}
                    <div className="mb-8">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-teal-100 overflow-hidden relative">
                            <div className="relative z-10">
                                <p className="text-slate-700 font-semibold text-lg mb-4">Votre Coach PharmIA d'apprentissage au quotidien</p>
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
                                                <h3 className="font-bold text-teal-800 text-xl mb-1">Coach PharmIA</h3>
                                                <p className="text-sm text-teal-600 font-medium">Voir comment l'IA teste vos équipes</p>
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

                    <h1 className="text-3xl font-bold text-slate-800 mb-6">Statistiques de l'équipe</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {preparators.map(p => (
                            <PreparatorCard 
                                key={p._id as string} 
                                preparator={p} 
                                onViewJourney={() => setViewingPreparator({
                                    id: p._id as string, 
                                    name: `${p.firstName} ${p.lastName}`
                                })}
                            />
                        ))}
                    </div>
                </div>
            )}
            {isInstructionModalOpen && (
                <EditInstructionModal 
                    group={group}
                    onClose={() => setIsInstructionModalOpen(false)}
                />
            )}
            {viewingPreparator && (
                <PreparateurLearningJourneyPopup
                    preparerId={viewingPreparator.id}
                    preparerName={viewingPreparator.name}
                    onClose={() => setViewingPreparator(null)}
                />
            )}
            {showCompagnon && user && (
                <CompagnonIA 
                    user={user} 
                    onClose={() => setShowCompagnon(false)} 
                />
            )}
        </div>
    );
};

export default PharmacienDashboard;