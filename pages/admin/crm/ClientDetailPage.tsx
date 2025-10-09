import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ClientStatus, Appointment } from '../../../types';

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<User | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ClientStatus | undefined>(undefined);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [clientRes, teamRes, appointmentsRes] = await Promise.all([
          fetch(`/api/admin/crm/clients/${id}`),
          fetch(`/api/users/pharmacists/${id}/team`),
          fetch(`/api/admin/crm/clients/${id}/appointments`)
        ]);

        if (!clientRes.ok) throw new Error('Failed to fetch client details');
        const clientData = await clientRes.json();
        setClient(clientData);
        setNotes(clientData.notes || '');
        setStatus(clientData.status);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeam(teamData);
        }

        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          setAppointments(appointmentsData);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAllData();
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
      navigate('/admin/crm/clients');
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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
          <div>
            <p><strong>Plan d'abonnement:</strong> {client.planName || 'N/A'}</p>
            <p><strong>Date d'expiration:</strong> {client.subscriptionEndDate ? new Date(client.subscriptionEndDate).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <p><strong>Assigné à:</strong> {client.assignedTo || 'N/A'}</p>
        
        <div>
          <h2 className="text-xl font-bold mt-6 mb-2">Équipe de préparateurs</h2>
          {team.length > 0 ? (
            <ul className="list-disc list-inside">
              {team.map(member => (
                <li key={member._id}>{member.firstName} {member.lastName} ({member.email})</li>
              ))}
            </ul>
          ) : (
            <p>Aucun préparateur dans l'équipe.</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mt-6 mb-2">Rendez-vous</h2>
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map(app => (
                <div key={app._id} className="p-4 border rounded-md">
                  <p className="font-bold">{app.title} - {new Date(app.date).toLocaleString()}</p>
                  <p className="mt-2">{app.notes || 'Aucune note pour ce rendez-vous.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Aucun rendez-vous pour ce client.</p>
          )}
        </div>

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