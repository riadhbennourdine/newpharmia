import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { WebinarResource, CaseStudy, ObjectId } from '../types';
import { Spinner, CloudArrowUpIcon } from './Icons';
import { useAuth } from '../hooks/useAuth'; // Import useAuth pour le token

interface ManageMasterClassResourcesModalProps {
  webinarId: string;
  resources: WebinarResource[];
  linkedMemofiches: (ObjectId | string)[];
  onClose: () => void;
  onSave: (
    webinarId: string,
    resources: WebinarResource[],
    linkedMemofiches: (ObjectId | string)[],
    kahootUrl?: string, // Add kahootUrl here
  ) => void;
}

// Nouveau sous-composant pour gérer un seul élément de ressource
const ResourceItem: React.FC<{
  resource: WebinarResource;
  index: number;
  uploadingStates: Record<number, boolean>;
  token: string | null;
  handleResourceChange: (index: number, field: keyof WebinarResource, value: string) => void;
  handleRemoveResource: (index: number) => void;
  setUploadingStates: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({
  resource,
  index,
  uploadingStates,
  token,
  handleResourceChange,
  handleRemoveResource,
  setUploadingStates,
  setUploadError,
}) => {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadingStates(prev => ({ ...prev, [index]: true }));
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload/file', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Échec de l\'upload.');
      }
      return response.json();
    })
    .then(data => {
      handleResourceChange(index, 'source', data.fileUrl);
    })
    .catch(err => {
      setUploadError(err.message || 'Une erreur est survenue lors de l\'upload.');
    })
    .finally(() => {
      setUploadingStates(prev => ({ ...prev, [index]: false }));
    });
  }, [token, index, handleResourceChange, setUploadingStates, setUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp'] },
    multiple: false,
  });

  return (
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
            <option value="youtube">Vidéo YouTube</option>
            <option value="Infographie">Infographie</option>
            <option value="Diaporama">Diaporama (Canva)</option>
            <option value="pdf">PDF</option>
            <option value="link">Lien externe</option>
            <option value="googledoc">Google Doc</option>
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
          {resource.type === 'Infographie' && (
            <div {...getRootProps()} className={`mt-2 p-6 border-2 border-dashed rounded-md text-center cursor-pointer ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input {...getInputProps()} />
              {uploadingStates[index] ? (
                <Spinner />
              ) : (
                <div className="flex flex-col items-center">
                  <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mb-2"/>
                  <p className="text-sm text-gray-600">Glissez-déposez une image ici, ou cliquez pour sélectionner</p>
                </div>
              )}
            </div>
          )}
          <label className="block text-sm font-medium text-gray-700 mt-2">Source (URL)</label>
          <textarea
            value={resource.source}
            onChange={(e) => handleResourceChange(index, 'source', e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder={resource.type === 'Infographie' ? "L'URL apparaîtra ici après l'upload" : "Collez l'URL de la ressource"}
          />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={() => handleRemoveResource(index)} className="text-red-500 hover:text-red-700 text-sm">
          Supprimer
        </button>
      </div>
    </div>
  );
};

const ManageMasterClassResourcesModal: React.FC<
  ManageMasterClassResourcesModalProps
> = ({ webinarId, resources, linkedMemofiches, onClose, onSave, kahootUrl }) => {
  const { token } = useAuth(); // Récupérer le token
  const [localKahootUrl, setLocalKahootUrl] = useState(kahootUrl || '');
  const [uploadingStates, setUploadingStates] = useState<Record<number, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const migratedResources = (resources || []).map((r: any) => ({
    type: r.type,
    title: r.title || '',
    source: r.source || r.url || '',
  }));

  const [localResources, setLocalResources] =
    useState<WebinarResource[]>(migratedResources);
  const [localLinkedMemofiches, setLocalLinkedMemofiches] = useState<
    (ObjectId | string)[]
  >(linkedMemofiches || []);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CaseStudy[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [linkedFichesDetails, setLinkedFichesDetails] = useState<CaseStudy[]>(
    [],
  );

  // Fetch details of already linked fiches on component mount
  useEffect(() => {
    const fetchLinkedFicheDetails = async () => {
      if (localLinkedMemofiches.length > 0) {
        try {
          const response = await fetch(`/api/memofiches/by-ids`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ids: localLinkedMemofiches }),
          });
          if (!response.ok)
            throw new Error('Failed to fetch linked fiches details');
          const data = await response.json();
          setLinkedFichesDetails(data);
        } catch (error) {
          console.error('Error fetching linked fiches details:', error);
        }
      }
    };
    fetchLinkedFicheDetails();
  }, [localLinkedMemofiches, token]);

  const performSearch = useCallback(
    async (term: string) => {
      if (term.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/memofiches?search=${term}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Search request failed');
        const data = await response.json();
        setSearchResults(data.data || []);
      } catch (error: any) {
        setSearchError(error.message);
      } finally {
        setIsSearching(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(searchTerm);
    }, 500); // 500ms debounce
    return () => clearTimeout(debounce);
  }, [searchTerm, performSearch]);

  const handleAddResource = () => {
    setLocalResources([
      ...localResources,
      { type: 'Replay', source: '', title: '' },
    ]);
  };

  const handleResourceChange = (
    index: number,
    field: keyof WebinarResource,
    value: string,
  ) => {
    const newResources = [...localResources];
    newResources[index] = { ...newResources[index], [field]: value };
    setLocalResources(newResources);
  };

  const handleRemoveResource = (index: number) => {
    const newResources = [...localResources];
    newResources.splice(index, 1);
    setLocalResources(newResources);
  };

  const handleLinkFiche = (fiche: CaseStudy) => {
    if (
      !localLinkedMemofiches.find(
        (id) => id.toString() === fiche._id.toString(),
      )
    ) {
      setLocalLinkedMemofiches([...localLinkedMemofiches, fiche._id]);
    }
  };

  const handleUnlinkFiche = (ficheId: ObjectId | string) => {
    setLocalLinkedMemofiches(
      localLinkedMemofiches.filter(
        (id) => id.toString() !== ficheId.toString(),
      ),
    );
  };

  const handleSave = () => {
    onSave(webinarId, localResources, localLinkedMemofiches, localKahootUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-bold mb-4">
          Gérer les Médias et Mémofiches
        </h3>

        <div className="flex-grow overflow-y-auto pr-2">
          {/* Section Mémofiches */}
          <div className="mb-6 border-b pb-6">
            <h4 className="text-lg font-semibold mb-2 text-slate-700">
              Mémofiches Liées
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechercher une mémofiche
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tapez pour rechercher..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <div className="mt-2 h-40 overflow-y-auto border rounded-md">
                  {isSearching && (
                    <div className="p-2 flex justify-center items-center h-full">
                      <Spinner />
                    </div>
                  )}
                  {searchError && (
                    <p className="p-2 text-red-500">{searchError}</p>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <ul>
                      {searchResults.map((fiche) => (
                        <li
                          key={fiche._id.toString()}
                          className="flex justify-between items-center p-2 hover:bg-gray-100"
                        >
                          <span>{fiche.title}</span>
                          <button
                            onClick={() => handleLinkFiche(fiche)}
                            className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            Lier
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isSearching &&
                    searchTerm.length > 2 &&
                    searchResults.length === 0 && (
                      <p className="p-2 text-gray-500">Aucun résultat</p>
                    )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mémofiches actuellement liées
                </label>
                <div className="mt-2 h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {linkedFichesDetails.length > 0 ? (
                    linkedFichesDetails.map((fiche) => (
                      <div
                        key={fiche._id.toString()}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span className="text-sm">{fiche.title}</span>
                        <button
                          onClick={() => handleUnlinkFiche(fiche._id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Détacher
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Aucune mémofiche liée.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section Médias */}
          <div>
            <h4 className="text-lg font-semibold mb-2 text-slate-700">
              Autres Médias
            </h4>
            {uploadError && <p className="text-red-500 text-sm mb-2">{uploadError}</p>}
            <div className="space-y-4">
              {localResources.map((resource, index) => (
                <ResourceItem
                  key={index}
                  resource={resource}
                  index={index}
                  uploadingStates={uploadingStates}
                  token={token}
                  handleResourceChange={handleResourceChange}
                  handleRemoveResource={handleRemoveResource}
                  setUploadingStates={setUploadingStates}
                  setUploadError={setUploadError}
                />
              ))}
            </div>
            <button
              onClick={handleAddResource}
              className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Ajouter un média
            </button>
          </div>

          {/* Section Kahoot URL */}
          <div className="mb-6 border-t pt-6 mt-6">
            <h4 className="text-lg font-semibold mb-2 text-slate-700">
              Lien du Quiz Kahoot
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                URL Kahoot
              </label>
              <input
                type="url"
                value={localKahootUrl}
                onChange={(e) => setLocalKahootUrl(e.target.value)}
                placeholder="Ex: https://create.kahoot.it/details/..."
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
              <p className="mt-1 text-xs text-slate-500">
                Collez ici l'URL complète de votre quiz Kahoot.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageMasterClassResourcesModal;

export default ManageMasterClassResourcesModal;
