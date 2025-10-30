import React, { useState, useEffect } from 'react';
import { Group, User, UserRole } from '../../types';

import { useAuth } from '../hooks/useAuth';

interface GroupManagementModalProps {
  group?: Group;
  onClose: () => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({ group, onClose }) => {
  const { user: currentUser } = useAuth();
  const [name, setName] = useState(group?.name || '');
  const [pharmacistId, setPharmacistId] = useState(group?.pharmacistId || '');
  const [preparatorIds, setPreparatorIds] = useState<string[]>(group?.preparatorIds as string[] || []);
  const [subscriptionAmount, setSubscriptionAmount] = useState<number | undefined>(group?.subscriptionAmount);
  const [allPharmacists, setAllPharmacists] = useState<User[]>([]);
  const [allPreparators, setAllPreparators] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPharmacists();
    fetchPreparators();
  }, []);

  const fetchPharmacists = async () => {
    try {
      const response = await fetch('/api/users/pharmacists');
      const data = await response.json();
      setAllPharmacists(data);
    } catch (error) {
      console.error('Error fetching pharmacists:', error);
    }
  };

  const fetchPreparators = async () => {
    try {
      const response = await fetch('/api/users/preparateurs');
      const data = await response.json();
      setAllPreparators(data);
    } catch (error) {
      console.error('Error fetching preparators:', error);
    }
  };

  const handlePreparatorToggle = (preparatorId: string) => {
    setPreparatorIds(prev => 
      prev.includes(preparatorId) 
        ? prev.filter(id => id !== preparatorId) 
        : [...prev, preparatorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const groupData = { name, pharmacistId, preparatorIds, subscriptionAmount };

    try {
      const url = group ? `/api/admin/groups/${group._id}` : '/api/admin/groups';
      const method = group ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });

      if (response.ok) {
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert("Une erreur est survenue lors de la sauvegarde du groupe.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">{group ? 'Modifier le Groupe' : 'Créer un Groupe'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nom du Groupe</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label htmlFor="pharmacist" className="block text-sm font-medium text-slate-700">Pharmacien Responsable</label>
            <select
              id="pharmacist"
              value={pharmacistId as string}
              onChange={(e) => setPharmacistId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            >
              <option value="">Sélectionner un pharmacien</option>
              {allPharmacists.map(p => (
                <option key={p._id as string} value={p._id as string}>{p.firstName} {p.lastName} ({p.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Préparateurs</label>
            <input
              type="text"
              placeholder="Rechercher par nom, email, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-2"
            />
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded-md">
              {allPreparators
                .filter(p => {
                  const searchTermLower = searchTerm.toLowerCase();
                  return (
                    p.firstName?.toLowerCase().includes(searchTermLower) ||
                    p.lastName?.toLowerCase().includes(searchTermLower) ||
                    p.email.toLowerCase().includes(searchTermLower) ||
                    p.city?.toLowerCase().includes(searchTermLower)
                  );
                })
                .map(p => (
                <div key={p._id as string} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`preparator-${p._id}`}
                    checked={preparatorIds.includes(p._id as string)}
                    onChange={() => handlePreparatorToggle(p._id as string)}
                    className="h-4 w-4 text-teal-600 border-gray-300 rounded-md focus:ring-teal-500"
                  />
                  <label htmlFor={`preparator-${p._id}`} className="ml-2 block text-sm text-gray-900">{p.firstName} {p.lastName} ({p.email})</label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="subscriptionAmount" className="block text-sm font-medium text-slate-700">Montant de l'abonnement</label>
            <input
              type="number"
              id="subscriptionAmount"
              value={subscriptionAmount || ''}
              onChange={(e) => setSubscriptionAmount(parseFloat(e.target.value))}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-slate-600">
                    Opération effectuée par : <span className="font-medium text-slate-800">{currentUser?.firstName} {currentUser?.lastName}</span>
                </div>
                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Annuler
                    </button>
                    <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700">
                    Sauvegarder
                    </button>
                </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupManagementModal;