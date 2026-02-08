import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import SubscriberManager from './admin/SubscriberManager';
import Newsletter from './admin/Newsletter';
import CRMDashboard from './admin/crm/CRMDashboard';
import GroupManagementPage from './admin/GroupManagement';
import CampaignsManager from './admin/CampaignsManager';
import AssignmentManager from './admin/AssignmentManager'; // Import the new component
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('crm');
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="container mx-auto p-4 sm:p-8 animate-fade-in">
      <h1 className="text-4xl font-bold text-center mb-4">
        Panneau d'Administration
      </h1>
      <p className="text-gray-600 text-center mb-12">
        Gérez les abonnés, les commandes et le contenu.
      </p>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav
            className="-mb-px flex space-x-2 sm:space-x-4 justify-center flex-wrap"
            aria-label="Tabs"
          >
            <button
              onClick={() => setActiveTab('crm')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'crm' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              CRM
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'users' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Utilisateurs
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('newsletter')}
                  className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'newsletter' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Newsletter
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'groups' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Groupes
                </button>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'campaigns' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pubs
                </button>
                <NavLink
                  to="/admin/orders"
                  className={({ isActive }) =>
                    `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
                  }
                >
                  Commandes
                </NavLink>
                <NavLink
                  to="/admin/subscriptions"
                  className={({ isActive }) =>
                    `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
                  }
                >
                  Abonnements
                </NavLink>
                <NavLink
                  to="/admin/image-manager"
                  className={({ isActive }) =>
                    `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
                  }
                >
                  Images
                </NavLink>
                <NavLink
                  to="/admin/events"
                  className={({ isActive }) =>
                    `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
                  }
                >
                  Événements
                </NavLink>
                <NavLink
                  to="/admin/resources"
                  className={({ isActive }) =>
                    `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
                  }
                >
                  Ressources
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      {isAdmin && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Outils d'administration</h3>
              <div className="flex flex-wrap gap-4">
                  <NavLink
                      to="/admin/reset-password"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                      Réinitialiser un mot de passe
                  </NavLink>
                  <NavLink
                      to="/admin/statistics"
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                      Voir les statistiques
                  </NavLink>
              </div>
          </div>
      )}

      <div className="mt-6 bg-white p-4 sm:p-6 rounded-lg shadow-md min-h-[400px]">
        {activeTab === 'crm' && <CRMDashboard />}
        {activeTab === 'users' && <SubscriberManager />}
        {activeTab === 'newsletter' && isAdmin && <Newsletter />}
        {activeTab === 'groups' && isAdmin && <GroupManagementPage />}
        {activeTab === 'campaigns' && isAdmin && <CampaignsManager />}
      </div>
    </div>
  );
};
export default AdminPanel;
