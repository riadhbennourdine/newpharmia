import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Group, UserRole } from '../types';
import PharmacienDashboard from '../components/PharmacienDashboard';
import LearnerDashboard from '../components/LearnerDashboard';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { fetchFiches } = useData();
    const [instruction, setInstruction] = useState('');
    const [group, setGroup] = useState<Group | null>(null);

    const fetchGroup = async () => {
        if (!user) return;
        try {
            const response = await fetch('/api/groups', { headers: { 'x-user-id': user._id as string } });
            if (response.ok) {
                const data = await response.json();
                setGroup(data);
                setInstruction(data.instruction || '');
            }
        } catch (error) {
            console.error('Error fetching group:', error);
        }
    };

    useEffect(() => {
        fetchGroup();
    }, [user]);

    useEffect(() => {
        fetchFiches({ page: 1, limit: 3, sortBy: 'newest' });
    }, [fetchFiches]);

    console.log('group in Dashboard:', group);
    console.log('User in Dashboard:', user);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {user?.role === UserRole.PHARMACIEN ? (
                <PharmacienDashboard instruction={instruction} setInstruction={setInstruction} group={group} />
            ) : (
                <LearnerDashboard instruction={instruction} group={group} />
            )}
        </div>
    );
};

export default Dashboard;
