import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ClientStatus, Appointment } from '../../../types';
import AddAppointmentModal from '../../../components/AddAppointmentModal';
import AddNoteModal from '../../../components/AddNoteModal';

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
  const [objectifs, setObjectifs] = useState('');
  const [CA, setCA] = useState<number | undefined>(undefined);
  const [zone, setZone] = useState<string | undefined>(undefined);
  const [secteur, setSecteur] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<ClientStatus | undefined>(undefined);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!selectedFile || !client) return;

    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file');
        }

        const uploadResult = await uploadResponse.json();
        const { fileUrl } = uploadResult;

        const submitResponse = await fetch(`/api/admin/crm/clients/${client._id}/payment-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl }),
        });

        if (!submitResponse.ok) {
            throw new Error('Failed to submit payment proof');
        }

        alert('Pièce justificative téléversée avec succès!');
        setClient(prevClient => prevClient ? { ...prevClient, paymentProofUrl: fileUrl } : null);
        setSelectedFile(null);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleAddAppointment = async (appointment: { clientId: string; clientName: string; date: string; title: string; notes: string }) => {
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

  const handleActivateSubscription = async () => {
    if (!client) return;

    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

    try {
      const response = await fetch(`/api/users/${client._id}/subscription`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            subscriptionEndDate: subscriptionEndDate.toISOString(),
            planName: 'Premium',
            hasActiveSubscription: true,
            status: ClientStatus.ACTIVE_CLIENT
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to activate subscription');
      }

      alert('Abonnement activé avec succès!');
      // Refetch client data to update the UI
      const clientRes = await fetch(`/api/admin/crm/clients/${id}`);
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClient(clientData);
        setStatus(clientData.status);
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

  const openNoteModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (notes: string) => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(`/api/admin/crm/appointments/${selectedAppointment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      setIsNoteModalOpen(false);
      // Refetch appointments to show the updated note
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
        setObjectifs(clientData.objectifs || '');
        setCA(clientData.CA || undefined);
        setZone(clientData.zone || undefined);
        setSecteur(clientData.secteur || undefined);
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
          body: JSON.stringify({ notes, status, objectifs, CA, zone, secteur }),
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-4xl font-bold text-teal-600">{client.firstName} {client.lastName}</h1>
                {client.city && <p className="text-base text-gray-700">{client.city}</p>}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-teal-600 mb-4">Informations</h3>
              <div className="space-y-3">
                <p><strong>Email:</strong> {client.email}</p>
                {client.companyName && client.companyName !== 'N/A' && <p><strong>Société:</strong> {client.companyName}</p>}
                {client.zone && <p><strong>Zone:</strong> {client.zone}</p>}
                {client.secteur && <p><strong>Secteur:</strong> {client.secteur}</p>}
                <hr />
                <p><strong>Plan d'abonnement:</strong> {client.planName || 'N/A'}</p>
                <p><strong>Date d'expiration:</strong> {client.subscriptionEndDate ? new Date(client.subscriptionEndDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                >
                  + Planifier un RDV
                </button>
                {client.status === ClientStatus.PROSPECT && (
                  <button 
                    onClick={handleActivateSubscription}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Activer l'abonnement
                  </button>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-teal-600 mb-4">Pièce justificative de paiement</h3>
                {client.paymentProofUrl ? (
                    <div className="mb-4">
                        <a href={client.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                            Voir la pièce justificative actuelle
                        </a>
                    </div>
                ) : (
                  <p className='text-sm text-gray-500 mb-4'>Aucune pièce n'a été téléversée</p>
                )}
                <div>
                    <input type="file" onChange={handleFileChange} className="mb-2" />
                    <button
                        onClick={handleUploadPaymentProof}
                        disabled={!selectedFile || isUploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {isUploading ? 'Téléversement...' : 'Uploader'}
                    </button>
                    {selectedFile && <p className="text-sm text-gray-500 mt-2">Fichier séléctionné: {selectedFile.name}</p>}
                </div>
            </div>
  
            <div className="bg-white p-6 rounded-lg shadow-md">
              <label htmlFor="secteur" className="block text-lg font-bold text-teal-600 mb-2">Secteur</label>
              <input
                type="text"
                id="secteur"
                name="secteur"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                value={secteur}
                onChange={(e) => setSecteur(e.target.value)}
              />
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <label htmlFor="zone" className="block text-lg font-bold text-teal-600 mb-2">Zone</label>
              <input
                type="text"
                id="zone"
                name="zone"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <label htmlFor="ca" className="block text-lg font-bold text-teal-600 mb-2">Chiffre d'Affaires</label>
              <input
                type="number"
                id="ca"
                name="ca"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                value={CA}
                onChange={(e) => setCA(Number(e.target.value))}
              />
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
              <h3 className="text-xl font-bold text-teal-600 mb-4">Objectifs</h3>
              <textarea
                className="w-full p-2 border rounded-md h-40"
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
              />
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
                    <div key={app._id} className="p-4 border rounded-md bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-700">{app.title}</p>
                        <p className="text-sm text-gray-500">{new Date(app.date).toLocaleString()}</p>
                      </div>
                      <button onClick={() => openNoteModal(app)} className="text-teal-600 hover:text-teal-800 font-semibold">
                        Voir le reporting
                      </button>
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
            clientId={client._id}
            clientName={`${client.firstName} ${client.lastName}`}
          />
        )}

        {selectedAppointment && (
          <AddNoteModal
            isOpen={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            onSave={handleSaveNote}
            appointment={selectedAppointment}
          />
        )}
      </div>
    );};

export default ClientDetailPage;