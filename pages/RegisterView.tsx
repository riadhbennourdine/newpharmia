import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole, User } from '../types';

const RegisterView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [city, setCity] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole>(UserRole.PREPARATEUR);
    const [pharmacistId, setPharmacistId] = useState('');
    const [pharmacists, setPharmacists] = useState<User[]>([]);
    const [pharmacistSearchTerm, setPharmacistSearchTerm] = useState('');

    useEffect(() => {
        if (role === UserRole.PREPARATEUR) {
          const fetchPharmacists = async () => {
            try {
              // This is a public endpoint, no auth needed.
              const response = await fetch('/api/users/pharmacists');
              if (!response.ok) {
                throw new Error('Failed to fetch pharmacists');
              }
              const data: User[] = await response.json();
              setPharmacists(data);
            } catch (err) {
              console.error('Error fetching pharmacists:', err);
              setError('Impossible de charger la liste des pharmaciens.');
            }
          };
          fetchPharmacists();
        }
      }, [role]);
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const userData = { email, username, password, role, pharmacistId, firstName, lastName, city };
            await register(userData as any);
            alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
            navigate('/login');
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'inscription.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <button onClick={() => navigate('/')} className="inline-flex items-center mb-4 focus:outline-none group" aria-label="Retour à l'accueil">
                        <span className="animated-gradient-text text-4xl font-bold tracking-tight">PharmIA</span>
                    </button>
                    <h2 className="mt-2 text-xl text-slate-600">
                        Créez votre compte
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm -space-y-px">
                        {/* Role Selection */}
                        <div>
                            <label htmlFor="role-select" className="sr-only">Je suis</label>
                            <select
                                id="role-select"
                                name="role"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                            >
                                <option value={UserRole.PHARMACIEN}>Pharmacien</option>
                                <option value={UserRole.PREPARATEUR}>Préparateur</option>
                            </select>
                        </div>
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email-address-register" className="sr-only">Adresse email</label>
                            <input
                                id="email-address-register"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Adresse email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {/* Username Field */}
                        <div>
                            <label htmlFor="username-register" className="sr-only">Pseudo</label>
                            <input
                                id="username-register"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Pseudo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        {/* Name Fields - Common to all roles */}
                        <div>
                            <label htmlFor="first-name-register" className="sr-only">Prénom</label>
                            <input
                                id="first-name-register"
                                name="firstName"
                                type="text"
                                autoComplete="given-name"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Prénom"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="last-name-register" className="sr-only">Nom</label>
                            <input
                                id="last-name-register"
                                name="lastName"
                                type="text"
                                autoComplete="family-name"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Nom"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                        {/* Role-specific fields */}
                        {role === UserRole.PHARMACIEN && (
                            <>
                                <div>
                                    <label htmlFor="city-register" className="sr-only">Ville</label>
                                    <input
                                        id="city-register"
                                        name="city"
                                        type="text"
                                        autoComplete="address-level2"
                                        required
                                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                        placeholder="Ville"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                        {role === UserRole.PREPARATEUR && (
                            <div>
                                <label htmlFor="pharmacist-search" className="sr-only">Pharmacien Référent</label>
                                <input
                                    id="pharmacist-search"
                                    type="text"
                                    placeholder="Rechercher un pharmacien référent"
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                    value={pharmacistSearchTerm}
                                    onChange={(e) => {
                                        setPharmacistSearchTerm(e.target.value);
                                        setPharmacistId('');
                                    }}
                                    required={!pharmacistId}
                                />
                                {pharmacistSearchTerm && (
                                    <div className="border border-slate-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                                        {pharmacists
                                            .filter(p => {
                                                const searchTermLower = pharmacistSearchTerm.toLowerCase();
                                                return (
                                                    p.firstName?.toLowerCase().includes(searchTermLower) ||
                                                    p.lastName?.toLowerCase().includes(searchTermLower) ||
                                                    p.email.toLowerCase().includes(searchTermLower)
                                                );
                                            })
                                            .map(p => (
                                                <div
                                                    key={p._id}
                                                    className="p-2 hover:bg-slate-100 cursor-pointer"
                                                    onClick={() => {
                                                        setPharmacistId(p._id as string);
                                                        setPharmacistSearchTerm(`${p.firstName} ${p.lastName}`);
                                                    }}
                                                >
                                                    {p.firstName} {p.lastName}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <label htmlFor="password-register" className="sr-only">Mot de passe</label>
                            <input
                                id="password-register"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                         <div>
                            <label htmlFor="confirm-password" className="sr-only">Confirmer le mot de passe</label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                                placeholder="Confirmer le mot de passe"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Inscription en cours...' : "S'inscrire"}
                        </button>
                    </div>
                     <div className="text-sm text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="font-medium text-teal-600 hover:text-teal-500"
                        >
                            Déjà un compte ? Se connecter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterView;