import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const EditSubscriptionModal: React.FC<{
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}> = ({ user, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(
    user.subscriptionEndDate
      ? new Date(user.subscriptionEndDate).toISOString().split('T')[0]
      : '',
  );
  const [planName, setPlanName] = useState(user.planName || '');
  const [credits, setCredits] = useState<number>(user.masterClassCredits || 0);
  const [pharmiaCredits, setPharmiaCredits] = useState<number>(
    user.pharmiaCredits || 0,
  );
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');

  const handleSave = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Update Profile (Name)
      const profileResponse = await fetch(`/api/users/${user._id}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ firstName, lastName }),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Update Subscription
      const subResponse = await fetch(`/api/users/${user._id}/subscription`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ subscriptionEndDate, planName }),
      });

      if (!subResponse.ok) {
        throw new Error('Failed to update subscription');
      }

      let updatedUser = await subResponse.json();

      // Merge profile updates since subscription endpoint might return old profile data if parallel requests were an issue,
      // but here we are serial. However, the subscription endpoint might not return the *very* latest if it doesn't fetch fresh.
      // Safe to merge manually.
      updatedUser = { ...updatedUser, firstName, lastName };

      // Update Credits if changed
      if (credits !== (user.masterClassCredits || 0)) {
        const creditResponse = await fetch(`/api/users/${user._id}/credits`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ credits }),
        });

        if (!creditResponse.ok) {
          throw new Error('Failed to update credits');
        }
        updatedUser = { ...updatedUser, masterClassCredits: credits };
      }

      // Update PharmIA Credits if changed
      if (pharmiaCredits !== (user.pharmiaCredits || 0)) {
        const creditResponse = await fetch(
          `/api/users/${user._id}/pharmia-credits`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ credits: pharmiaCredits }),
          },
        );

        if (!creditResponse.ok) {
          throw new Error('Failed to update PharmIA credits');
        }
        updatedUser = { ...updatedUser, pharmiaCredits: pharmiaCredits };
      }

      onUpdate(updatedUser);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">
          Modifier l'utilisateur {user.email}
        </h3>
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                Prénom
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label
              htmlFor="planName"
              className="block text-sm font-medium text-gray-700"
            >
              Nom du plan
            </label>
            <input
              type="text"
              id="planName"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="subscriptionEndDate"
              className="block text-sm font-medium text-gray-700"
            >
              Valide jusqu'au
            </label>
            <input
              type="date"
              id="subscriptionEndDate"
              value={subscriptionEndDate}
              onChange={(e) => setSubscriptionEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            />
          </div>
          <div className="mb-4 bg-teal-50 p-4 rounded-md border border-teal-200">
            <label
              htmlFor="credits"
              className="block text-sm font-bold text-teal-800"
            >
              Crédits Master Class
            </label>
            <input
              type="number"
              id="credits"
              min="0"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-teal-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            />
            <p className="text-xs text-teal-600 mt-1">
              Modifiez ce solde pour ajouter ou retirer des crédits
              manuellement.
            </p>
          </div>
          <div className="mb-4 bg-blue-50 p-4 rounded-md border border-blue-200">
            <label
              htmlFor="pharmiaCredits"
              className="block text-sm font-bold text-blue-800"
            >
              Crédits PharmIA
            </label>
            <input
              type="number"
              id="pharmiaCredits"
              min="0"
              value={pharmiaCredits}
              onChange={(e) => setPharmiaCredits(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="text-xs text-blue-600 mt-1">
              Modifiez ce solde pour ajouter ou retirer des crédits PharmIA.
            </p>
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
  const { token } = useAuth();
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchSubscribers = async () => {
      setLoading(true);
      try {
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        // Fetch all users to allow filtering by role
        const response = await fetch('/api/users', { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
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
  }, [token]);

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(
      (subscriber) =>
        (searchTerm === '' ||
          subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (subscriber.firstName &&
            subscriber.firstName
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (subscriber.lastName &&
            subscriber.lastName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))) &&
        (selectedRole === '' || subscriber.role === selectedRole),
    );
  }, [subscribers, searchTerm, selectedRole]);

  const handleUpdateUser = (updatedUser: User) => {
    setSubscribers(
      subscribers.map((user) =>
        user._id === updatedUser._id ? updatedUser : user,
      ),
    );
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      )
    ) {
      try {
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to delete user');
        }

        setSubscribers(subscribers.filter((user) => user._id !== userId));
      } catch (error) {
        console.error(error);
        alert("Erreur lors de la suppression de l'utilisateur");
      }
    }
  };

  if (loading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  if (error) {
    return <div className="text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestion des Utilisateurs</h2>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher par email, nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">Tous les rôles</option>
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-4 border-b text-left">Email</th>
              <th className="py-2 px-4 border-b text-left">Nom</th>
              <th className="py-2 px-4 border-b text-left">Rôle</th>
              <th className="py-2 px-4 border-b text-left">Crédits MC</th>
              <th className="py-2 px-4 border-b text-left">Crédits PharmIA</th>
              <th className="py-2 px-4 border-b text-left">Valide jusqu'au</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id}>
                  <td className="py-2 px-4 border-b">{subscriber.email}</td>
                  <td className="py-2 px-4 border-b">
                    {subscriber.firstName} {subscriber.lastName}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {subscriber.role}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b font-bold text-teal-600">
                    {subscriber.masterClassCredits || 0}
                  </td>
                  <td className="py-2 px-4 border-b font-bold text-blue-600">
                    {subscriber.pharmiaCredits || 0}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {subscriber.subscriptionEndDate
                      ? new Date(
                          subscriber.subscriptionEndDate,
                        ).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="py-2 px-4 border-b flex space-x-2">
                    <button
                      onClick={() => setSelectedUser(subscriber)}
                      className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteUser(subscriber._id as string)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-4 px-4 border-b text-center text-gray-500"
                >
                  Aucun utilisateur ne correspond aux filtres actuels.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedUser && (
        <EditSubscriptionModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdateUser}
        />
      )}
    </div>
  );
};

export default SubscriberManager;
