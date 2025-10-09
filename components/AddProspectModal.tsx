import React, { useState } from 'react';
import { ClientStatus, UserRole } from '../../types';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProspect: (prospect: { email: string; firstName: string; lastName: string; companyName: string }) => void;
}

const AddProspectModal: React.FC<AddProspectModalProps> = ({ isOpen, onClose, onAddProspect }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !firstName || !lastName) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    onAddProspect({ email, firstName, lastName, companyName });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Ajouter un prospect</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Société (Pharmacie)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md">Ajouter</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProspectModal;
