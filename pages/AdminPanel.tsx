import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import SubscriberManager from './admin/SubscriberManager';
import Newsletter from './admin/Newsletter';
import CRMDashboard from './admin/crm/CRMDashboard';
import GroupManagementPage from './admin/GroupManagement';
import AssignmentManager from './admin/AssignmentManager'; // Import the new component

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('crm');

  return (
    <div className="container mx-auto p-4 sm:p-8 animate-fade-in">
      <h1 className="text-4xl font-bold text-center mb-4">Panneau d'Administration</h1>
      <p className="text-gray-600 text-center mb-12">Gérez les abonnés, les commandes et le contenu.</p>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 justify-center" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('crm')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'crm' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              CRM / Abonnés
            </button>
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
            <NavLink
              to="/admin/orders"
              className={({ isActive }) =>
                `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
              }
            >
              Commandes
            </NavLink>
            <NavLink
              to="/admin/image-manager"
              className={({ isActive }) =>
                `px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${isActive ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`
              }
            >
              Images
            </NavLink>
          </nav>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 sm:p-6 rounded-lg shadow-md min-h-[400px]">
        {activeTab === 'crm' && <CRMDashboard />}
        {activeTab === 'newsletter' && <Newsletter />}
        {activeTab === 'groups' && <GroupManagementPage />}
      </div>
    </div>
  );
};
export default AdminPanel;