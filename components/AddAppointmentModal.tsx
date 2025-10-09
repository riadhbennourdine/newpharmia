import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: (appointment: { clientId: string; clientName: string; date: string; title: string }) => void;
}

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({ isOpen, onClose, onAddAppointment }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch clients and prospects to populate the dropdown
      const fetchClients = async () => {
        try {
          const response = await fetch('/api/admin/crm/clients');
          const data = await response.json();
          setClients(data);
        } catch (err) {
          console.error('Failed to fetch clients for modal', err);
        }
      };
      fetchClients();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !date || !title) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    const selectedClient = clients.find(c => c._id === selectedClientId);
    if (!selectedClient) {
        setError('Client non valide.');
        return;
    }

    onAddAppointment({
      clientId: selectedClientId,
      clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
      date,
      title,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Planifier un rendez-vous</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Client / Prospect</label>
            <select 
              className="w-full px-3 py-2 border rounded-md"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            >
              <option value="" disabled>Sélectionnez un client</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.firstName} {client.lastName} ({client.email})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Titre du rendez-vous</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Date et heure</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md">Planifier</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAppointmentModal;
