import React, { createContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';

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
  setGuestToken: (token: string) => void;
  markFicheAsRead: (ficheId: string) => Promise<void>;
  saveQuizResult: (result: { quizId: string; score: number; completedAt: Date }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('token');
      const storedGuestToken = localStorage.getItem('guestToken');

      if (storedToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('token');
        }
      } else if (storedGuestToken) {
        setGuestToken(storedGuestToken);
      }
      setIsLoading(false);
    };

    verifyUser();
  }, []);

  const setGuestTokenAndStorage = useCallback((newToken: string) => {
    setGuestToken(newToken);
    localStorage.setItem('guestToken', newToken);
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
      
      // Clear any guest token on full login
      setGuestToken(null);
      localStorage.removeItem('guestToken');

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
    setGuestToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('guestToken');
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
  }, []);

  const markFicheAsRead = useCallback(async (ficheId: string) => {
    if (!user || !token || user.readFiches?.some(f => f.ficheId === ficheId)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user._id}/read-fiches`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
  }, [user, token, handleSetUser]);

  const saveQuizResult = useCallback(async (result: { quizId: string; score: number; completedAt: Date }) => {
    if (!user || !token) return;
    try {
      const response = await fetch(`/api/users/${user._id}/quiz-history`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
  }, [user, token, handleSetUser]);

  const value = useMemo(() => ({
    isAuthenticated: !!token,
    user,
    token: token || guestToken, // Prioritize user token, fallback to guest
    login,
    logout,
    register,
    isLoading,
    authError,
    setUser: handleSetUser,
    setGuestToken: setGuestTokenAndStorage,
    markFicheAsRead,
    saveQuizResult,
  }), [user, token, guestToken, isLoading, authError, login, logout, register, handleSetUser, setGuestTokenAndStorage, markFicheAsRead, saveQuizResult]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};