import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect and useCallback
import { WebinarResource, CaseStudy, ObjectId } from '../types'; // Added CaseStudy and ObjectId
import { Spinner } from './Icons'; // Added Spinner

interface ManageWebinarResourcesModalProps {
    webinarId: string;
    resources: WebinarResource[];
    linkedMemofiches: (ObjectId | string)[]; // NOUVEAU
    onClose: () => void;
    onSave: (webinarId: string, resources: WebinarResource[], linkedMemofiches: (ObjectId | string)[]) => void; // MODIFIÉ
}

const ManageWebinarResourcesModal: React.FC<ManageWebinarResourcesModalProps> = ({ webinarId, resources, linkedMemofiches, onClose, onSave }) => {
    // Handle migration from old data shape { url: ... } to new { source: ... }
    const migratedResources = (resources || []).map((r: any) => ({
        type: r.type,
        title: r.title || '',
        source: r.source || r.url || '',
    }));

    const [localResources, setLocalResources] = useState<WebinarResource[]>(migratedResources);
    const [localLinkedMemofiches, setLocalLinkedMemofiches] = useState<(ObjectId | string)[]>(linkedMemofiches || []); // NOUVEL ÉTAT

    // États pour la recherche de mémofiches
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<CaseStudy[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleAddResource = () => {
        setLocalResources([...localResources, { type: 'Replay', source: '', title: '' }]);
    };

    const handleResourceChange = (index: number, field: keyof WebinarResource, value: string) => {
        const newResources = [...localResources];
        newResources[index] = { ...newResources[index], [field]: value };
        setLocalResources(newResources);
    };

    const handleRemoveResource = (index: number) => {
        const newResources = [...localResources];
        newResources.splice(index, 1);
        setLocalResources(newResources);
    };

    const handleSave = () => {
        onSave(webinarId, localResources);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
                <h3 className="text-xl font-bold mb-4">Gérer les Médias</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {localResources.map((resource, index) => (
                        <div key={index} className="border p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        value={resource.type}
                                        onChange={(e) => handleResourceChange(index, 'type', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="Replay">Replay</option>
                                        <option value="Vidéo explainer">Vidéo explainer</option>
                                        <option value="Infographie">Infographie</option>
                                        <option value="Diaporama">Diaporama</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Titre</label>
                                    <input
                                        type="text"
                                        value={resource.title || ''}
                                        onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Source (URL ou code d'intégration)</label>
                                    <textarea
                                        value={resource.source}
                                        onChange={(e) => handleResourceChange(index, 'source', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                        rows={4}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                      Pour le type "Diaporama", collez une URL (PDF, Canva) ou un code d'intégration (iframe). Pour les autres, collez l'URL directe.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button onClick={() => handleRemoveResource(index)} className="text-red-500 hover:text-red-700">
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddResource} className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                    Ajouter un média
                </button>
                <div className="flex justify-end mt-6 space-x-4">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
                        Annuler
                    </button>
                    <button onClick={handleSave} className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700">
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageWebinarResourcesModal;
