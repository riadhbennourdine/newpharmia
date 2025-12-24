import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { User } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';

const LatestRegistrations: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const response = await fetch('/api/users/latest', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch latest users", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLatest();
    }, [token]);

    if (isLoading) return <div className="p-4">Chargement...</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-700">Derniers Pharmaciens Inscrits</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ville</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user._id as string}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {user.firstName} {user.lastName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.city || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNumber || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CRMDashboard = () => {
  const location = useLocation();
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 font-medium text-sm rounded-md ${
      isActive ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'
    }`;
  
  // Determine if we are on the root path to show the dashboard overview
  const isRoot = location.pathname === '/admin/crm' || location.pathname === '/admin/crm/';

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-white border-r p-4 flex-shrink-0">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Menu CRM</h2>
        <nav className="flex flex-col space-y-1">
          <NavLink to="/admin/crm" end className={navLinkClass}>
            Dernières Inscriptions
          </NavLink>
          <NavLink to="/admin/crm/clients" className={navLinkClass}>
            Clients
          </NavLink>
          <NavLink to="/admin/crm/prospects" className={navLinkClass}>
            Prospects
          </NavLink>
          <NavLink to="/admin/crm/appointments" className={navLinkClass}>
            Rendez-vous
          </NavLink>
        </nav>
      </aside>
      <main className="flex-grow p-6 bg-gray-50">
        {isRoot ? <LatestRegistrations /> : <Outlet />}
      </main>
    </div>
  );
};

export default CRMDashboard;