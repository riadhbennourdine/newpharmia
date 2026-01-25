import React from 'react';
import { Spinner } from '../Icons';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  aiPromptInput: string;
  setAiPromptInput: (value: string) => void;
  isGeneratingAI: boolean;
  aiGenerationError: string | null;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  aiPromptInput,
  setAiPromptInput,
  isGeneratingAI,
  aiGenerationError,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-slate-800 mb-4">
          Générer le contenu par IA
        </h3>
        {aiGenerationError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Erreur : </strong>
            <span className="block sm:inline">{aiGenerationError}</span>
          </div>
        )}
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          rows={5}
          placeholder="Décrivez ce que l'IA doit générer (ex: 'un résumé détaillé du mécanisme d'action de l'insuline')."
          value={aiPromptInput}
          onChange={(e) => setAiPromptInput(e.target.value)}
          disabled={isGeneratingAI}
        ></textarea>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isGeneratingAI}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isGeneratingAI}
          >
            {isGeneratingAI ? (
              <>
                <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
                <span>Génération...</span>
              </>
            ) : (
              <span>Générer</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
