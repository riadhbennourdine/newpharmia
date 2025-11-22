
import React, { useState, useEffect } from 'react';
import { Group, CaseStudy, User, UserRole } from '../types'; // Added User and UserRole

interface AssignFicheModalProps {
  fiche: CaseStudy;
  onClose: () => void;
}

const AssignFicheModal: React.FC<AssignFicheModalProps> = ({ fiche, onClose }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pharmacists, setPharmacists] = useState<User[]>([]); // New state for pharmacists
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedPharmacistId, setSelectedPharmacistId] = useState<string>(''); // New state for selected pharmacist
  const [assignmentType, setAssignmentType] = useState<'group' | 'pharmacist'>('group'); // New state for assignment type

  useEffect(() => {
    fetchGroups();
    fetchPharmacists(); // Fetch pharmacists on component mount
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

  const fetchPharmacists = async () => {
    try {
      // Assuming an API endpoint to get all pharmacists
      const response = await fetch(`/api/admin/users?role=${UserRole.PHARMACIEN}`);
      const data = await response.json();
      setPharmacists(data);
    } catch (error) {
      console.error('Error fetching pharmacists:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let apiUrl = '';
    let bodyData: any = { ficheId: fiche._id };

    if (assignmentType === 'group') {
      if (!selectedGroupId) {
        alert('Veuillez sélectionner un groupe.');
        return;
      }
      apiUrl = `/api/admin/groups/${selectedGroupId}/assign-fiche`;
    } else { // assignmentType === 'pharmacist'
      if (!selectedPharmacistId) {
        alert('Veuillez sélectionner un pharmacien.');
        return;
      }
      apiUrl = `/api/admin/users/${selectedPharmacistId}/assign-fiche`;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

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
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Assigner "{fiche.title}"</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type d'assignation</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="assignmentType"
                  value="group"
                  checked={assignmentType === 'group'}
                  onChange={() => setAssignmentType('group')}
                />
                <span className="ml-2 text-slate-700">Groupe</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="assignmentType"
                  value="pharmacist"
                  checked={assignmentType === 'pharmacist'}
                  onChange={() => setAssignmentType('pharmacist')}
                />
                <span className="ml-2 text-slate-700">Pharmacien</span>
              </label>
            </div>
          </div>

          {assignmentType === 'group' ? (
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-slate-700">Groupe</label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Sélectionner un groupe</option>
                {groups.map(g => (
                  <option key={g._id as string} value={g._id as string}>{g.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="pharmacist" className="block text-sm font-medium text-slate-700">Pharmacien</label>
              <select
                id="pharmacist"
                value={selectedPharmacistId}
                onChange={(e) => setSelectedPharmacistId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Sélectionner un pharmacien</option>
                {pharmacists.map(p => (
                  <option key={p._id as string} value={p._id as string}>{p.firstName} {p.lastName} ({p.email})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700">
              Assigner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignFicheModal;
