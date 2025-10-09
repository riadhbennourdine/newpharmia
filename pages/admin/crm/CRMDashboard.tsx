import React, { useState, useEffect } from 'react';
import { User, ClientStatus } from '../../types';

const CRMDashboard = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/crm/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        const data = await response.json();
        setClients(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const renderClientTable = () => {
    if (loading) return <p>Chargement des clients...</p>;
    if (error) return <p className="text-red-500">Erreur: {error}</p>;
    if (clients.length === 0) return <p>Aucun client trouvé.</p>;

    return (
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Statut</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Assigné à</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client._id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-800 font-medium">{client.firstName} {client.lastName}</td>
                <td className="py-3 px-4 text-gray-600">{client.email}</td>
                <td className="py-3 px-4 text-gray-600">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${client.status === ClientStatus.ACTIVE_CLIENT ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {client.status || 'N/A'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{client.assignedTo || 'Non assigné'}</td>
                <td className="py-3 px-4">
                  <button className="text-teal-600 hover:text-teal-800">Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">CRM - Clients Pharmaciens</h1>
        <button className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
          + Ajouter un prospect
        </button>
      </div>
      {renderClientTable()}
    </div>
  );
};

export default CRMDashboard;