import React, { useState, useEffect } from 'react';
import { Group, CaseStudy } from '../types';

interface Props {
  group: Group | null;
  onClose: () => void;
  setInstruction: (instruction: string) => void;
}

const EditInstructionModal: React.FC<Props> = ({
  group,
  onClose,
  setInstruction,
}) => {
  const [newInstruction, setNewInstruction] = useState(
    group?.instruction || '',
  );
  const [memofiches, setMemofiches] = useState<CaseStudy[]>([]);
  const [primaryMemoFicheId, setPrimaryMemoFicheId] = useState<string>(
    group?.primaryMemoFicheId?.toString() || '',
  );
  const [additionalMemoFicheIds, setAdditionalMemoFicheIds] = useState<
    (string | ObjectId)[]
  >(group?.instructionFiches || []);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [searchMemoficheTerm, setSearchMemoficheTerm] = useState('');

  useEffect(() => {
    const fetchMemofiches = async () => {
      try {
        const response = await fetch('/api/memofiches/all');
        const data = await response.json();
        setMemofiches(data);
      } catch (error) {
        console.error('Error fetching memofiches:', error);
      }
    };
    fetchMemofiches();
  }, []);

  const handleSave = async () => {
    if (!group) return;
    try {
      const response = await fetch(`/api/groups/${group._id}/instruction`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: newInstruction,
          primaryMemoFicheId: primaryMemoFicheId || undefined,
          additionalMemoFicheIds: additionalMemoFicheIds.map((id) =>
            id.toString(),
          ),
        }),
      });
      if (response.ok) {
        // setInstruction(newInstruction); // This might need to be updated to reflect all changes
        setFeedback({
          message: 'Consigne enregistrée avec succès!',
          type: 'success',
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setFeedback({
          message: "Erreur lors de l'enregistrement de la consigne.",
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error updating instruction:', error);
      setFeedback({
        message: "Erreur lors de l'enregistrement de la consigne.",
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Modifier la consigne
        </h2>
        {feedback && (
          <div
            className={`p-4 mb-4 text-sm text-white rounded-lg ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
          >
            {feedback.message}
          </div>
        )}
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={4}
          value={newInstruction}
          onChange={(e) => setNewInstruction(e.target.value)}
        />
        <div className="mt-4">
          <label
            htmlFor="primaryMemofiche"
            className="block text-sm font-medium text-gray-700"
          >
            Mémofiche principale (optionnel)
          </label>
          <select
            id="primaryMemofiche"
            name="primaryMemofiche"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            value={primaryMemoFicheId}
            onChange={(e) => setPrimaryMemoFicheId(e.target.value)}
          >
            <option value="">Aucune</option>
            {memofiches.map((fiche) => (
              <option key={fiche._id as string} value={fiche._id as string}>
                {fiche.title}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <label
            htmlFor="additionalMemofiches"
            className="block text-sm font-medium text-gray-700"
          >
            Mémofiches additionnelles (optionnel)
          </label>
          <input
            type="text"
            placeholder="Rechercher et ajouter des mémofiches..."
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            value={searchMemoficheTerm}
            onChange={(e) => setSearchMemoficheTerm(e.target.value)}
          />
          {searchMemoficheTerm && (
            <div className="border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
              {memofiches
                .filter(
                  (fiche) =>
                    fiche.title
                      .toLowerCase()
                      .includes(searchMemoficheTerm.toLowerCase()) &&
                    !additionalMemoFicheIds.includes(fiche._id as string),
                )
                .map((fiche) => (
                  <div
                    key={fiche._id as string}
                    className="p-2 hover:bg-slate-100 cursor-pointer"
                    onClick={() => {
                      setAdditionalMemoFicheIds((prev) => [
                        ...prev,
                        fiche._id as string,
                      ]);
                      setSearchMemoficheTerm('');
                    }}
                  >
                    {fiche.title}
                  </div>
                ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {additionalMemoFicheIds.map((ficheId) => {
              const fiche = memofiches.find((f) => f._id === ficheId);
              return fiche ? (
                <span
                  key={ficheId as string}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
                >
                  {fiche.title}
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalMemoFicheIds((prev) =>
                        prev.filter((id) => id !== ficheId),
                      )
                    }
                    className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-teal-400 hover:bg-teal-200 hover:text-teal-500 focus:outline-none focus:bg-teal-200 focus:text-teal-500"
                  >
                    <span className="sr-only">Remove {fiche.title}</span>
                    <svg
                      className="h-2 w-2"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 8 8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M1 1l6 6m0-6L1 7"
                      />
                    </svg>
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md mr-2 hover:bg-gray-400"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInstructionModal;
