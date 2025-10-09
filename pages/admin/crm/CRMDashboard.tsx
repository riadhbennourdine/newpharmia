import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const CRMDashboard = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 font-medium text-sm rounded-md ${
      isActive ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-white border-r p-4 flex-shrink-0">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Menu CRM</h2>
        <nav className="flex flex-col space-y-1">
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
        <Outlet />
      </main>
    </div>
  );
};

export default CRMDashboard;