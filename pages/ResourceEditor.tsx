import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResourcePage, ResourceLink, PharmiaEvent } from '../types';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/Loader';
import ImagePickerModal from '../components/ImagePickerModal';

const ResourceEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [resourcePage, setResourcePage] = useState<Partial<ResourcePage>>({
    title: '',
    subtitle: '',
    coverImageUrl: '',
    resources: [],
    eventId: undefined,
  });
  const [events, setEvents] = useState<PharmiaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  useEffect(() => {
    // Fetch events for the dropdown
    fetch('/api/events/all', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(() => setError("Impossible de charger les événements."));

    if (id) {
      setIsLoading(true);
      fetch(`/api/resource-pages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => {
            if (!res.ok) {
                throw new Error('Page de ressource non trouvée ou accès refusé.');
            }
            return res.json();
        })
        .then(data => {
            if(data) setResourcePage(data);
            setIsLoading(false);
        })
        .catch(() => {
            setError("Impossible de charger la page de ressource.");
            setIsLoading(false);
        });
    }
  }, [id, token]);

  const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedEventId = e.target.value;
    const selectedEvent = events.find(event => event._id === selectedEventId);
    if (selectedEvent) {
        setResourcePage({
            ...resourcePage,
            eventId: selectedEvent._id,
            title: selectedEvent.title,
            subtitle: selectedEvent.summary,
            coverImageUrl: selectedEvent.imageUrl,
        });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setResourcePage({ ...resourcePage, [e.target.name]: e.target.value });
  };

  const handleImageSelect = (imageUrl: string) => {
    setResourcePage({ ...resourcePage, coverImageUrl: imageUrl });
  };

  const handleResourceChange = (index: number, field: keyof ResourceLink, value: string) => {
    const newResources = [...(resourcePage.resources || [])];
    newResources[index] = { ...newResources[index], [field]: value };
    setResourcePage({ ...resourcePage, resources: newResources });
  };

  const addResource = () => {
    const newResources = [...(resourcePage.resources || []), { type: 'autre', title: '', url: '' }];
    setResourcePage({ ...resourcePage, resources: newResources });
  };

  const removeResource = (index: number) => {
    const newResources = [...(resourcePage.resources || [])];
    newResources.splice(index, 1);
    setResourcePage({ ...resourcePage, resources: newResources });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const url = id ? `/api/resource-pages/${id}` : '/api/resource-pages';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resourcePage),
      });

      if (!response.ok) {
        throw new Error('Échec de la sauvegarde de la page de ressource.');
      }
      navigate('/admin'); // Redirect to admin panel or a new resource list page
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && id) return <div className="text-center p-10"><Loader /></div>;

  return (
    <>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{id ? 'Modifier' : 'Créer'} une page de ressources</h1>
        {error && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          
          {!id && (
            <div>
              <label htmlFor="event" className="block text-sm font-medium text-gray-700">Hériter d'un événement</label>
              <select id="event" onChange={handleEventSelect} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                <option value="">Sélectionner un événement</option>
                {events.map(event => (
                  <option key={event._id} value={event._id}>{event.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
            <input type="text" name="title" id="title" value={resourcePage.title} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700">Sous-titre</label>
            <input type="text" name="subtitle" id="subtitle" value={resourcePage.subtitle || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700">URL de l'image de couverture</label>
            <div className="flex items-center gap-2">
                <input type="url" name="coverImageUrl" id="coverImageUrl" value={resourcePage.coverImageUrl || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                <button type="button" onClick={() => setIsImagePickerOpen(true)} className="mt-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">Galerie</button>
            </div>
            {resourcePage.coverImageUrl && <img src={resourcePage.coverImageUrl} alt="Aperçu" className="mt-2 h-32 w-auto rounded"/>}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Ressources</h3>
            {resourcePage.resources?.map((resource, index) => (
              <div key={index} className="border p-4 rounded-md space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Titre" value={resource.title} onChange={(e) => handleResourceChange(index, 'title', e.target.value)} className="p-2 border border-gray-300 rounded-md" />
                  <select value={resource.type} onChange={(e) => handleResourceChange(index, 'type', e.target.value)} className="p-2 border border-gray-300 rounded-md">
                    <option value="diaporama">Diaporama</option>
                    <option value="infographie">Infographie</option>
                    <option value="replay">Replay</option>
                    <option value="autre">Autre</option>
                  </select>
                  <input type="url" placeholder="URL" value={resource.url} onChange={(e) => handleResourceChange(index, 'url', e.target.value)} className="p-2 border border-gray-300 rounded-md" />
                </div>
                <button type="button" onClick={() => removeResource(index)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
              </div>
            ))}
            <button type="button" onClick={addResource} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Ajouter une ressource</button>
          </div>

          <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/admin')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
              <button type="submit" disabled={isLoading} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400">
                  {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
          </div>
        </form>
      </div>

      {isImagePickerOpen && (
        <ImagePickerModal
          onClose={() => setIsImagePickerOpen(false)}
          onSelect={handleImageSelect}
        />
      )}
    </>
  );
};

export default ResourceEditor;
