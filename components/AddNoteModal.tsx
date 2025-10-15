import React, { useState, useEffect } from 'react';
import { Appointment } from '../../types';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  appointment: Appointment;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave, appointment }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
    }
  }, [appointment]);

  const handleSave = () => {
    onSave(notes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Notes pour le rendez-vous</h2>
        <p className="mb-2"><strong>Client:</strong> {appointment.clientName}</p>
        <p className="mb-4"><strong>Date:</strong> {new Date(appointment.date).toLocaleString()}</p>
        <textarea
          className="w-full p-2 border rounded-md"
          rows={8}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Écrivez vos notes ici..."
        />
        <div className="flex justify-end space-x-4 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Annuler</button>
          <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded-md">Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

export default AddNoteModal;