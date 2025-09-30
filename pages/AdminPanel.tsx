import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import SubscriberManager from './admin/SubscriberManager';
import Newsletter from './admin/Newsletter';

// Mock data since there's no backend
const mockPharmacists: User[] = [
    { _id: 'pharm1', name: 'Dr. John Doe', firstName: 'John', lastName: 'Doe', email: 'john.doe@pharmacy.com', role: UserRole.PHARMACIEN },
    { _id: 'pharm2', name: 'Dr. Jane Roe', firstName: 'Jane', lastName: 'Roe', email: 'jane.roe@pharmacy.com', role: UserRole.PHARMACIEN },
].map(u => ({...u, id: u._id})); // Temp compatibility

const mockPreparateurs: User[] = [
    { _id: 'prep1', name: 'Alice Smith', firstName: 'Alice', lastName: 'Smith', email: 'alice.smith@pharmacy.com', role: UserRole.PREPARATEUR, pharmacistId: 'pharm1' },
    { _id: 'prep2', name: 'Bob Johnson', firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@pharmacy.com', role: UserRole.PREPARATEUR },
    { _id: 'prep3', name: 'Charlie Brown', firstName: 'Charlie', lastName: 'Brown', email: 'charlie.brown@pharmacy.com', role: UserRole.PREPARATEUR },
].map(u => ({...u, id: u._id})); // Temp compatibility


const AdminPanel: React.FC = () => {
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState('subscribers');

  const [preparateurs, setPreparateurs] = useState<User[]>([]);
  const [pharmacists, setPharmacists] = useState<User[]>([]);

  const fetchUsers = async () => {
    setAssignmentLoading(true);
    await new Promise(res => setTimeout(res, 300)); // Simulate async fetch
    setPharmacists(mockPharmacists);
    setPreparateurs(mockPreparateurs);
    setAssignmentLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'assignment') {
      fetchUsers();
    }
  }, [activeTab]);
  
  const handleAssignPharmacist = async (preparateurId: string, newPharmacistId: string) => {
    setAssignmentLoading(true);
    setAssignmentFeedback(null);

    // Mocking API call
    console.log(`Assigning pharmacist ${newPharmacistId} to preparateur ${preparateurId}`);
    await new Promise(res => setTimeout(res, 500));

    setPreparateurs(prev => prev.map(p => p._id === preparateurId ? { ...p, pharmacistId: newPharmacistId || undefined } : p));
    
    setAssignmentFeedback({ message: 'Attribution mise à jour avec succès (simulation).', type: 'success' });
    // Clear feedback after a few seconds
    setTimeout(() => setAssignmentFeedback(null), 3000);
    setAssignmentLoading(false);
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
        {activeTab === 'subscribers' && <SubscriberManager />}

        {activeTab === 'assignment' && (
          <div className="animate-fade-in"> 
            <h3 className="text-xl font-bold text-gray-800 mb-3">Gestion des Attributions Préparateur-Pharmacien</h3>
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