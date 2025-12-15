import React, { useState } from 'react';
import { Group, User } from '../types';
import PreparateurLearningJourneyPopup from './PreparateurLearningJourneyPopup';

interface GroupDetailsModalProps {
  group: Group;
  onClose: () => void;
}

const GroupDetailsModal: React.FC<GroupDetailsModalProps> = ({ group, onClose }) => {
  const [selectedPreparator, setSelectedPreparator] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Détails du Groupe : {group.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-teal-700 mb-3">Pharmaciens ({group.pharmacistNames?.length || 0})</h3>
              {group.pharmacistNames && group.pharmacistNames.length > 0 ? (
                <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {group.pharmacistNames.map((name, index) => (
                    <li key={index} className="text-slate-700 flex items-center">
                      <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun pharmacien assigné.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-teal-700 mb-3">Préparateurs ({group.preparatorIds?.length || 0})</h3>
              {group.preparatorIds && group.preparatorIds.length > 0 ? (
                <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {group.preparatorIds.map((id, index) => (
                    // Note: We only have IDs here. We might need to fetch names or rely on parent passing populated data.
                    // Ideally, the group object passed here should have preparator names populated or we fetch them.
                    // For now, let's assume we might need to fetch them if not available.
                    // But wait, the admin endpoint /api/admin/groups populates pharmacistNames but NOT preparatorNames.
                    // We need to fetch preparators for this group to get their names.
                    <PreparatorItem key={id.toString()} preparatorId={id.toString()} onSelect={setSelectedPreparator} />
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun préparateur assigné.</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4">
             <h3 className="text-lg font-semibold text-slate-700 mb-2">Informations supplémentaires</h3>
             <p className="text-sm text-gray-600"><strong>Géré par :</strong> {group.managedBy ? (group as any).managedByName || 'Admin/Formateur' : 'Non assigné'}</p>
             <p className="text-sm text-gray-600"><strong>Date d'expiration :</strong> {group.subscriptionEndDate ? new Date(group.subscriptionEndDate).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
            Fermer
          </button>
        </div>
      </div>

      {selectedPreparator && (
        <PreparateurLearningJourneyPopup
          preparerId={selectedPreparator.id}
          preparerName={selectedPreparator.name}
          onClose={() => setSelectedPreparator(null)}
        />
      )}
    </div>
  );
};

// Helper component to fetch and display preparator name
const PreparatorItem: React.FC<{ preparatorId: string, onSelect: (prep: { id: string, name: string }) => void }> = ({ preparatorId, onSelect }) => {
    const [user, setUser] = useState<User | null>(null);

    React.useEffect(() => {
        fetch(`/api/users/${preparatorId}`)
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(err => console.error(err));
    }, [preparatorId]);

    if (!user) return <li className="text-slate-400">Chargement...</li>;

    return (
        <li className="flex justify-between items-center group">
            <span className="text-slate-700">{user.firstName} {user.lastName}</span>
            <button 
                onClick={() => onSelect({ id: preparatorId, name: `${user.firstName} ${user.lastName}` })}
                className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-200"
            >
                Voir parcours
            </button>
        </li>
    );
};

export default GroupDetailsModal;
