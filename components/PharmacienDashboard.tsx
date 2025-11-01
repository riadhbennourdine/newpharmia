import React, { useState, useEffect } from 'react';
import { Group, User, UserRole } from '../types';
import LearnerDashboard from './LearnerDashboard';
import { useAuth } from '../hooks/useAuth';
import PreparatorCard from './PreparatorCard';

interface Props {
    instruction: string;
    setInstruction: (instruction: string) => void;
    group: Group | null;
}

const PharmacienDashboard: React.FC<Props> = ({ instruction, setInstruction, group: initialGroup }) => {
    const { user } = useAuth();
    const [selectedMenu, setSelectedMenu] = useState('parcours');
    const [preparators, setPreparators] = useState<User[]>([]);

    const fetchPreparators = async () => {
        if (!initialGroup) return;
        try {
            const response = await fetch(`/api/groups/${initialGroup._id}/preparateurs`);
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

            {selectedMenu === 'parcours' && <LearnerDashboard instruction={instruction} group={initialGroup} />}
            {selectedMenu === 'equipe' && (
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestion de l'équipe</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {preparators.map(p => (
                            <PreparatorCard key={p._id as string} preparator={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacienDashboard;