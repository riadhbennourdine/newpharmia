import React, { useState } from 'react';

// FIX: Added Subscriber interface and updated component props to accept subscriber, allGroups, and onSave,
// which resolves the type error in SubscriberManager.tsx. Also implemented the modal's UI and logic.
interface Subscriber {
    _id: string;
    email: string;
    subscribedAt: string;
    groups?: string[];
}
  
interface GroupManagementModalProps {
    subscriber: Subscriber;
    allGroups: string[];
    onClose: () => void;
    onSave: (updatedGroups: string[]) => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({ subscriber, allGroups, onClose, onSave }) => {
    const [selectedGroups, setSelectedGroups] = useState<string[]>(subscriber.groups || []);
    const [newGroup, setNewGroup] = useState('');
  
    const handleToggleGroup = (group: string) => {
      setSelectedGroups(prev => 
        prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
      );
    };
  
    const handleAddNewGroup = () => {
        const trimmedGroup = newGroup.trim();
        if (trimmedGroup && !selectedGroups.includes(trimmedGroup)) {
            setSelectedGroups(prev => [...prev, trimmedGroup]);
        }
        setNewGroup('');
    };
    
    const handleSave = () => {
      onSave(selectedGroups);
    };

    const allDisplayGroups = [...new Set([...allGroups, ...selectedGroups])].sort();
  
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-11/12 max-w-md">
                <h3 className="text-xl font-bold mb-4">Gérer les groupes pour {subscriber.email}</h3>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Groupes disponibles</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                    {allDisplayGroups.map(group => (
                      <div key={group} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`group-${group}`}
                          checked={selectedGroups.includes(group)}
                          onChange={() => handleToggleGroup(group)}
                          className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor={`group-${group}`} className="ml-2 text-sm text-gray-700">{group}</label>
                      </div>
                    ))}
                    {allDisplayGroups.length === 0 && <p className="text-sm text-gray-500">Aucun groupe existant.</p>}
                  </div>
                </div>
  
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Ajouter un nouveau groupe</h4>
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      value={newGroup}
                      onChange={(e) => setNewGroup(e.target.value)}
                      placeholder="Nom du nouveau groupe"
                      className="flex-grow mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewGroup}
                      disabled={!newGroup.trim()}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
  
                <div className="flex justify-end mt-4 space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                        Sauvegarder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupManagementModal;
