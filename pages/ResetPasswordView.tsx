import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ResetPasswordView: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Extract token from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        setError(null);

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            setIsLoading(false);
            return;
        }

        if (!token) {
            setError('Jeton de réinitialisation manquant.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
                setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
            } else {
                setError(data.message || 'La réinitialisation du mot de passe a échoué. Le jeton est peut-être invalide ou expiré.');
            }
        } catch (err) {
            console.error('Network error during password reset:', err);
            setError('Une erreur réseau est survenue. Veuillez vérifier votre connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-2 text-xl text-slate-600">
                        Réinitialiser votre mot de passe
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Entrez votre nouveau mot de passe.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {message && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md relative" role="alert">
                            <span className="block sm:inline">{message}</span>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div>
                        <label htmlFor="password" className="sr-only">Nouveau mot de passe</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                            placeholder="Nouveau mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="sr-only">Confirmer le nouveau mot de passe</label>
                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                            placeholder="Confirmer le nouveau mot de passe"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
                        </button>
                    </div>
                    <div className="text-sm text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="font-medium text-teal-600 hover:text-teal-500"
                        >
                            Retour à la connexion
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordView;