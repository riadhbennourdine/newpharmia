import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import AppLayout from './Layout';

// Protects routes for ANY logged-in user
export const LoggedInRoute: React.FC = () => {
    const { isAuthenticated, user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Display a loading indicator while auth state is being determined
        return <div className="flex items-center justify-center h-screen">Chargement...</div>;
    }

    if (!isAuthenticated) {
        // If not authenticated, redirect to the login page
        return <Navigate to="/login" replace />;
    }

    // If authentication is confirmed, but we don't have user data yet, show loading.
    // This prevents race conditions on initial load or after login.
    if (!user) {
        return <div className="flex items-center justify-center h-screen">Chargement des données utilisateur...</div>;
    }

    // --- Redirection Logic ---
    // If profile is incomplete and the user is NOT on the completion page, redirect them there.
    if (user.profileIncomplete && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    // If profile is complete and the user tries to access the completion page, redirect to the dashboard.
    if (!user.profileIncomplete && location.pathname === '/complete-profile') {
        return <Navigate to="/dashboard" replace />;
    }

    // If all checks pass, render the main application layout which contains the requested page.
    return <AppLayout />;
};

// Protects routes for Formateurs and Admins
export const FormateurOrAdminRoute: React.FC = () => {
    const { user } = useAuth();
    const isAuthorized = user?.role === UserRole.ADMIN || user?.role === UserRole.FORMATEUR;
    return isAuthorized ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// Protects routes for Admins only
export const AdminOnlyRoute: React.FC = () => {
    const { user } = useAuth();
    const isAuthorized = user?.role === UserRole.ADMIN;
    return isAuthorized ? <Outlet /> : <Navigate to="/dashboard" replace />;
};