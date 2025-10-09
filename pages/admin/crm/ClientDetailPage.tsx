import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ClientStatus } from '../../../types';

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ClientStatus | undefined>(undefined);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/admin/crm/clients/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }
        const data = await response.json();
        setClient(data);
        setNotes(data.notes || '');
        setStatus(data.status);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id]);

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`/api/admin/crm/clients/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes, status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      alert('Modifications enregistrées avec succès!');
      navigate('/admin/crm');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6">Chargement du client...</div>;
  if (error) return <div className="p-6 text-red-500">Erreur: {error}</div>;
  if (!client) return <div className="p-6">Client non trouvé.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{client.firstName} {client.lastName}</h1>
      <div className="space-y-4">
        <p><strong>Email:</strong> {client.email}</p>
        <p><strong>Société:</strong> {client.companyName || 'N/A'}</p>
        
        <div className="max-w-sm">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Statut</label>
          <select
            id="status"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus)}
          >
            {Object.values(ClientStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <p><strong>Assigné à:</strong> {client.assignedTo || 'N/A'}</p>
        
        <div>
          <h2 className="text-xl font-bold mt-6 mb-2">Notes</h2>
          <textarea
            className="w-full p-2 border rounded"
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button 
          onClick={handleSaveChanges}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
};

export default ClientDetailPage;