import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../../types';

const EditSubscriptionModal: React.FC<{ user: User; onClose: () => void; onUpdate: (user: User) => void; }> = ({ user, onClose, onUpdate }) => {
    const [subscriptionEndDate, setSubscriptionEndDate] = useState(user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toISOString().split('T')[0] : '');
    const [planName, setPlanName] = useState(user.planName || '');

    const handleSave = async () => {
        try {
            const response = await fetch(`/api/users/${user._id}/subscription`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionEndDate, planName }),
            });

            if (!response.ok) {
                throw new Error('Failed to update subscription');
            }

            const updatedUser = await response.json();
            onUpdate(updatedUser);
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Modifier l'abonnement de {user.email}</h3>
                <div className="mt-6">
                    <div className="mb-4">
                        <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Nom du plan</label>
                        <input
                            type="text"
                            id="planName"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="subscriptionEndDate" className="block text-sm font-medium text-gray-700">Valide jusqu'au</label>
                        <input
                            type="date"
                            id="subscriptionEndDate"
                            value={subscriptionEndDate}
                            onChange={(e) => setSubscriptionEndDate(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors duration-200"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

const SubscriberManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/users/subscribers');
            if (!response.ok) {
                throw new Error('Failed to fetch subscribers');
            }
            const data = await response.json();
            setSubscribers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchSubscribers();
  }, []);

  const filteredSubscribers = useMemo(() => {
    return subscribers
      .filter(subscriber => 
        searchTerm === '' || subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [subscribers, searchTerm]);

  const handleUpdateUser = (updatedUser: User) => {
      setSubscribers(subscribers.map(user => user._id === updatedUser._id ? updatedUser : user));
  };

  if (loading) {
    return <div>Chargement des abonnés...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestion des Abonnés</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher par email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
            <tr>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Nom</th>
                <th className="py-2 px-4 border-b text-left">Date d'inscription</th>
                <th className="py-2 px-4 border-b text-left">Valide jusqu'au</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
            </thead>
            <tbody>
            {filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id}>
                <td className="py-2 px-4 border-b">{subscriber.email}</td>
                <td className="py-2 px-4 border-b">{subscriber.firstName} {subscriber.lastName}</td>
                <td className="py-2 px-4 border-b">{subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">{subscriber.subscriptionEndDate ? new Date(subscriber.subscriptionEndDate).toLocaleDateString() : 'N/A'}</td>
                <td className="py-2 px-4 border-b">
                  <button onClick={() => setSelectedUser(subscriber)} className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded">
                    Modifier
                  </button>
                </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 px-4 border-b text-center text-gray-500">
                  Aucun abonné ne correspond aux filtres actuels.
                </td>
              </tr>
            )}
            </tbody>
        </table>
       </div>
       {selectedUser && <EditSubscriptionModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={handleUpdateUser} />}
    </div>
  );
};

export default SubscriberManager;