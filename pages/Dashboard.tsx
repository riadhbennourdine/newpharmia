import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import PharmacienDashboard from '../components/PharmacienDashboard';
import LearnerDashboard from '../components/LearnerDashboard';
import { isPharmacienOrAdminWebinar } from '../utils/roles';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { fetchFiches } = useData();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.profileIncomplete && (user.role === UserRole.PREPARATEUR || user.role === UserRole.APPRENANT)) {
            navigate('/profile');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchFiches({ page: 1, limit: 3, sortBy: 'newest' });
    }, [fetchFiches]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {(isPharmacienOrAdminWebinar(user?.role) || user?.role === UserRole.ADMIN) ? (
                <PharmacienDashboard />
            ) : user?.role === UserRole.PREPARATEUR ? (
                <LearnerDashboard />
            ) : (
                <div>Tableau de bord non disponible pour ce rôle.</div>
            )}
        </div>
    );
};

export default Dashboard;
