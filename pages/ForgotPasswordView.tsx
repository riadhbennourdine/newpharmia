import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier: email }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.migrationRequired) {
                    navigate('/activate-account', { state: { username: data.username } });
                } else {
                    setMessage(data.message || 'Si votre compte est trouvé, des instructions ont été envoyées.');
                }
            } else {
                setError(data.message || 'Une erreur est survenue. Veuillez réessayer.');
            }
        } catch (err) {
            console.error('Network error during password recovery:', err);
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
                        Mot de passe oublié ?
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Entrez votre adresse e-mail ou votre pseudo pour recevoir un lien de réinitialisation.
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
                        <label htmlFor="identifier" className="sr-only">Email ou Pseudo</label>
                        <input
                            id="identifier"
                            name="identifier"
                            type="text"
                            autoComplete="username"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                            placeholder="Email ou Pseudo"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
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

export default ForgotPasswordView;