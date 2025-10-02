import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password: string) => {
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
      // Re-throw the error to be caught in the component
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const register = async (userData: Omit<User, '_id'>) => {
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
      // Re-throw the error to be caught in the component
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSetUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

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
  }, [user]);

  const value = { 
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};