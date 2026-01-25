import React, { useState, useEffect } from 'react';
import { Group, CaseStudy } from '../types';

interface AssignFicheToGroupModalProps {
  fiche: CaseStudy;
  onClose: () => void;
}

const AssignFicheToGroupModal: React.FC<AssignFicheToGroupModalProps> = ({
  fiche,
  onClose,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) {
      alert('Veuillez sélectionner un groupe.');
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/groups/${selectedGroupId}/assign-fiche`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ficheId: fiche._id }),
        },
      );

      if (response.ok) {
        alert('Mémofiche assignée avec succès.');
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error assigning fiche:', error);
      alert("Une erreur est survenue lors de l'assignation de la mémofiche.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Assigner "{fiche.title}"
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="group"
              className="block text-sm font-medium text-slate-700"
            >
              Groupe
            </label>
            <select
              id="group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            >
              <option value="">Sélectionner un groupe</option>
              {groups.map((g) => (
                <option key={g._id as string} value={g._id as string}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700"
            >
              Assigner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFicheToGroupModal;
