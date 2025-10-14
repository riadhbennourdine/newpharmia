import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import SubscriberManager from './admin/SubscriberManager';
import Newsletter from './admin/Newsletter';
import CRMDashboard from './admin/crm/CRMDashboard';

const AdminPanel: React.FC = () => {
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState('subscribers');

  const [preparateurs, setPreparateurs] = useState<User[]>([]);
  const [pharmacists, setPharmacists] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    setAssignmentLoading(true);
    try {
      const [preparateursRes, pharmacistsRes] = await Promise.all([
        fetch('/api/users/preparateurs'),
        fetch('/api/users/pharmacists'),
      ]);

      if (!preparateursRes.ok || !pharmacistsRes.ok) {
        throw new Error('Failed to fetch users');
      }

      const preparateursData = await preparateursRes.json();
      const pharmacistsData = await pharmacistsRes.json();

      setPreparateurs(preparateursData);
      setPharmacists(pharmacistsData);
    } catch (error) {
      console.error(error);
      setAssignmentFeedback({ message: 'Erreur lors du chargement des utilisateurs.', type: 'error' });
    } finally {
      setAssignmentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'assignment') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);
  
  const handleAssignPharmacist = async (preparateurId: string, newPharmacistId: string) => {
    setAssignmentLoading(true);
    setAssignmentFeedback(null);

    try {
      const response = await fetch(`/api/users/preparateurs/${preparateurId}/assign-pharmacist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pharmacistId: newPharmacistId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign pharmacist');
      }

      setPreparateurs(prev => prev.map(p => p._id === preparateurId ? { ...p, pharmacistId: newPharmacistId || undefined } : p));
      setAssignmentFeedback({ message: 'Attribution mise à jour avec succès.', type: 'success' });
    } catch (error) {
      console.error(error);
      setAssignmentFeedback({ message: 'Erreur lors de l\'attribution du pharmacien.', type: 'error' });
    } finally {
      // Clear feedback after a few seconds
      setTimeout(() => setAssignmentFeedback(null), 3000);
      setAssignmentLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-8 animate-fade-in">
      <h1 className="text-4xl font-bold text-center mb-4">Panneau d'Administration</h1>
      <p className="text-gray-600 text-center mb-12">Gérez les abonnés, les attributions et la newsletter.</p>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 justify-center" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'subscribers' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Abonnés
            </button>
            <button
              onClick={() => setActiveTab('crm')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'crm' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              CRM
            </button>
            <button
              onClick={() => setActiveTab('assignment')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'assignment' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Attributions
            </button>
            <button
              onClick={() => setActiveTab('newsletter')}
              className={`px-3 sm:px-4 py-2 font-medium text-base rounded-t-lg cursor-pointer transition-colors ${activeTab === 'newsletter' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Newsletter
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 sm:p-6 rounded-lg shadow-md min-h-[400px]">
        {activeTab === 'crm' && <CRMDashboard />}
        {activeTab === 'subscribers' && <SubscriberManager />}

        {activeTab === 'assignment' && (
          <div className="animate-fade-in"> 
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold text-gray-800">Gestion des Attributions Préparateur-Pharmacien</h3>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                disabled={assignmentLoading}
              >
                Actualiser
              </button>
            </div>
            <p className="text-gray-600 mb-4">Attribuez un pharmacien référent à chaque préparateur.</p>
            {assignmentFeedback && (
              <p className={`mb-4 text-sm font-semibold ${assignmentFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {assignmentFeedback.message}
              </p>
            )}
            {assignmentLoading && preparateurs.length === 0 ? (
                <p>Chargement...</p>
            ) : preparateurs.length === 0 ? (
              <p className="text-gray-600 italic">Aucun préparateur trouvé.</p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Préparateur</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Pharmacien Référent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preparateurs.map((prep) => (
                      <tr key={prep._id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800 font-medium">{prep.firstName} {prep.lastName} <span className="text-gray-500">({prep.email})</span></td>
                        <td className="py-3 px-4 w-1/2">
                          <select
                            value={prep.pharmacistId || ''}
                            onChange={(e) => handleAssignPharmacist(prep._id, e.target.value)}
                            className="p-2 border border-gray-300 rounded-md w-full focus:ring-teal-500 focus:border-teal-500 bg-white"
                            disabled={assignmentLoading}
                          >
                            <option value="">-- Non attribué --</option>
                            {pharmacists.map((ph) => (
                              <option key={ph._id} value={ph._id}>
                                {ph.firstName} {ph.lastName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'newsletter' && <Newsletter />}
      </div>
    </div>
  );
};
export default AdminPanel;