import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import PharmacienDashboard from '../components/PharmacienDashboard';
import LearnerDashboard from '../components/LearnerDashboard';
import { isPharmacienOrAdminWebinar } from '../utils/roles';

/**
 * This component acts as a wrapper for the original, role-based dashboards
 * to provide a dedicated route for them.
 */
const LegacyDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isPharmacienOrAdminWebinar(user?.role) ? (
        <PharmacienDashboard />
      ) : user?.role === UserRole.PREPARATEUR ? (
        <LearnerDashboard />
      ) : (
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Bienvenue sur PharmIA
          </h2>
          <p className="text-slate-600">
            Tableau de bord non disponible pour votre rôle.
          </p>
        </div>
      )}
    </div>
  );
};

export default LegacyDashboard;
