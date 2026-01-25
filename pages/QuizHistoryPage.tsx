import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner, ArrowLeftIcon } from '../components/Icons';
import { QuizQuestion, UserRole } from '../types';
import { isPharmacienOrAdminWebinar } from '../utils/roles';

interface QuizEntry {
  quizId: string;
  score: number;
  completedAt: string;
  quizTitle?: string; // To store the title of the memofiche
}

const QuizHistoryPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [quizHistory, setQuizHistory] = useState<QuizEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchQuizHistory = async () => {
      if (!userId) {
        setError('User ID is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch user details to get their name
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user details.');
        }
        const userData = await userResponse.json();
        setUserName(
          userData.firstName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.email,
        );

        // Fetch the user's quiz history
        const historyResponse = await fetch(
          `/api/users/${userId}/quiz-history`,
        );
        if (!historyResponse.ok) {
          throw new Error('Failed to fetch quiz history.');
        }
        const { quizHistory: rawQuizHistory } = await historyResponse.json();

        if (rawQuizHistory && rawQuizHistory.length > 0) {
          // Fetch titles for each quiz (memofiche)
          const quizzesWithTitles = await Promise.all(
            rawQuizHistory.map(async (entry: QuizEntry) => {
              try {
                const memoficheResponse = await fetch(
                  `/api/memofiches/${entry.quizId}`,
                );
                const memoficheData = await memoficheResponse.json();
                return { ...entry, quizTitle: memoficheData.title };
              } catch (memoficheError) {
                console.error(
                  `Error fetching memofiche for quizId ${entry.quizId}:`,
                  memoficheError,
                );
                return { ...entry, quizTitle: 'Titre inconnu' };
              }
            }),
          );
          setQuizHistory(quizzesWithTitles);
        } else {
          setQuizHistory([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizHistory();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12 text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur</h2>
        <p className="text-slate-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Link
        to={
          isPharmacienOrAdminWebinar(currentUser?.role)
            ? '/dashboard'
            : '/dashboard'
        }
        className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 mb-4 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Retour au tableau de bord
      </Link>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        Historique des quiz de {userName}
      </h1>

      {quizHistory.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-slate-500">Aucun quiz réalisé pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizHistory.map((entry, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl"
            >
              <Link to={`/memofiche/${entry.quizId}`}>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">
                    {entry.quizTitle || 'Quiz'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Score: {entry.score}%
                  </p>
                  <p className="text-sm text-slate-600">
                    Date:{' '}
                    {new Date(entry.completedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizHistoryPage;
