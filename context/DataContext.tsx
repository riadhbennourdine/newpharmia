import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaseStudy } from '../types';

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
  fetchFiches: (params: { page?: number; limit?: number; search?: string; category?: string; topic?: string; sortBy?: string; }) => Promise<void>;
  getCaseStudyById: (id: string) => Promise<CaseStudy | undefined>;
  saveCaseStudy: (caseStudy: CaseStudy) => Promise<CaseStudy>;
  deleteCaseStudy: (id: string) => Promise<void>;
  startQuiz: (id: string) => void;
  editCaseStudy: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fiches, setFiches] = useState<CaseStudy[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchFiches = useCallback(async (params: { page?: number; limit?: number; search?: string; category?: string; topic?: string; sortBy?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', String(params.page));
      if (params.limit) queryParams.append('limit', String(params.limit));
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.topic) queryParams.append('topic', params.topic);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);

      const response = await fetch(`/api/memofiches?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Échec de la récupération des mémofiches.');
      const data = await response.json();
      setFiches(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const getCaseStudyById = async (id: string): Promise<CaseStudy | undefined> => {
    try {
      // First, check if the fiche is already in the current list
      const existingFiche = fiches.find(f => f._id === id);
      if (existingFiche) return existingFiche;
      
      // If not, fetch it from the API
      const response = await fetch(`/api/memofiches/${id}`);
      if (!response.ok) throw new Error('Mémofiche non trouvée.');
      return await response.json();
    } catch (err: any) {
      console.error(err);
      navigate('/dashboard', { replace: true });
      return undefined;
    }
  };

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
    fetchFiches,
    getCaseStudyById,
    saveCaseStudy,
    deleteCaseStudy,
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