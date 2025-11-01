import React, { createContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, '_id'>) => Promise<void>;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: User) => void;
  markFicheAsRead: (ficheId: string) => Promise<void>;
  saveQuizResult: (result: { quizId: string; score: number; completedAt: Date }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthContext useEffect running');
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    console.log('Stored Token:', storedToken);
    console.log('Stored User:', storedUser);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      console.log('User and token set from localStorage');
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
    console.log('AuthContext isLoading set to false');
    console.log('Current user state:', user);
    console.log('Current token state:', token);
    console.log('Current isLoading state:', isLoading);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'La connexion a échoué.');
      }
      
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (data.user.profileIncomplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  }, [navigate]);

  const register = useCallback(async (userData: Omit<User, '_id'>) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'L\'inscription a échoué.');
      }
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSetUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const markFicheAsRead = useCallback(async (ficheId: string) => {
    if (!user || user.readFicheIds?.includes(ficheId)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user._id}/read-fiches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheId }),
      });
      const updatedUser = await response.json();
      if (!response.ok) {
        throw new Error(updatedUser.message || 'Failed to mark as read');
      }
      handleSetUser(updatedUser);
    } catch (error) {
      console.error('Error marking fiche as read:', error);
    }
  }, [user, handleSetUser]);

  const saveQuizResult = useCallback(async (result: { quizId: string; score: number; completedAt: Date }) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user._id}/quiz-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const updatedUser = await response.json();
      if (!response.ok) {
        throw new Error(updatedUser.message || 'Failed to save quiz result');
      }
      handleSetUser(updatedUser);
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  }, [user, handleSetUser]);

  const value = useMemo(() => ({
    isAuthenticated: !!token,
    user,
    token,
    login,
    logout,
    register,
    isLoading,
    authError,
    setUser: handleSetUser,
    markFicheAsRead,
    saveQuizResult,
  }), [!!token, user, token, login, logout, register, isLoading, authError, handleSetUser, markFicheAsRead, saveQuizResult]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};