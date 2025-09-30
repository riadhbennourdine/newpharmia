import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import Footer from './Footer';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'text-teal-600 font-semibold' : 'text-slate-600 hover:text-teal-600'
    }`;

  return (
    <header className="bg-white/80 backdrop-blur-sm text-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center space-x-2">
              <img src="https://pharmaconseilbmb.com/photos/site/P.png" alt="PharmIA Logo" className="h-8 w-8" />
              <span className="text-2xl font-bold tracking-tight logo-gradient-text">PharmIA</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Tableau de bord
                </NavLink>
                {/* FIX: Corrected condition to only show "Générateur" link to Admins to match routing rules. */}
                {user?.role === UserRole.ADMIN && (
                   <NavLink to="/generateur" className={navLinkClass}>
                    Générateur
                  </NavLink>
                )}
                {user?.role === UserRole.ADMIN && (
                   <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-teal-600"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <NavLink to="/" className={navLinkClass}>
                  Accueil
                </NavLink>
                <NavLink to="/tarifs" className={navLinkClass}>
                  Tarifs
                </NavLink>
                <NavLink to="/contact" className={navLinkClass}>
                  Contact
                </NavLink>
                <Link to="/login" className="ml-4 bg-teal-600 text-white font-semibold px-4 py-2 rounded-md text-sm hover:bg-teal-700 transition-colors">
                  Connexion
                </Link>
              </>
            )}
          </nav>
          {/* Mobile menu button could go here */}
        </div>
      </div>
    </header>
  );
};

const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;