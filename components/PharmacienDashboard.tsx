import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Group, UserRole } from '../types';
import { ArrowRightIcon } from './Icons';
import LearnerDashboard from './LearnerDashboard';

interface Props {
    instruction: string;
    setInstruction: (instruction: string) => void;
    group: Group | null;
}

const PharmacienDashboard: React.FC<Props> = ({ instruction, setInstruction, group }) => {
    const { user } = useAuth();
    const { team, getPharmacistTeam } = useData();
    const [selectedMenu, setSelectedMenu] = useState('parcours');

    useEffect(() => {
        if (selectedMenu === 'equipe' && user?._id) {
            getPharmacistTeam(user._id);
        }
    }, [selectedMenu, user?._id, getPharmacistTeam]);

    const handleSaveInstruction = async () => {
        if (group) {
            await fetch(`/api/groups/${group._id}/instruction`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instruction }),
            });
            alert('Consigne enregistrée !');
        }
    };

    return (
        <div>
            <div className="flex justify-center mb-8">
                <button 
                    className={`px-4 py-2 font-semibold rounded-l-lg ${selectedMenu === 'parcours' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                    onClick={() => setSelectedMenu('parcours')}
                >
                    Parcours d'apprentissage
                </button>
                <button 
                    className={`px-4 py-2 font-semibold rounded-r-lg ${selectedMenu === 'equipe' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                    onClick={() => setSelectedMenu('equipe')}
                >
                    Gestion de l'équipe
                </button>
            </div>

            {selectedMenu === 'parcours' && <LearnerDashboard instruction={instruction} />}
            {selectedMenu === 'equipe' && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {team.map(preparateur => (
                            <div key={preparateur._id} className="bg-white rounded-xl shadow-lg p-6 text-center">
                                <h3 className="text-xl font-bold text-teal-600">{preparateur.firstName} {preparateur.lastName}</h3>
                                <div className="mt-4">
                                    <p>Mémofiches lues: {preparateur.readFicheIds?.length || 0}</p>
                                    <p>Quiz réalisés: {preparateur.quizHistory?.length || 0}</p>
                                    <p>Score moyen: {preparateur.quizHistory && preparateur.quizHistory.length > 0 ? Math.round(preparateur.quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) / preparateur.quizHistory.length) : 0}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne du Pharmacien à l'équipe</h2>
                        <textarea
                            rows={4}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                            placeholder="Écrivez vos consignes ici..."
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                        />
                        <button
                            onClick={handleSaveInstruction}
                            className="mt-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700"
                        >
                            Enregistrer la consigne
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacienDashboard;