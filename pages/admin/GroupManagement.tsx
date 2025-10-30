
import React, { useState, useEffect } from 'react';
import { Group, User, UserRole } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/Icons';
import GroupManagementModal from '../../components/GroupManagementModal';

const GroupManagementPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupedGroups, setGroupedGroups] = useState<Record<string, Group[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(undefined);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      const data: Group[] = await response.json();
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
      setGroupedGroups(grouped);

    } catch (error) {
      console.error('Error fetching groups:', error);
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Groupe</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacien</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type d'abonnement</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin abonnement</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
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
                  <td colSpan={7} className="px-6 py-3 text-left text-sm font-bold text-gray-700">{groupKey}</td>
                </tr>
                {groups.map((group) => (
                  <tr key={group._id as string}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistPlanName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.pharmacistSubscriptionEndDate ? new Date(group.pharmacistSubscriptionEndDate).toLocaleDateString('fr-FR') : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${group.pharmacistHasActiveSubscription ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {group.pharmacistHasActiveSubscription ? 'Actif' : 'Expiré'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.preparatorIds.length}</td>
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

      {isModalOpen && (
        <GroupManagementModal
          group={selectedGroup}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default GroupManagementPage;
