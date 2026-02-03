import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext'; // Import useCart
import { UserRole } from '../types';
import Footer from './Footer';
import { ShoppingCartIcon, XCircleIcon, ExclamationTriangleIcon } from './Icons'; // Import ShoppingCartIcon, XCircleIcon, ExclamationTriangleIcon


const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const baseLinkClass =
    'px-3 py-2 rounded-md text-sm font-medium transition-colors font-poppins';
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${baseLinkClass} ${
      isActive
        ? 'text-teal-700 font-semibold'
        : 'text-teal-600 hover:text-teal-500'
    }`;

  const pinkNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${baseLinkClass} ${
      isActive
        ? 'text-pink-700 font-semibold'
        : 'text-pink-600 hover:text-pink-500'
    }`;

  const mobileBaseLinkClass =
    'block px-3 py-2 rounded-md text-base font-medium font-poppins';
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${mobileBaseLinkClass} ${
      isActive
        ? 'bg-teal-50 text-teal-700'
        : 'text-teal-600 hover:bg-gray-50 hover:text-teal-500'
    }`;

  const pinkMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${mobileBaseLinkClass} ${
      isActive
        ? 'bg-pink-50 text-pink-700'
        : 'text-pink-600 hover:bg-gray-50 hover:text-pink-500'
    }`;

  const cartLink = (
    <NavLink
      to="/cart"
      className={navLinkClass}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <div className="relative">
        <ShoppingCartIcon className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {itemCount}
          </span>
        )}
      </div>
    </NavLink>
  );

  const mobileCartLink = (
    <NavLink
      to="/cart"
      className={mobileNavLinkClass}
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <div className="flex items-center">
        <ShoppingCartIcon className="h-6 w-6 mr-2" />
        <span>Panier</span>
        {itemCount > 0 && (
          <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {itemCount}
          </span>
        )}
      </div>
    </NavLink>
  );

  const navLinks = (
    <>
      {isAuthenticated ? (
        <>
          <NavLink
            to="/dashboard"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tableau de bord
          </NavLink>
          <NavLink
            to="/memofiches"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Mémofiches
          </NavLink>
          {user?.role === UserRole.ADMIN && (
            <NavLink
              to="/apps"
              className={pinkNavLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Apps
            </NavLink>
          )}
          {user?.role !== UserRole.ADMIN && (
            <NavLink
              to="/contact"
              className={navLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </NavLink>
          )}
          {user?.role !== UserRole.ADMIN &&
            user?.role !== UserRole.PREPARATEUR && (
              <NavLink
                to="/tarifs"
                className={navLinkClass}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tarifs
              </NavLink>
            )}
          <NavLink
            to="/webinars"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Webinaires
          </NavLink>
          {cartLink}
          {user?.role === UserRole.ADMIN ||
          user?.role === UserRole.FORMATEUR ? (
            <div className="relative group">
              <button
                className={
                  navLinkClass({ isActive: false }) + ' flex items-center'
                }
              >
                Administration <span className="ml-1 text-xs">&#9662;</span>
              </button>
              <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-md py-1 w-48 z-50 border border-slate-100">
                {user?.role === UserRole.ADMIN && (
                  <NavLink
                    to="/admin"
                    className="block px-4 py-2 text-sm text-teal-800 hover:bg-gray-100 hover:text-teal-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Panneau d'administration
                  </NavLink>
                )}
                {user?.role === UserRole.ADMIN && (
                  <NavLink
                    to="/generateur"
                    className="block px-4 py-2 text-sm text-teal-800 hover:bg-gray-100 hover:text-teal-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Générateur
                  </NavLink>
                )}
                <NavLink
                  to="/admin/crm"
                  className="block px-4 py-2 text-sm text-teal-800 hover:bg-gray-100 hover:text-teal-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  CRM
                </NavLink>
              </div>
            </div>
          ) : null}
          <NavLink
            to="/profile"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Mon Profil
          </NavLink>
          <button
            onClick={handleLogout}
            className={navLinkClass({ isActive: false })}
          >
            Déconnexion
          </button>
        </>
      ) : (
        <>
          <NavLink
            to="/"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Accueil
          </NavLink>
          <NavLink
            to="/tarifs"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tarifs
          </NavLink>
          <NavLink
            to="/contact"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Contact
          </NavLink>
          {cartLink}
          <Link
            to="/login"
            className="ml-4 bg-teal-600 text-white font-semibold px-4 py-2 rounded-md text-sm hover:bg-teal-700 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Connexion
          </Link>
        </>
      )}
    </>
  );

  const mobileNavLinks = (
    <>
      {isAuthenticated ? (
        <div className="pt-2 pb-3 space-y-1">
          <NavLink
            to="/dashboard"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tableau de bord
          </NavLink>
          <NavLink
            to="/memofiches"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Mémofiches
          </NavLink>
          {user?.role === UserRole.ADMIN && (
            <NavLink
              to="/apps"
              className={pinkMobileNavLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Apps
            </NavLink>
          )}
          {user?.role !== UserRole.ADMIN && (
            <NavLink
              to="/contact"
              className={mobileNavLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </NavLink>
          )}
          {user?.role !== UserRole.ADMIN &&
            user?.role !== UserRole.PREPARATEUR && (
              <NavLink
                to="/tarifs"
                className={mobileNavLinkClass}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tarifs
              </NavLink>
            )}
          <NavLink
            to="/webinars"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Webinaires
          </NavLink>
          {mobileCartLink}
          {user?.role === UserRole.ADMIN ||
          user?.role === UserRole.FORMATEUR ? (
            <div className="border-t border-gray-200 mt-2 pt-2">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </p>
              {user?.role === UserRole.ADMIN && (
                <NavLink
                  to="/admin"
                  className={mobileNavLinkClass}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Panneau d'administration
                </NavLink>
              )}
              {user?.role === UserRole.ADMIN && (
                <NavLink
                  to="/generateur"
                  className={mobileNavLinkClass}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Générateur
                </NavLink>
              )}
              <NavLink
                to="/admin/crm"
                className={mobileNavLinkClass}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                CRM
              </NavLink>
            </div>
          ) : null}
          <div className="border-t border-gray-200 mt-2 pt-2">
            <NavLink
              to="/profile"
              className={mobileNavLinkClass}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Mon Profil
            </NavLink>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Déconnexion
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2 pb-3 space-y-1">
          <NavLink
            to="/"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Accueil
          </NavLink>
          <NavLink
            to="/tarifs"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tarifs
          </NavLink>
          <NavLink
            to="/contact"
            className={mobileNavLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Contact
          </NavLink>
          {mobileCartLink}
          <Link
            to="/login"
            className="block w-full text-left mt-2 bg-teal-600 text-white font-semibold px-3 py-2 rounded-md text-base hover:bg-teal-700 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Connexion
          </Link>
        </div>
      )}
    </>
  );

  return (
    <header className="bg-white/80 backdrop-blur-sm text-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              to={'/'}
              className="flex items-center space-x-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <img
                src="https://pharmaconseilbmb.com/photos/site/P.png"
                alt="PharmIA Logo"
                className="h-10 w-10"
              />
              <span className="text-3xl font-bold tracking-tight logo-gradient-text font-poppins">
                PharmIA
              </span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks}
          </nav>
          <div className="md:hidden flex items-center">
            {itemCount > 0 && (
              <NavLink
                to="/cart"
                className="relative mr-4"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingCartIcon className="h-6 w-6 text-teal-600" />
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {itemCount}
                </span>
              </NavLink>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
              aria-expanded="false"
            >
              <span className="sr-only">Ouvrir le menu principal</span>
              {isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-white/95 backdrop-blur-sm shadow-lg border-t border-slate-200/80">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {mobileNavLinks}
          </div>
        </div>
      )}
    </header>
  );
};

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation(); // Import useLocation

  const showTemporaryPasswordWarning =
    user && user.passwordIsTemporary && location.pathname !== '/profile';

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <Header />
      {showTemporaryPasswordWarning && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
          <div className="flex">
            <div className="py-1">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3" />
            </div>
            <div>
              <p className="font-bold">Mot de passe temporaire</p>
              <p className="text-sm">
                Votre mot de passe a été réinitialisé par un administrateur. Pour votre sécurité, veuillez le changer dans votre{' '}
                <Link to="/profile" className="font-semibold underline hover:text-yellow-800">
                  profil
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
