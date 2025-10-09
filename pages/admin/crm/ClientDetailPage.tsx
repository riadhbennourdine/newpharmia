import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ClientStatus, Appointment } from '../../../types';
import AddAppointmentModal from '../../../components/AddAppointmentModal';

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
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const handleAddAppointment = async (appointment: { clientId: string; clientName: string; date: string; title: string }) => {
    try {
      const response = await fetch('/api/admin/crm/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointment),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add appointment');
      }

      setIsAppointmentModalOpen(false);
      // refetch appointments
      const appointmentsRes = await fetch(`/api/admin/crm/clients/${id}/appointments`);
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData);
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

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
      <div className="p-6 bg-gray-50 min-h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center mb-6">
          <div className="lg:col-span-2">
            <h1 className="text-5xl font-bold text-teal-600">{client.firstName} {client.lastName}</h1>
          </div>
          <div className="lg:col-span-1 flex justify-end">
            <button 
              onClick={() => setIsAppointmentModalOpen(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
            >
              + Planifier un RDV
            </button>
          </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-teal-600 mb-4">Informations</h3>
              <div className="space-y-3">
                <p><strong>Email:</strong> {client.email}</p>
                {client.companyName && client.companyName !== 'N/A' && <p><strong>Société:</strong> {client.companyName}</p>}
                <hr />
                <p><strong>Plan d'abonnement:</strong> {client.planName || 'N/A'}</p>
                <p><strong>Date d'expiration:</strong> {client.subscriptionEndDate ? new Date(client.subscriptionEndDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
  
            <div className="bg-white p-6 rounded-lg shadow-md">
              <label htmlFor="status" className="block text-lg font-bold text-teal-600 mb-2">Statut</label>
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
  
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-teal-600 mb-4">Notes Générales</h3>
              <textarea
                className="w-full p-2 border rounded-md h-40"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
  
            <button 
              onClick={handleSaveChanges}
              className="w-full px-4 py-3 bg-teal-600 text-white font-bold rounded-md hover:bg-teal-700 transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
  
          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-teal-600 mb-4">Équipe de préparateurs</h3>
              {team.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {team.map(member => (
                    <li key={member._id}>{member.firstName} {member.lastName} ({member.email})</li>
                  ))}
                </ul>
              ) : (
                <p>Aucun préparateur dans l'équipe.</p>
              )}
            </div>
  
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-teal-600 mb-4">Historique des rendez-vous</h3>
              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map(app => (
                    <div key={app._id} className="p-4 border rounded-md bg-gray-50">
                      <p className="font-bold text-gray-700">{app.title} - {new Date(app.date).toLocaleString()}</p>
                      <p className="mt-2 text-sm text-gray-600">{app.notes || 'Aucune note pour ce rendez-vous.'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Aucun rendez-vous pour ce client.</p>
              )}
            </div>
          </div>
        </div>
  
        {client && (
          <AddAppointmentModal 
            isOpen={isAppointmentModalOpen}
            onClose={() => setIsAppointmentModalOpen(false)}
            onAddAppointment={handleAddAppointment}
          />
        )}
      </div>
    );};

export default ClientDetailPage;