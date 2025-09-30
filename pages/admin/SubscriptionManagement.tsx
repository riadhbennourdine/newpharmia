import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, UserRole, PharmacistWithCollaborators } from '../../types';
import { PencilIcon } from '../../components/Icons';

interface CollaboratorModalProps {
  collaborators: User[];
  onClose: () => void;
}

const CollaboratorDetailsModal: React.FC<CollaboratorModalProps> = ({ collaborators, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-11/12 max-w-4xl">
        <h3 className="text-xl font-bold mb-4">Détails des Collaborateurs</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonné</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin Abonnement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collaborators.map((collab) => (
                <tr key={collab._id?.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{collab.firstName} {collab.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{collab.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{collab.hasActiveSubscription ? 'Oui' : 'Non'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{collab.planName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {collab.subscriptionEndDate ? new Date(collab.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const SubscriptionManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PharmacistWithCollaborators[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [durationInDays, setDurationInDays] = useState<string>('30');
  const [planName, setPlanName] = useState<string>('Free Trial');
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [currentCollaborators, setCurrentCollaborators] = useState<User[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
        console.log("Fetching users (mock)");
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        // FIX: Removed `id` and `name` properties to match the User and PharmacistWithCollaborators types.
        const mockPharmacists: PharmacistWithCollaborators[] = [
            { _id: 'p1', firstName: 'John', lastName: 'Doe', email: 'john.doe@pharmacy.com', role: UserRole.PHARMACIEN, hasActiveSubscription: true, planName: 'Gold', subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 300)), createdAt: new Date(),
                collaborators: [
                    { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice.smith@pharmacy.com', role: UserRole.PREPARATEUR, hasActiveSubscription: true, planName: 'Gold', subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 300)) }
                ]
            },
            { _id: 'p2', firstName: 'Jane', lastName: 'Roe', email: 'jane.roe@pharmacy.com', role: UserRole.PHARMACIEN, hasActiveSubscription: false, createdAt: new Date(), collaborators: [] }
        ];
        setUsers(mockPharmacists);
    } catch (err: any) {
      console.error('Error fetching users with collaborators:', err);
      setError(err.message || 'Failed to load users and collaborators.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      fetchUsers();
    }
  }, [currentUser]);

  const handleGrantSubscription = async () => {
    if (!selectedUser || !durationInDays || !planName) return;

    try {
        console.log('Granting subscription (mock):', { userId: selectedUser._id, durationInDays, planName });
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Abonnement octroyé avec succès ! (simulation)');
        setShowGrantModal(false);
        fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Error granting subscription:', err);
      alert(`Erreur: ${err.message || 'Échec de l\'octroi de l\'abonnement.'}`);
    }
  };

  const openCollaboratorModal = (collaborators: User[]) => {
    setCurrentCollaborators(collaborators);
    setShowCollaboratorModal(true);
  };

  if (loading) return <div className="text-center p-4">Chargement des utilisateurs...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestion des Abonnements</h2>
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonné</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin Abonnement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collaborateurs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user._id?.toString()}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.hasActiveSubscription ? 'Oui' : 'Non'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.planName || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.subscriptionEndDate ? user.subscriptionEndDate.toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.collaborators && user.collaborators.length > 0 ? (
                    <button
                      onClick={() => openCollaboratorModal(user.collaborators || [])}
                      className="text-teal-600 hover:text-teal-900 font-bold"
                    >
                      ({user.collaborators.length})
                    </button>
                  ) : (
                    '(0)'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => { setSelectedUser(user); setShowGrantModal(true); }}
                    className="text-teal-600 hover:text-teal-900 mr-2"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Octroyer un abonnement à {selectedUser.firstName} {selectedUser.lastName}</h3>
            <div className="mb-4">
              <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Nom du plan</label>
              <input
                type="text"
                id="planName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Durée (jours)</label>
              <input
                type="number"
                id="duration"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                value={durationInDays}
                onChange={(e) => setDurationInDays(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleGrantSubscription}
                className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700"
              >
                Octroyer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCollaboratorModal && (
        <CollaboratorDetailsModal
          collaborators={currentCollaborators}
          onClose={() => setShowCollaboratorModal(false)}
        />
      )}
    </div>
  );
};

export default SubscriptionManagement;
