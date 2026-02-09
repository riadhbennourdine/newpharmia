import React, { useState, useEffect, useRef } from 'react';
import { Group, User, UserRole, CaseStudy } from '../../types';
import { useAuth } from '../hooks/useAuth';

interface GroupManagementModalProps {
  group?: Group & { subscriptionEndDate?: Date }; // Keep this interface, but the modal itself won't use subscriptionEndDate directly
  onClose: () => void;
  fetchGroups: () => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  group,
  onClose,
  fetchGroups,
}) => {
  const { user: currentUser, token } = useAuth();
  const [name, setName] = useState(group?.name || '');
  const [pharmacistIds, setPharmacistIds] = useState<string[]>(
    group?.pharmacistIds?.map((id) => id.toString()) || [],
  );
  const [preparatorIds, setPreparatorIds] = useState<string[]>(
    group?.preparatorIds?.map((id) => id.toString()) || [],
  );
  const [subscriptionAmount, setSubscriptionAmount] = useState<
    number | undefined
  >(group?.subscriptionAmount);
  const [managedBy, setManagedBy] = useState<string | undefined>(
    group?.managedBy?.toString(),
  );
  const [primaryMemoFicheId, setPrimaryMemoFicheId] = useState<
    string | undefined
  >(group?.primaryMemoFicheId);
  const [instructionFiches, setInstructionFiches] = useState<string[]>(
    group?.instructionFiches || [],
  );

  const [allPharmacists, setAllPharmacists] = useState<User[]>([]);
  const [allPreparators, setAllPreparators] = useState<User[]>([]);
  const [allManagers, setAllManagers] = useState<User[]>([]);
  const [allMemofiches, setAllMemofiches] = useState<CaseStudy[]>([]);
  const [suggestedPreparators, setSuggestedPreparators] = useState<User[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [pharmacistSearchTerm, setPharmacistSearchTerm] = useState('');

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // No formatDateForInput, subscriptionEndDate state, or useEffects related to subscriptionEndDate input

  useEffect(() => {
    if (token) {
      fetchAllMemofiches();
      fetchManagers();
    }

    // Initialize memo fiche states from group prop
    if (group) {
      setPrimaryMemoFicheId(group.primaryMemoFicheId);
      setInstructionFiches(group.instructionFiches || []);
    }
  }, [group, token]);

  useEffect(() => {
    if (token) {
      fetchPharmacists(pharmacistSearchTerm);
    }
  }, [pharmacistSearchTerm, token]);

  useEffect(() => {
    if (token) {
      fetchPreparators(searchTerm);
    }
  }, [searchTerm, token]);

  const fetchSuggestedPreparators = async (pharmacistId: string) => {
    try {
      const response = await fetch(
        `/api/users/pharmacists/${pharmacistId}/preparators`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        setSuggestedPreparators(await response.json());
      } else {
        console.error('Failed to fetch suggested preparators');
      }
    } catch (error) {
      console.error('Error fetching suggested preparators:', error);
    }
  };

  const fetchAllMemofiches = async () => {
    try {
      const response = await fetch('/api/memofiches/all', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setAllMemofiches(await response.json());
      } else {
        console.error('Failed to fetch memofiches');
        setAllMemofiches([]);
      }
    } catch (error) {
      console.error('Error fetching all memofiches:', error);
      setAllMemofiches([]);
    }
  };

  const fetchPharmacists = async (currentSearchTerm: string) => {
    try {
      const url = currentSearchTerm
        ? `/api/users/pharmacists?searchTerm=${encodeURIComponent(currentSearchTerm)}`
        : '/api/users/pharmacists';
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setAllPharmacists(await response.json());
      } else {
        console.error('Failed to fetch pharmacists');
        setAllPharmacists([]);
      }
    } catch (error) {
      console.error('Error fetching pharmacists:', error);
      setAllPharmacists([]);
    }
  };

  const fetchPreparators = async (currentSearchTerm: string) => {
    try {
      const url = currentSearchTerm
        ? `/api/users/preparateurs?searchTerm=${encodeURIComponent(currentSearchTerm)}`
        : '/api/users/preparateurs';
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setAllPreparators(await response.json());
      } else {
        console.error('Failed to fetch preparators');
        setAllPreparators([]);
      }
    } catch (error) {
      console.error('Error fetching preparators:', error);
      setAllPreparators([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users/managers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setAllManagers(await response.json());
      } else {
        console.error('Failed to fetch managers');
        setAllManagers([]);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
      setAllManagers([]);
    }
  };

  const handlePreparatorToggle = (preparatorId: string) => {
    setPreparatorIds((prev) =>
      prev.includes(preparatorId)
        ? prev.filter((id) => id !== preparatorId)
        : [...prev, preparatorId],
    );
  };

  const handlePharmacistToggle = (id: string) => {
    setPharmacistIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const groupData = {
      name,
      pharmacistIds,
      preparatorIds,
      subscriptionAmount,
      managedBy,
      primaryMemoFicheId: primaryMemoFicheId || null,
      instructionFiches: instructionFiches,
    };

    try {
      const url = group
        ? `/api/admin/groups/${group._id}`
        : '/api/admin/groups';
      const method = group ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(groupData),
      });

      if (response.ok) {
        fetchGroups();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Une erreur est survenue lors de la sauvegarde du groupe.');
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPreparators(value);
    }, 300); // Debounce for 300ms
  };

  const handlePharmacistSearchTermChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setPharmacistSearchTerm(value);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPharmacists(value);
    }, 300); // Debounce for 300ms
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          {group ? 'Modifier le Groupe' : 'Créer un Groupe'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700"
            >
              Nom du Groupe
            </label>
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
            <label
              htmlFor="managedBy"
              className="block text-sm font-medium text-slate-700"
            >
              Manager du Groupe
            </label>
            <select
              id="managedBy"
              value={managedBy || ''}
              onChange={(e) => setManagedBy(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">-- Sélectionner un manager --</option>
              {allManagers.map((manager) => (
                <option
                  key={manager._id as string}
                  value={manager._id as string}
                >
                  {manager.firstName} {manager.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Removed subscriptionEndDate input field and related logic */}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Pharmaciens Responsables
            </label>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={pharmacistSearchTerm}
              onChange={handlePharmacistSearchTermChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-2"
            />
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded-md">
              {allPharmacists.map((p) => (
                <div key={p._id as string} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`pharmacist-${p._id}`}
                    checked={pharmacistIds.includes(p._id as string)}
                    onChange={() => handlePharmacistToggle(p._id as string)}
                    className="h-4 w-4 text-teal-600 border-gray-300 rounded-md focus:ring-teal-500"
                  />
                  <label
                    htmlFor={`pharmacist-${p._id}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {p.firstName} {p.lastName}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {suggestedPreparators.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mt-4">
                Préparateurs Suggérés (liés au pharmacien principal)
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-md bg-teal-50 border-teal-200">
                {suggestedPreparators.map((p) => (
                  <div key={`suggested-${p._id}`} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`preparator-${p._id}`}
                      checked={preparatorIds.includes(p._id as string)}
                      onChange={() => handlePreparatorToggle(p._id as string)}
                      className="h-4 w-4 text-teal-600 border-gray-300 rounded-md focus:ring-teal-500"
                    />
                    <label
                      htmlFor={`preparator-${p._id}`}
                      className="ml-2 block text-sm text-gray-900"
                    >
                      {p.firstName} {p.lastName}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Préparateurs (recherche manuelle)
            </label>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={handleSearchTermChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-2"
            />
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded-md">
              {allPreparators.map((p) => (
                <div key={p._id as string} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`preparator-${p._id}`}
                    checked={preparatorIds.includes(p._id as string)}
                    onChange={() => handlePreparatorToggle(p._id as string)}
                    className="h-4 w-4 text-teal-600 border-gray-300 rounded-md focus:ring-teal-500"
                  />
                  <label
                    htmlFor={`preparator-${p._id}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {p.firstName} {p.lastName}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="subscriptionAmount"
              className="block text-sm font-medium text-slate-700"
            >
              Montant de l'abonnement
            </label>
            <input
              type="number"
              id="subscriptionAmount"
              value={subscriptionAmount || ''}
              onChange={(e) =>
                setSubscriptionAmount(parseFloat(e.target.value))
              }
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Opération effectuée par :{' '}
                <span className="font-medium text-slate-800">
                  {currentUser?.firstName} {currentUser?.lastName}
                </span>
              </div>
              <div className="flex justify-end space-x-4">
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
