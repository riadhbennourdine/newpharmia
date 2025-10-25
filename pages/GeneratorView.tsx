import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MemoFicheType, CaseStudy } from '../types';
import { generateCaseStudyDraft } from '../services/geminiService';

const GeneratorView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [memoFicheType, setMemoFicheType] = useState<MemoFicheType>(MemoFicheType.DERMO_COSMETIQUE);
  const [theme, setTheme] = useState('');
  const [system, setSystem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Le sujet ne peut pas être vide.');
      return;
    }

    if (memoFicheType === MemoFicheType.MICRONUTRITION) {
      if (!theme.trim()) {
        setError('Le thème ne peut pas être vide pour une mémofiche de micronutrition.');
        return;
      }
      if (!system.trim()) {
        setError('Le système/organe ne peut pas être vide pour une mémofiche de micronutrition.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const newCaseStudy = await generateCaseStudyDraft(topic, memoFicheType, theme, system);
      // Assuming the server returns the full case study with an ID
      if (newCaseStudy && newCaseStudy._id) {
        navigate(`/memofiches/editor/${newCaseStudy._id}`);
      } else {
        // Fallback if the created case study or its ID is not returned
        // Navigate to the list page, so the user can see the new draft
        navigate('/memofiches');
      }
    } catch (err) {
      console.error('Error generating case study:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Générateur de Mémofiche</h1>
        <p className="text-center text-gray-600 mb-8">Saisissez un sujet ou une pathologie pour générer une nouvelle mémofiche à partir de l'IA.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="topic" className="block text-gray-700 text-sm font-bold mb-2">Sujet de la mémofiche</label>
            <textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-28 resize-none"
              placeholder="Ex: Acné rosacée, Hypertension artérielle, Conseils pour le sevrage tabagique..."
            />
          </div>

          <div className="mb-6">
            <label htmlFor="memoFicheType" className="block text-gray-700 text-sm font-bold mb-2">Type de mémofiche</label>
            <select
              id="memoFicheType"
              value={memoFicheType}
              onChange={(e) => setMemoFicheType(e.target.value as MemoFicheType)}
              className="shadow-sm bg-white border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value={MemoFicheType.DERMO_COSMETIQUE}>Dermocosmétique</option>
              <option value={MemoFicheType.DISPOSITIFS_MEDICAUX}>Dispositifs Médicaux</option>
              <option value={MemoFicheType.ORDONNANCES}>Ordonnances</option>
              <option value={MemoFicheType.COMMUNICATION}>Communication</option>
              <option value={MemoFicheType.MICRONUTRITION}>Micronutrition</option>
            </select>
          </div>

          {memoFicheType === MemoFicheType.MICRONUTRITION && (
            <>
              <div className="mb-6">
                <label htmlFor="theme" className="block text-gray-700 text-sm font-bold mb-2">Thème (Micronutrition)</label>
                <input
                  type="text"
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Ex: Arthrose, Digestion, Immunité..."
                />
              </div>
              <div className="mb-6">
                <label htmlFor="system" className="block text-gray-700 text-sm font-bold mb-2">Système/Organe (Micronutrition)</label>
                <input
                  type="text"
                  id="system"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Ex: Articulations, Intestin, Système immunitaire..."
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isLoading}
            >
              {isLoading ? 'Génération en cours...' : 'Générer la mémofiche'}
            </button>
          </div>
        </form>

        {error && <p className="text-red-500 text-xs italic mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default GeneratorView;