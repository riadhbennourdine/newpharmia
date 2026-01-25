import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../../types';
import { useNavigate } from 'react-router-dom';
import ConvertToClientModal from '../../../components/ConvertToClientModal';

const ProspectList = () => {
  const [prospects, setProspects] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/prospects');
      if (!response.ok) {
        throw new Error('Failed to fetch prospects');
      }
      const data = await response.json();
      setProspects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const handleViewClient = (clientId: string) => {
    navigate(`/admin/crm/clients/${clientId}`);
  };

  const handleOpenConvertModal = (userId: string) => {
    setSelectedProspectId(userId);
    setIsModalOpen(true);
  };

  const handleCloseConvertModal = () => {
    setIsModalOpen(false);
    setSelectedProspectId(null);
  };

  const handleConversionSuccess = () => {
    fetchProspects(); // Refresh the list after successful conversion
  };

  const filteredProspects = useMemo(() => {
    if (!searchTerm) {
      return prospects;
    }
    return prospects.filter(
      (prospect) =>
        `${prospect.firstName} ${prospect.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prospect.companyName &&
          prospect.companyName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (prospect.city &&
          prospect.city.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [prospects, searchTerm]);

  if (loading) return <p>Chargement des prospects...</p>;
  if (error) return <p className="text-red-500">Erreur: {error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Prospects</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom, email, société, ville..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {prospects.length > 0 && filteredProspects.length === 0 ? (
        <p>Aucun prospect ne correspond à votre recherche.</p>
      ) : prospects.length === 0 ? (
        <p>Aucun prospect trouvé.</p>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Nom
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Société
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Ville
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProspects.map((prospect) => (
                <tr
                  key={prospect._id}
                  className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-gray-800 font-medium">
                    {prospect.firstName} {prospect.lastName}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{prospect.email}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {prospect.companyName || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {prospect.city || 'N/A'}
                  </td>
                  <td className="py-3 px-4 flex space-x-2">
                    <button
                      onClick={() => handleViewClient(prospect._id)}
                      className="text-teal-600 hover:text-teal-800 text-sm"
                    >
                      Voir la fiche
                    </button>
                    <button
                      onClick={() =>
                        handleOpenConvertModal(prospect._id as string)
                      }
                      className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                    >
                      Convertir en Client
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && selectedProspectId && (
        <ConvertToClientModal
          isOpen={isModalOpen}
          onClose={handleCloseConvertModal}
          userId={selectedProspectId}
          onConversionSuccess={handleConversionSuccess}
        />
      )}
    </div>
  );
};

export default ProspectList;
