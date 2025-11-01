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
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-teal-600 hover:text-teal-800 font-semibold"
            >
                Ajouter des mémofiches
            </button>
        </div>
    );
};

export default PharmacienDashboard;