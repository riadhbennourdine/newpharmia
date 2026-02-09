import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const AdminResetPasswordPage: React.FC = () => {
  const { user, token } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Veuillez entrer une adresse email.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setNewPassword(null);

    try {
      const response = await fetch('/api/users/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue.');
      }

      setSuccessMessage(data.message);
      setNewPassword(data.newPassword);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Une erreur réseau est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-4 text-center text-red-500">Accès non autorisé.</div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Réinitialiser le mot de passe d'un utilisateur
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email de l'utilisateur
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utilisateur@exemple.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400"
        >
          {isLoading
            ? 'Réinitialisation en cours...'
            : 'Réinitialiser le mot de passe'}
        </button>
      </form>
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
          {error}
        </div>
      )}
      {successMessage && newPassword && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 border border-green-300 rounded-md">
          <p>{successMessage}</p>
          <p className="font-bold mt-2">
            Nouveau mot de passe :{' '}
            <code className="bg-gray-200 text-black px-2 py-1 rounded">
              {newPassword}
            </code>
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminResetPasswordPage;
