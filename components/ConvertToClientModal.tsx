import React, { useState } from 'react';

interface ConvertToClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onConversionSuccess: () => void;
}

const ConvertToClientModal: React.FC<ConvertToClientModalProps> = ({
  isOpen,
  onClose,
  userId,
  onConversionSuccess,
}) => {
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [planName, setPlanName] = useState('Standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionEndDate: new Date(subscriptionEndDate).toISOString(),
          planName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la conversion du prospect en client.');
      }

      alert('Prospect converti en client avec succès !');
      onConversionSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      alert(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Convertir en Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subscriptionEndDate" className="block text-sm font-medium text-slate-700">Date de fin d'abonnement</label>
            <input
              type="date"
              id="subscriptionEndDate"
              value={subscriptionEndDate}
              onChange={(e) => setSubscriptionEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label htmlFor="planName" className="block text-sm font-medium text-slate-700">Nom du plan</label>
            <input
              type="text"
              id="planName"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Conversion...' : 'Convertir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertToClientModal;