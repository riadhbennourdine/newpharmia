import React, { useState } from 'react';
import { WebinarResource } from '../types';

interface ManageWebinarResourcesModalProps {
    webinarId: string;
    resources: WebinarResource[];
    onClose: () => void;
    onSave: (webinarId: string, resources: WebinarResource[]) => void;
}

const ManageWebinarResourcesModal: React.FC<ManageWebinarResourcesModalProps> = ({ webinarId, resources, onClose, onSave }) => {
    const [localResources, setLocalResources] = useState<WebinarResource[]>(resources);

    const handleAddResource = () => {
        setLocalResources([...localResources, { type: 'link', url: '', title: '', description: '' }]);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Gérer les Médias</h3>
                <div className="space-y-4">
                    {localResources.map((resource, index) => (
                        <div key={index} className="border p-4 rounded-md">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        value={resource.type}
                                        onChange={(e) => handleResourceChange(index, 'type', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="infographic">Infographie</option>
                                        <option value="pdf">PDF</option>
                                        <option value="link">Lien</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Titre</label>
                                    <input
                                        type="text"
                                        value={resource.title}
                                        onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">URL</label>
                                    <input
                                        type="text"
                                        value={resource.url}
                                        onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        value={resource.description}
                                        onChange={(e) => handleResourceChange(index, 'description', e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    />
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
