import React, { useState, useEffect, useMemo } from 'react';
import GroupManagementModal from '../../components/GroupManagementModal';

interface Subscriber {
  _id: string;
  email: string;
  subscribedAt: string;
  groups?: string[];
}

const SubscriberManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchMockData = async () => {
        setLoading(true);
        try {
            await new Promise(res => setTimeout(res, 500)); // Simulate loading
            const mockSubscribers: Subscriber[] = [
                { _id: 'sub1', email: 'test1@example.com', subscribedAt: new Date().toISOString(), groups: ['New Signups'] },
                { _id: 'sub2', email: 'test2@example.com', subscribedAt: new Date().toISOString(), groups: ['Pharmacists', 'Early Adopters'] },
                { _id: 'sub3', email: 'another.user@example.com', subscribedAt: new Date().toISOString(), groups: ['Pharmacists'] }
            ];
            const mockGroups = ['New Signups', 'Pharmacists', 'Early Adopters', 'Students'];
            setSubscribers(mockSubscribers);
            setAllGroups(mockGroups.sort());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchMockData();
  }, []);

  const filteredSubscribers = useMemo(() => {
    return subscribers
      .filter(subscriber => 
        groupFilter === '' || (subscriber.groups && subscriber.groups.includes(groupFilter))
      )
      .filter(subscriber => 
        searchTerm === '' || subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [subscribers, groupFilter, searchTerm]);

  const handleOpenModal = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubscriber(null);
  };

  const handleSaveGroups = async (updatedGroups: string[]) => {
    if (!selectedSubscriber) return;
    
    console.log("Saving groups (mock):", { subscriberId: selectedSubscriber._id, groups: updatedGroups });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSubscribers(subscribers.map(sub =>
        sub._id === selectedSubscriber._id ? { ...sub, groups: updatedGroups } : sub
    ));
    updatedGroups.forEach(group => {
        if (!allGroups.includes(group)) {
            setAllGroups(prev => [...prev, group].sort());
        }
    });
    handleCloseModal();
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
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white"
        >
          <option value="">Filtrer par groupe</option>
          {allGroups.map(group => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
            <tr>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Date d'abonnement</th>
                <th className="py-2 px-4 border-b text-left">Groupes</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
            </thead>
            <tbody>
            {filteredSubscribers.length > 0 ? (
              filteredSubscribers.map((subscriber) => (
                <tr key={subscriber._id}>
                <td className="py-2 px-4 border-b">{subscriber.email}</td>
                <td className="py-2 px-4 border-b">{new Date(subscriber.subscribedAt).toLocaleDateString()}</td>
                <td className="py-2 px-4 border-b">{subscriber.groups?.join(', ') || 'Aucun'}</td>
                <td className="py-2 px-4 border-b">
                    <button onClick={() => handleOpenModal(subscriber)} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded">
                    Gérer les groupes
                    </button>
                </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 px-4 border-b text-center text-gray-500">
                  Aucun abonné ne correspond aux filtres actuels.
                </td>
              </tr>
            )}
            </tbody>
        </table>
       </div>
      {isModalOpen && selectedSubscriber && (
        <GroupManagementModal
          subscriber={selectedSubscriber}
          allGroups={allGroups}
          onClose={handleCloseModal}
          onSave={handleSaveGroups}
        />
      )}
    </div>
  );
};

export default SubscriberManager;