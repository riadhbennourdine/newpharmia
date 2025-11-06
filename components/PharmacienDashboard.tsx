import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Group, User, CaseStudy } from '../types';
import LearnerDashboard from './LearnerDashboard';
import { useAuth } from '../hooks/useAuth';
import PreparatorCard from './PreparatorCard';
import EditInstructionModal from './EditInstructionModal';

interface Props {
    group: Group | null;
}

const PharmacienDashboard: React.FC<Props> = ({ group: initialGroup }) => {
    const { user } = useAuth();
    const [selectedMenu, setSelectedMenu] = useState('equipe');
    const [preparators, setPreparators] = useState<User[]>([]);
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [primaryFicheDetails, setPrimaryFicheDetails] = useState<CaseStudy | null>(null);
    const [additionalFicheDetails, setAdditionalFicheDetails] = useState<CaseStudy[]>([]);

    const fetchPreparators = async () => {
        if (!initialGroup) return;
        try {
            const response = await fetch(`/api/users/groups/${initialGroup._id}/preparateurs`);
            const data = await response.json();
            setPreparators(data);
        } catch (error) {
            console.error('Error fetching preparators:', error);
        }
    };

    useEffect(() => {
        if (selectedMenu === 'equipe') {
            fetchPreparators();
        }
    }, [selectedMenu, initialGroup]);

    useEffect(() => {
        const fetchInstructionFiches = async () => {
            if (!initialGroup) return;

            const ficheIdsToFetch: string[] = [];
            if (initialGroup.primaryMemoFicheId) {
                ficheIdsToFetch.push(initialGroup.primaryMemoFicheId.toString());
            }
            if (initialGroup.instructionFiches && initialGroup.instructionFiches.length > 0) {
                ficheIdsToFetch.push(...initialGroup.instructionFiches.map(id => id.toString()));
            }

            if (ficheIdsToFetch.length === 0) return;

            try {
                const responses = await Promise.all(
                    ficheIdsToFetch.map(ficheId => 
                        fetch(`/api/memofiches/${ficheId}`)
                    )
                );

                const data = await Promise.all(responses.map(res => res.json()));

                if (initialGroup.primaryMemoFicheId) {
                    const primary = data.find(d => d._id === initialGroup.primaryMemoFicheId.toString());
                    setPrimaryFicheDetails(primary || null);
                }

                const additional = data.filter(d => 
                    initialGroup.instructionFiches?.map(id => id.toString()).includes(d._id) && 
                    d._id !== initialGroup.primaryMemoFicheId?.toString()
                );
                setAdditionalFicheDetails(additional);

            } catch (error) {
                console.error('Error fetching instruction fiches:', error);
            }
        };
        fetchInstructionFiches();
    }, [initialGroup]);

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

            {selectedMenu === 'parcours' && <LearnerDashboard group={initialGroup} />}
            {selectedMenu === 'equipe' && (
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne de l'équipe</h2>
                        <p className="text-slate-700 font-semibold text-base">{initialGroup?.instruction || 'Aucune consigne pour le moment.'}</p>
                        {initialGroup?.instructionDate && <p className="text-sm text-gray-500 mt-2">Donnée le: {new Date(initialGroup.instructionDate).toLocaleDateString('fr-FR')}</p>}
                        
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
                    <h1 className="text-3xl font-bold text-slate-800 mb-6">Statistiques de l'équipe</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {preparators.map(p => (
                            <PreparatorCard key={p._id as string} preparator={p} />
                        ))}
                    </div>
                </div>
            )}
            {isInstructionModalOpen && (
                <EditInstructionModal 
                    group={initialGroup}
                    onClose={() => setIsInstructionModalOpen(false)}
                />
            )}
        </div>
    );
};

export default PharmacienDashboard;