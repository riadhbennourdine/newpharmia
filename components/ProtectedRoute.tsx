import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import AppLayout from './Layout';

// Protects routes for ANY logged-in user
export const LoggedInRoute: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.profileIncomplete) return <Navigate to="/complete-profile" replace />;
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