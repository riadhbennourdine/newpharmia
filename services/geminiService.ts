import { CaseStudy } from "../types";

const getAuthToken = () => {
  return localStorage.getItem('token');
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Une erreur est survenue lors de l\'appel à l\'API.');
  }
  return response.json();
};

export const generateCaseStudyDraft = async (prompt: string): Promise<Partial<CaseStudy>> => {
  const token = getAuthToken();
  if (!token) throw new Error("Jeton d'authentification non trouvé.");
  
  const response = await fetch('/api/gemini/generate-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
  });

  return handleResponse(response);
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Jeton d'authentification non trouvé.");
  
  const body = {
    ...memoContent,
    generationConfig: {
      glossary: {
        count: 10,
      },
    },
  };

  const response = await fetch('/api/gemini/generate-learning-tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  return handleResponse(response);
};

export const sendChatMessage = async (messages: {role: string, text: string}[], context: string): Promise<{ message: string }> => {
  const token = getAuthToken();
  if (!token) throw new Error("Jeton d'authentification non trouvé.");

  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages, context })
  });

  return handleResponse(response);
};
