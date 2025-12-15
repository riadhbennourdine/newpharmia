import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

interface PreparerLearningJourneyPopupProps {
  preparerId: string;
  preparerName: string;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

interface LearningJourneyData {
  readFiches: { ficheId: string; readAt: string; title: string }[];
  quizHistory: { quizId: string; score: number; completedAt: string; title: string }[];
  viewedMediaIds: string[];
}

const PreparerLearningJourneyPopup: React.FC<PreparerLearningJourneyPopupProps> = ({ preparerId, preparerName, onClose, startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningJourney, setLearningJourney] = useState<LearningJourneyData | null>(null);

  useEffect(() => {
    const fetchLearningJourney = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`/api/users/${preparerId}/learning-journey?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du parcours.');
        }

        const data = await response.json();
        setLearningJourney(data);

      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching learning journey:', err);
      } finally {
        setLoading(false);
      }
    };

    if (preparerId) {
        fetchLearningJourney();
    }
  }, [preparerId, startDate, endDate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full text-center">
          <p>Chargement du parcours d'apprentissage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full text-center">
          <p className="text-red-600">Erreur: {error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg">Fermer</button>
        </div>
      </div>
    );
  }

  if (!learningJourney) {
    return null;
  }

  const formatScore = (score: number) => {
    // Heuristic: If score is between 1 and 10 (inclusive) and is an integer,
    // assume it needs to be scaled by 10 to represent a percentage out of 100.
    // E.g., 9 becomes 90%. Scores like 80 will remain 80%.
    if (score >= 1 && score <= 10 && Number.isInteger(score)) {
        return `${score * 10}%`;
    }
    // Otherwise, assume the score is already in the 0-100 range or not an integer to be scaled.
    return `${score}%`;
  };

  // Create a map of best scores per quiz/fiche
  const bestScoresByFicheId = new Map<string, number>();
  if (learningJourney?.quizHistory) {
    for (const quiz of learningJourney.quizHistory) {
      if (quiz.quizId) {
        const currentBest = bestScoresByFicheId.get(quiz.quizId) || 0;
        if (quiz.score > currentBest) {
            bestScoresByFicheId.set(quiz.quizId, quiz.score);
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-3xl w-full relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Parcours d'apprentissage de <span className="text-teal-600">{preparerName || '...'}</span></h2>
        
        {(startDate || endDate) && (
            <div className="text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded border border-gray-200 inline-block">
                Filtre actif : 
                {startDate && <span className="font-medium ml-1">du {new Date(startDate).toLocaleDateString()}</span>}
                {endDate && <span className="font-medium ml-1">au {new Date(endDate).toLocaleDateString()}</span>}
            </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Fiches Consultées ({learningJourney.readFiches?.length ?? 0})</h3>
            {learningJourney.readFiches && learningJourney.readFiches.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {learningJourney.readFiches.map((fiche, index) => {
                  const score = bestScoresByFicheId.get(fiche.ficheId);
                  return (
                    <li key={`${fiche.ficheId}-${index}`} className="text-gray-600">
                      <Link to={`/memofiche/${fiche.ficheId}`} onClick={onClose} className="text-teal-600 hover:underline">
                        {fiche.title}
                      </Link>
                      <span className="text-xs text-gray-400 ml-2">
                        (Lu le {new Date(fiche.readAt).toLocaleDateString()})
                      </span>
                      {score !== undefined && (
                        <span className={`ml-2 font-semibold ${score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>- Validée à {formatScore(score)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 italic">Aucune fiche lue pour le moment.</p>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Historique des Quiz</h3>
            {learningJourney.quizHistory && learningJourney.quizHistory.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2">
                    {learningJourney.quizHistory.map((quiz, index) => (
                        <li key={index} className="text-gray-600">
                            <span className="font-medium">{quiz.title}</span> : <span className={quiz.score >= 80 ? 'text-green-600' : 'text-amber-600'}>{formatScore(quiz.score)}</span>
                            <span className="text-xs text-gray-400 ml-2">
                                ({new Date(quiz.completedAt).toLocaleDateString()})
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 italic">Aucun quiz effectué pour le moment.</p>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Médias Consultés ({learningJourney?.viewedMediaIds?.length ?? 0})</h3>
            {learningJourney?.viewedMediaIds && learningJourney.viewedMediaIds.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {learningJourney.viewedMediaIds.map((mediaId, index) => (
                  <li key={index} className="text-gray-600">{mediaId}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">Aucun média consulté pour le moment.</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={onClose} className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreparerLearningJourneyPopup;