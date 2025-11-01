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
    const [selectedMenu, setSelectedMenu] = useState('parcours');
    const [isModalOpen, setIsModalOpen] = useState(false);

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

            {selectedMenu === 'parcours' && <LearnerDashboard instruction={instruction} group={group} />}
            {selectedMenu === 'equipe' && 
                <div>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm text-teal-600 hover:text-teal-800 font-semibold"
                    >
                        Ajouter des mémofiches
                    </button>
                </div>
            }
        </div>
    );
};

export default PharmacienDashboard;