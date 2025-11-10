
import React, { useState, useEffect } from 'react';
import { Group, User, UserRole } from '../../types';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/Icons';
import GroupManagementModal from '../../components/GroupManagementModal';

const GroupManagementPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(undefined);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      const data = await response.json();
      setGroups(data);
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

  const pharmacistOnlyGroups = groups.filter(group => 
    (group.pharmacistIds?.length || 0) > 0 && (group.preparatorIds?.length || 0) === 0
  );

  const mixedGroups = groups.filter(group => 
    (group.pharmacistIds?.length || 0) > 0 && (group.preparatorIds?.length || 0) > 0
  );

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

      {pharmacistOnlyGroups.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">Groupes de pharmaciens seuls</h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Groupe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membres</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pharmacistOnlyGroups.map((group) => (
                  <tr key={group._id as string}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(group.pharmacistIds?.length || 0) + (group.preparatorIds?.length || 0)}
                    </td>
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
              </tbody>
            </table>
          </div>
        </>
      )}

      {mixedGroups.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">Groupes pharmaciens + préparateurs</h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Groupe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membres</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mixedGroups.map((group) => (
                  <tr key={group._id as string}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(group.pharmacistIds?.length || 0) + (group.preparatorIds?.length || 0)}
                    </td>
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
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <GroupManagementModal
          group={selectedGroup}
          onClose={handleCloseModal}
          fetchGroups={fetchGroups}
        />
      )}
    </div>
  );
};

export default GroupManagementPage;
