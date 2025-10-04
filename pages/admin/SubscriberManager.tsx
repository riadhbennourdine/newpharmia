import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../../types';

const SubscriberManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchSubscribers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/users/pharmacists');
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
            </tr>
            </thead>
            <tbody>
            {filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id}>
                <td className="py-2 px-4 border-b">{subscriber.email}</td>
                <td className="py-2 px-4 border-b">{subscriber.firstName} {subscriber.lastName}</td>
                <td className="py-2 px-4 border-b">{subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 px-4 border-b text-center text-gray-500">
                  Aucun abonné ne correspond aux filtres actuels.
                </td>
              </tr>
            )}
            </tbody>
        </table>
       </div>
    </div>
  );
};

export default SubscriberManager;