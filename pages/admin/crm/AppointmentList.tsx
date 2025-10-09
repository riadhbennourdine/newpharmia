import React, { useState, useEffect } from 'react';
import { Appointment } from '../../../types';
import AddAppointmentModal from '../../../components/AddAppointmentModal';
import AddNoteModal from '../../../components/AddNoteModal';

const AppointmentList = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/appointments');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      const data = await response.json();
      setAppointments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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

      setIsAddAppointmentModalOpen(false);
      fetchAppointments(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveNote = async (notes: string) => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(`/api/admin/crm/appointments/${selectedAppointment._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save notes');
      }

      setIsAddNoteModalOpen(false);
      fetchAppointments(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddNoteModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAddNoteModalOpen(true);
  };

  const upcomingAppointments = appointments.filter(a => new Date(a.date) > new Date());
  const pastAppointments = appointments.filter(a => new Date(a.date) <= new Date());

  if (loading) return <p>Chargement des rendez-vous...</p>;
  if (error) return <p className="text-red-500">Erreur: {error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Rendez-vous</h1>
        <button 
          onClick={() => setIsAddAppointmentModalOpen(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          + Planifier un rendez-vous
        </button>
      </div>

      <h2 className="text-xl font-bold mt-6 mb-2">Rendez-vous à venir</h2>
      {upcomingAppointments.length > 0 ? (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            {/* Table header */}
            <tbody>
              {upcomingAppointments.map(app => (
                <tr key={app._id}> 
                    <td className="py-3 px-4 text-gray-800 font-medium">{app.title}</td>
                    <td className="py-3 px-4 text-gray-600">{app.clientName}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(app.date).toLocaleString()}</td>
                    <td className="py-3 px-4"><button onClick={() => openAddNoteModal(app)} className="text-teal-600 hover:text-teal-800">Ajouter des notes</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Aucun rendez-vous à venir.</p>
      )}

      <h2 className="text-xl font-bold mt-6 mb-2">Rendez-vous passés</h2>
       {pastAppointments.length > 0 ? (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            {/* Table header */}
            <tbody>
              {pastAppointments.map(app => (
                <tr key={app._id}> 
                    <td className="py-3 px-4 text-gray-800 font-medium">{app.title}</td>
                    <td className="py-3 px-4 text-gray-600">{app.clientName}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(app.date).toLocaleString()}</td>
                    <td className="py-3 px-4"><button onClick={() => openAddNoteModal(app)} className="text-teal-600 hover:text-teal-800">Voir les notes</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Aucun rendez-vous passé.</p>
      )}

      <AddAppointmentModal 
        isOpen={isAddAppointmentModalOpen}
        onClose={() => setIsAddAppointmentModalOpen(false)}
        onAddAppointment={handleAddAppointment}
      />
      {selectedAppointment && (
        <AddNoteModal 
          isOpen={isAddNoteModalOpen}
          onClose={() => setIsAddNoteModalOpen(false)}
          onSave={handleSaveNote}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
};

export default AppointmentList;
