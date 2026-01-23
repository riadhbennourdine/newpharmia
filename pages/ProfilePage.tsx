import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';
import { Order } from '../types'; // Import Order type
import { UserIcon, KeyIcon, UserGroupIcon, PencilIcon, CheckCircleIcon, DocumentTextIcon } from '../components/Icons'; // Import DocumentTextIcon

const ProfilePage: React.FC = () => {
    const { user, token, setUser } = useAuth();
    const [city, setCity] = useState(user?.city || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [team, setTeam] = useState<User[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [invoices, setInvoices] = useState<Order[]>([]); // New state for invoices

    useEffect(() => {
        if (user?.role === 'PHARMACIEN' && user?._id) {
            const fetchTeam = async () => {
                try {
                    const response = await fetch(`/api/users/pharmacists/${user._id}/team`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const teamData = await response.json();
                        setTeam(teamData);
                    }
                } catch (error) {
                    console.error('Error fetching team:', error);
                }
            };
            fetchTeam();
        }
    }, [user, token]);

    // New useEffect to fetch invoices
    useEffect(() => {
        if (user) {
            const fetchInvoices = async () => {
                try {
                    const response = await fetch('/api/orders/my-orders', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const invoiceData = await response.json();
                        setInvoices(invoiceData);
                    } else {
                        console.error('Failed to fetch invoices:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error fetching invoices:', error);
                }
            };
            fetchInvoices();
        }
    }, [user, token]); // Re-fetch when user or token changes

    useEffect(() => {
        if (user?.role === 'PHARMACIEN' && user?._id) {
            const fetchTeam = async () => {
                try {
                    const response = await fetch(`/api/users/pharmacists/${user._id}/team`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const teamData = await response.json();
                        setTeam(teamData);
                    }
                } catch (error) {
                    console.error('Error fetching team:', error);
                }
            };
            fetchTeam();
        }
    }, [user, token]);

    if (!user) {
        return <div className="flex justify-center items-center h-screen">Chargement du profil...</div>;
    }
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ city, phoneNumber, email })
            });

            if (response.ok) {
                alert('Profil mis à jour avec succès');
                setUser({ ...user, city, phoneNumber, email });
                setIsEditing(false);
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Une erreur est survenue lors de la mise à jour du profil.');
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (response.ok) {
                alert('Mot de passe mis à jour avec succès');
                setCurrentPassword('');
                setNewPassword('');
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Une erreur est survenue lors de la mise à jour du mot de passe.');
        }
    };


    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-8 font-poppins">Mon Profil</h1>

                {/* User Information Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <UserIcon className="h-8 w-8 text-teal-600 mr-3"/>
                            <h2 className="text-2xl font-semibold text-slate-700 font-poppins">Informations personnelles</h2>
                        </div>
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition"
                        >
                            {isEditing ? 'Annuler' : <> <PencilIcon className="h-4 w-4 mr-1"/> Modifier</> }
                        </button>
                    </div>
                    {!isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-slate-600">
                            <div className="border-b border-slate-200 py-2">
                                <label className="block text-sm font-medium text-slate-500">Prénom</label>
                                <p className="text-lg font-roboto">{user.firstName}</p>
                            </div>
                            <div className="border-b border-slate-200 py-2">
                                <label className="block text-sm font-medium text-slate-500">Nom</label>
                                <p className="text-lg font-roboto">{user.lastName}</p>
                            </div>
                            <div className="border-b border-slate-200 py-2">
                                <label className="block text-sm font-medium text-slate-500">Email</label>
                                <p className="text-lg font-roboto">{user.email}</p>
                            </div>
                            <div className="border-b border-slate-200 py-2">
                                <label className="block text-sm font-medium text-slate-500">Ville</label>
                                <p className="text-lg font-roboto">{user.city || 'Non spécifiée'}</p>
                            </div>
                            <div className="border-b border-slate-200 py-2">
                                <label className="block text-sm font-medium text-slate-500">Numéro de téléphone</label>
                                <p className="text-lg font-roboto">{user.phoneNumber || 'Non spécifié'}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleProfileUpdate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                                    <input 
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de téléphone</label>
                                    <input 
                                        type="text"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="mt-6 flex items-center bg-teal-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-700 transition">
                                <CheckCircleIcon className="h-5 w-5 mr-2"/> Enregistrer
                            </button>
                        </form>
                    )}
                </div>

                {/* Password Change Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex items-center mb-6">
                        <KeyIcon className="h-8 w-8 text-teal-600 mr-3"/>
                        <h2 className="text-2xl font-semibold text-slate-700 font-poppins">Changer le mot de passe</h2>
                    </div>
                    <form onSubmit={handlePasswordUpdate}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe actuel</label>
                                <input 
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                                <input 
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="mt-6 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-teal-700 transition">
                            Mettre à jour le mot de passe
                        </button>
                    </form>
                </div>

                {/* Invoices Section */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex items-center mb-6">
                        <DocumentTextIcon className="h-8 w-8 text-teal-600 mr-3"/>
                        <h2 className="text-2xl font-semibold text-slate-700 font-poppins">Mes Factures</h2>
                    </div>
                    {invoices.filter(invoice => invoice.invoiceUrl).length > 0 ? (
                        <ul className="space-y-4">
                            {invoices.filter(invoice => invoice.invoiceUrl).map(invoice => (
                                <li key={invoice._id as string} className="border border-slate-200 rounded-lg p-4 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="font-semibold text-slate-800 font-roboto">Facture #{invoice._id?.toString().slice(-6)}</p>
                                        <p className="text-sm text-slate-600 font-roboto">Montant: {invoice.totalAmount?.toFixed(2)} TND</p>
                                        <p className="text-sm text-slate-600 font-roboto">Statut: {invoice.status}</p>
                                        <p className="text-sm text-slate-600 font-roboto">Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a 
                                        href={invoice.invoiceUrl!} // Assert non-null because of filter
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                                    >
                                        Voir la facture
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 font-roboto">Aucune facture disponible pour le moment.</p>
                    )}
                </div>

                {/* Team Members Section */}
                {user.role === 'PHARMACIEN' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center mb-6">
                            <UserGroupIcon className="h-8 w-8 text-teal-600 mr-3"/>
                            <h2 className="text-2xl font-semibold text-slate-700 font-poppins">Mon Équipe</h2>
                        </div>
                        {team.length > 0 ? (
                            <ul className="space-y-3">
                                {team.map(member => (
                                    <li key={member._id as string} className="border-b border-slate-200 pb-3 flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-4">
                                            <UserIcon className="h-6 w-6 text-teal-600"/>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 font-roboto">{member.firstName} {member.lastName}</p>
                                            <p className="text-sm text-slate-500 font-roboto">{member.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 font-roboto">Vous n'avez pas encore de membres dans votre équipe.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
