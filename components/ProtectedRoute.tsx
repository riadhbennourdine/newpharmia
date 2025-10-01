import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import AppLayout from './Layout';

// Protects routes for ANY logged-in user
export const LoggedInRoute: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // If profile is incomplete and we are not already on the completion page, redirect
    if (user?.profileIncomplete && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    // If the profile is complete, but the user tries to access /complete-profile, redirect to dashboard
    if (!user?.profileIncomplete && location.pathname === '/complete-profile') {
        return <Navigate to="/dashboard" replace />;
    }

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