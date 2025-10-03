import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LoginView: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await login(identifier, password);
            // Navigation is handled inside the login function now
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue lors de la connexion.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <button onClick={() => navigate('/')} className="inline-flex items-center mb-4 focus:outline-none group" aria-label="Retour à l'accueil">
                        <span className="animated-gradient-text text-4xl font-bold tracking-tight">PharmIA</span>
                    </button>
                    <h2 className="mt-2 text-xl text-slate-600">
                        Connectez-vous à votre espace
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="identifier" className="sr-only">Email ou Pseudo</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                autoComplete="username"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Email ou Pseudo"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="sr-only">Mot de passe</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </div>
                    <div className="text-sm text-center mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="font-medium text-teal-600 hover:text-teal-500"
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>
                    <div className="text-sm text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="font-medium text-teal-600 hover:text-teal-500"
                        >
                            Pas encore de compte ? S'inscrire
                        </button>
                    </div>
                    <div className="text-sm text-center mt-5 border-t pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="font-medium text-slate-500 hover:text-slate-700"
                        >
                            &larr; Retour à l'accueil
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;