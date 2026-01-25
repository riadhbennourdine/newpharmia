import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';

const AssignmentManager: React.FC = () => {
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [preparateurs, setPreparateurs] = useState<User[]>([]);
  const [pharmacists, setPharmacists] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    setAssignmentLoading(true);
    try {
      const [preparateursRes, pharmacistsRes] = await Promise.all([
        fetch('/api/users/preparateurs'),
        fetch('/api/users/pharmacists'),
      ]);

      if (!preparateursRes.ok || !pharmacistsRes.ok) {
        throw new Error('Failed to fetch users');
      }

      const preparateursData = await preparateursRes.json();
      const pharmacistsData = await pharmacistsRes.json();

      setPreparateurs(preparateursData);
      setPharmacists(pharmacistsData);
    } catch (error) {
      console.error(error);
      setAssignmentFeedback({
        message: 'Erreur lors du chargement des utilisateurs.',
        type: 'error',
      });
    } finally {
      setAssignmentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAssignPharmacist = async (
    preparateurId: string,
    newPharmacistId: string,
  ) => {
    setAssignmentLoading(true);
    setAssignmentFeedback(null);

    try {
      const response = await fetch(
        `/api/users/preparateurs/${preparateurId}/assign-pharmacist`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pharmacistId: newPharmacistId }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to assign pharmacist');
      }

      setPreparateurs((prev) =>
        prev.map((p) =>
          p._id === preparateurId
            ? { ...p, pharmacistId: newPharmacistId || undefined }
            : p,
        ),
      );
      setAssignmentFeedback({
        message: 'Attribution mise à jour avec succès.',
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      setAssignmentFeedback({
        message: "Erreur lors de l'attribution du pharmacien.",
        type: 'error',
      });
    } finally {
      // Clear feedback after a few seconds
      setTimeout(() => setAssignmentFeedback(null), 3000);
      setAssignmentLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-bold text-gray-800">
          Gestion des Attributions Préparateur-Pharmacien
        </h3>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          disabled={assignmentLoading}
        >
          Actualiser
        </button>
      </div>
      <p className="text-gray-600 mb-4">
        Attribuez un pharmacien référent à chaque préparateur.
      </p>
      {assignmentFeedback && (
        <p
          className={`mb-4 text-sm font-semibold ${assignmentFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
        >
          {assignmentFeedback.message}
        </p>
      )}
      <input
        type="text"
        placeholder="Rechercher un préparateur..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base mb-4"
      />
      {assignmentLoading && preparateurs.length === 0 ? (
        <p>Chargement...</p>
      ) : preparateurs.length === 0 ? (
        <p className="text-gray-600 italic">Aucun préparateur trouvé.</p>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Préparateur
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Pharmacien Référent
                </th>
              </tr>
            </thead>
            <tbody>
              {preparateurs
                .filter((p) => {
                  const searchTermLower = searchTerm.toLowerCase();
                  return (
                    p.firstName?.toLowerCase().includes(searchTermLower) ||
                    p.lastName?.toLowerCase().includes(searchTermLower) ||
                    p.email.toLowerCase().includes(searchTermLower)
                  );
                })
                .map((prep) => (
                  <tr
                    key={prep._id}
                    className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-800 font-medium">
                      {prep.firstName} {prep.lastName}{' '}
                      <span className="text-gray-500">({prep.email})</span>
                    </td>
                    <td className="py-3 px-4 w-1/2">
                      <select
                        value={prep.pharmacistId || ''}
                        onChange={(e) =>
                          handleAssignPharmacist(prep._id, e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md w-full focus:ring-teal-500 focus:border-teal-500 bg-white"
                        disabled={assignmentLoading}
                      >
                        <option value="">-- Non attribué --</option>
                        {pharmacists.map((ph) => (
                          <option key={ph._id} value={ph._id}>
                            {ph.firstName} {ph.lastName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;
