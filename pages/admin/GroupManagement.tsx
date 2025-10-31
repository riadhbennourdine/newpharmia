
import React, { useState, useEffect } from 'react';
import { Group, User, UserRole } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/Icons';
import GroupManagementModal from '../../components/GroupManagementModal';

const GroupManagementPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupedGroups, setGroupedGroups] = useState<Record<string, Group[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(undefined);
  const [managers, setManagers] = useState<User[]>([]);

  useEffect(() => {
    fetchGroups();
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users/managers');
      const data = await response.json();
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      const data: Group[] = await response.json();
      console.log('Fetched groups data:', data);
      setGroups(data);

      // Grouping logic
      const grouped = data.reduce((acc, group) => {
        const plan = group.pharmacistPlanName || 'Non spécifié';
        const duration = group.pharmacistSubscriptionEndDate ? (new Date(group.pharmacistSubscriptionEndDate).getTime() > new Date().getTime() ? 'Actif' : 'Expiré') : 'N/A';
        const key = `${plan} - ${duration}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(group);
        return acc;
      }, {} as Record<string, Group[]>);
      console.log('Grouped groups:', grouped);
      setGroupedGroups(grouped);

    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleManagerChange = async (groupId: string, managerId: string) => {
    try {
      await fetch(`/api/admin/groups/${groupId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managedBy: managerId }),
        });
      fetchGroups();
    } catch (error) {
      console.error('Error updating manager:', error);
    }
  };

  const handleOpenModal = (group?: Group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedGroup(undefined);
    setIsModalOpen(false);
    fetchGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
      try {
        await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
        fetchGroups();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Gestion des Groupes</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700"
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Créer un Groupe
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Nom du Groupe</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Pharmacien</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Type d'abonnement</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin abonnement</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Géré par</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membres</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groupedGroups).map(([groupKey, groups]) => (
              <React.Fragment key={groupKey}>
                <tr className="bg-gray-100">
                  <td colSpan={8} className="px-6 py-3 text-left text-sm font-bold text-gray-700">{groupKey}</td>
                </tr>
                {groups.map((group) => (
                  <tr key={group._id as string}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistPlanName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistSubscriptionEndDate ? new Date(group.pharmacistSubscriptionEndDate).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={group.managedBy as string || ''}
                        onChange={(e) => handleManagerChange(group._id as string, e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                      >
                        <option value="">Non assigné</option>
                        {managers.map(m => (
                          <option key={m._id as string} value={m._id as string}>{m.firstName} {m.lastName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.subscriptionAmount ? `${group.subscriptionAmount.toFixed(3)} DT` : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.preparatorIds ? group.preparatorIds.length : 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(group)} className="text-teal-600 hover:text-teal-900">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDeleteGroup(group._id as string)} className="text-red-600 hover:text-red-900 ml-4">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

      {isModalOpen && (
        <GroupManagementModal
          group={selectedGroup}
          onClose={handleCloseModal}
        />
      )}
      </div>
    </div>
  );
};

export default GroupManagementPage;
