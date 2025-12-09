import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';

const ProfilePage: React.FC = () => {
    const { user, token, setUser } = useAuth();
    const [city, setCity] = useState(user?.city || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [team, setTeam] = useState<User[]>([]);
    const [isEditing, setIsEditing] = useState(false);

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
        return <div>Chargement du profil...</div>;
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
                body: JSON.stringify({ city, phoneNumber })
            });

            if (response.ok) {
                alert('Profil mis à jour avec succès');
                // Optimistically update user in context
                setUser({ ...user, city, phoneNumber });
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
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Mon Profil</h1>

            {/* User Information Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Informations personnelles</h2>
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        {isEditing ? 'Annuler' : 'Modifier'}
                    </button>
                </div>
                {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700">Prénom</label>
                            <p className="text-lg">{user.firstName}</p>
                        </div>
                        <div>
                            <label className="block text-gray-700">Nom</label>
                            <p className="text-lg">{user.lastName}</p>
                        </div>
                        <div>
                            <label className="block text-gray-700">Email</label>
                            <p className="text-lg">{user.email}</p>
                        </div>
                        <div>
                            <label className="block text-gray-700">Ville</label>
                            <p className="text-lg">{user.city || 'Non spécifiée'}</p>
                        </div>
                        <div>
                            <label className="block text-gray-700">Numéro de téléphone</label>
                            <p className="text-lg">{user.phoneNumber || 'Non spécifié'}</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleProfileUpdate}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700">Ville</label>
                                <input 
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700">Numéro de téléphone</label>
                                <input 
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        </div>
                        <button type="submit" className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                            Enregistrer les modifications
                        </button>
                    </form>
                )}
            </div>

            {/* Password Change Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Changer le mot de passe</h2>
                <form onSubmit={handlePasswordUpdate}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700">Mot de passe actuel</label>
                            <input 
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700">Nouveau mot de passe</label>
                            <input 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Changer le mot de passe
                    </button>
                </form>
            </div>

            {/* Team Members Section */}
            {user.role === 'PHARMACIEN' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Mon Équipe</h2>
                    {team.length > 0 ? (
                        <ul>
                            {team.map(member => (
                                <li key={member._id as string} className="border-b py-2">
                                    {member.firstName} {member.lastName} ({member.email})
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Vous n'avez pas encore de membres dans votre équipe.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
