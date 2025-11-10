import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/Icons';

const WebinarAdminManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                const data = await response.json();
                setUsers(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (token) {
            fetchUsers();
        }
    }, [token]);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) {
                throw new Error('Failed to update user role');
            }

            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user._id === userId ? { ...user, role: newRole } : user
                )
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    }

    if (error) {
        return <div className="text-center py-12 bg-red-50 text-red-700 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold">Erreur de chargement</h3>
            <p className="mt-2">{error}</p>
        </div>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestion des Administrateurs de Webinaires</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nom</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rôle Actuel</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Changer le Rôle</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user._id.toString()}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user._id.toString(), e.target.value as UserRole)}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
                                    >
                                        <option value={UserRole.PHARMACIEN}>Pharmacien</option>
                                        <option value={UserRole.PREPARATEUR}>Préparateur</option>
                                        <option value={UserRole.FORMATEUR}>Formateur</option>
                                        <option value={UserRole.ADMIN_WEBINAR}>Admin Webinaire</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WebinarAdminManager;
