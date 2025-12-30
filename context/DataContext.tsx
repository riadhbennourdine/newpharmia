import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaseStudy, User } from '../types';
import { useAuth } from '../hooks/useAuth';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DataContextType {
  fiches: CaseStudy[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  team: User[];
  fetchFiches: (params: { page?: number; limit?: number; search?: string; theme?: string; system?: string; sortBy?: string; status?: string; }) => Promise<void>;
  getCaseStudyById: (id: string) => Promise<CaseStudy | undefined>;
  saveCaseStudy: (caseStudy: CaseStudy) => Promise<CaseStudy>;
  deleteCaseStudy: (id: string) => Promise<void>;
  getPharmacistTeam: (pharmacistId: string) => Promise<void>;
  startQuiz: (id: string) => void;
  editCaseStudy: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fiches, setFiches] = useState<CaseStudy[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth(); // Moved useAuth() call here

  const fetchFiches = useCallback(async (params: { page?: number; limit?: number; search?: string; theme?: string; system?: string; sortBy?: string; status?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.search) queryParams.append('search', params.search);
      if (params.theme) queryParams.append('theme', params.theme);
      if (params.system) queryParams.append('system', params.system);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.status) queryParams.append('selectedStatus', params.status);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/memofiches?${queryParams.toString()}`, { headers });
      if (!response.ok) throw new Error('Échec de la récupération des mémofiches.');
      const data = await response.json();
      setFiches(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getPharmacistTeam = useCallback(async (pharmacistId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/pharmacists/${pharmacistId}/team`);
      if (!response.ok) throw new Error('Échec de la récupération de l\'équipe.');
      const data = await response.json();
      setTeam(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const getCaseStudyById = useCallback(async (id: string): Promise<CaseStudy | undefined> => {
    try {
      const headers: HeadersInit = {};
      if (isAuthenticated && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Always retrieve from API to ensure the most up-to-date version
      const response = await fetch(`/api/memofiches/${id}`, { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized');
        } else if (response.status === 404) {
          throw new Error('Mémofiche non trouvée.');
        } else {
          throw new Error('Échec de la récupération de la mémofiche.');
        }
      }
      return await response.json();
    } catch (err: any) {
      console.error("getCaseStudyById: Erreur lors de la récupération de l'ID:", id, err);

      return undefined;
    }
  }, [user, navigate]);

  const saveCaseStudy = async (caseStudy: CaseStudy): Promise<CaseStudy> => {
    const isNew = !caseStudy._id;
    const url = isNew ? '/api/memofiches' : `/api/memofiches/${caseStudy._id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseStudy),
    });

    if (!response.ok) throw new Error('Échec de la sauvegarde de la mémofiche.');
    const savedFiche = await response.json();
    
    // Refresh the list after saving to reflect changes
    if (pagination) {
        fetchFiches({ page: pagination.page, limit: pagination.limit });
    }

    return savedFiche;
  };

  const deleteCaseStudy = async (id: string): Promise<void> => {
    const response = await fetch(`/api/memofiches/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Échec de la suppression de la mémofiche.');
    
    // Refresh the list after deleting
    if (pagination) {
        fetchFiches({ page: pagination.page, limit: pagination.limit });
    }
  };

  const startQuiz = (id: string) => {
    navigate(`/quiz/${id}`);
  };

  const editCaseStudy = (id: string) => {
    navigate(`/edit-memofiche/${id}`);
  };

  const value = {
    fiches,
    pagination,
    isLoading,
    error,
    team,
    fetchFiches,
    getCaseStudyById,
    saveCaseStudy,
    deleteCaseStudy,
    getPharmacistTeam,
    startQuiz,
    editCaseStudy
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
