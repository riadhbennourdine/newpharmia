import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, MemoFiche } from '../types';
import { Link } from 'react-router-dom';

interface PreparerLearningJourneyPopupProps {
  preparerId: string;
  preparerName: string;
  onClose: () => void;
}

interface LearningJourneyData {
  readFicheIds: string[];
  quizHistory: { quizId: string; score: number; completedAt: Date }[];
  viewedMediaIds: string[];
}

const PreparerLearningJourneyPopup: React.FC<PreparerLearningJourneyPopupProps> = ({ preparerId, preparerName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningJourney, setLearningJourney] = useState<LearningJourneyData | null>(null);
  const [readFichesDetails, setReadFichesDetails] = useState<MemoFiche[]>([]);

  useEffect(() => {
    const fetchLearningJourney = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`Fetching learning journey for preparerId: ${preparerId}`);
        await new Promise(res => setTimeout(res, 500)); 

        const mockData: LearningJourneyData = {
            readFicheIds: ['mf-001', 'mf-003'],
            quizHistory: [
                { quizId: 'mf-001', score: 80, completedAt: new Date() }
            ],
            viewedMediaIds: ['video_intro_rgo', 'image_acne_skin']
        };

        setLearningJourney(mockData);

        if (mockData.readFicheIds && mockData.readFicheIds.length > 0) {
            const { MEMOFICHES } = await import('../constants');
            const fichesData = MEMOFICHES.filter(f => mockData.readFicheIds.includes(f._id));
            setReadFichesDetails(fichesData);
        }

      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching learning journey:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningJourney();
  }, [preparerId]);

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

  const quizScoresByFicheId = new Map<string, number>();
  if (learningJourney?.quizHistory) {
    for (const quiz of learningJourney.quizHistory) {
      if (quiz.quizId) {
        quizScoresByFicheId.set(quiz.quizId, quiz.score);
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Parcours d'apprentissage de <span className="text-teal-600">{preparerName || '...'}</span></h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">Fiches Consultées ({readFichesDetails?.length ?? 0})</h3>
            {readFichesDetails && readFichesDetails.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {readFichesDetails.map(fiche => {
                  const score = quizScoresByFicheId.get(fiche._id);
                  return (
                    <li key={fiche._id} className="text-gray-600">
                      <Link to={`/memofiche/${fiche._id}`} onClick={onClose} className="text-teal-600 hover:underline">
                        {fiche.title}
                      </Link>
                      {score !== undefined && (
                        <span className={`ml-2 font-semibold ${score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>- Validée à {score}%</span>
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