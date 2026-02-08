import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResourcePage, ResourceLink, Webinar, WebinarGroup } from '../types';
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
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [webinarGroupFilter, setWebinarGroupFilter] = useState<WebinarGroup | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  useEffect(() => {
    // Fetch webinars for the dropdown
    fetch('/api/webinars', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setWebinars(data))
      .catch(() => setError("Impossible de charger les webinaires."));

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
    const selectedWebinarId = e.target.value;
    const selectedWebinar = webinars.find(webinar => webinar._id === selectedWebinarId);
    if (selectedWebinar) {
        setResourcePage({
            ...resourcePage,
            eventId: selectedWebinar._id,
            title: selectedWebinar.title,
            subtitle: 'Génération du résumé en cours...',
            coverImageUrl: selectedWebinar.imageUrl,
        });

        setIsSummarizing(true);
        fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text: selectedWebinar.description }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.summary) {
                setResourcePage(prev => ({ ...prev, subtitle: data.summary }));
            } else {
                setResourcePage(prev => ({ ...prev, subtitle: selectedWebinar.description }));
            }
        })
        .catch(() => {
            setResourcePage(prev => ({ ...prev, subtitle: selectedWebinar.description }));
        })
        .finally(() => setIsSummarizing(false));
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
      navigate('/admin/resources');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWebinars = webinars.filter(webinar => 
    webinarGroupFilter === 'all' || webinar.group === webinarGroupFilter
  );

  if (isLoading && !id) return <div className="text-center p-10"><Loader /></div>;

  return (
    <>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">{id ? 'Modifier' : 'Créer'} une page de ressources</h1>
        {error && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          
          {!id && (
            <div className="space-y-4 p-4 border rounded-md bg-slate-50">
              <h3 className="text-lg font-medium text-gray-900">Hériter d'un webinaire (Optionnel)</h3>
              <div>
                <label htmlFor="webinarGroup" className="block text-sm font-medium text-gray-700">Filtrer par groupe</label>
                <select 
                  id="webinarGroup" 
                  onChange={(e) => setWebinarGroupFilter(e.target.value as WebinarGroup | 'all')} 
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  value={webinarGroupFilter}
                >
                  <option value="all">Tous les groupes</option>
                  <option value={WebinarGroup.CROP_TUNIS}>CROP Tunis</option>
                  <option value={WebinarGroup.PHARMIA}>PharmIA</option>
                  <option value={WebinarGroup.MASTER_CLASS}>MasterClass</option>
                </select>
              </div>
              <div>
                <label htmlFor="event" className="block text-sm font-medium text-gray-700">Sélectionner un webinaire</label>
                <select id="event" onChange={handleEventSelect} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                  <option value="">Ne pas hériter</option>
                  {filteredWebinars.map(webinar => (
                    <option key={webinar._id} value={webinar._id}>{new Date(webinar.date).toLocaleDateString()} - {webinar.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
            <input type="text" name="title" id="title" value={resourcePage.title || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700">
              Sous-titre 
              {isSummarizing && <span className="text-xs text-gray-500 ml-2">(Génération du résumé...)</span>}
            </label>
            <input type="text" name="subtitle" id="subtitle" value={resourcePage.subtitle || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700">URL de l'image de couverture</label>
            <div className="flex items-center gap-2">
                <input type="text" name="coverImageUrl" id="coverImageUrl" value={resourcePage.coverImageUrl || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                <button type="button" onClick={() => setIsImagePickerOpen(true)} className="mt-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">Galerie</button>
            </div>
            {resourcePage.coverImageUrl && <img src={resourcePage.coverImageUrl} alt="Aperçu" className="mt-2 h-32 w-auto rounded"/>}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Ressources</h3>
            {resourcePage.resources?.map((resource, index) => (
              <div key={index} className="border p-4 rounded-md space-y-2 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Titre de la ressource" value={resource.title} onChange={(e) => handleResourceChange(index, 'title', e.target.value)} className="p-2 border border-gray-300 rounded-md" required />
                  <select value={resource.type} onChange={(e) => handleResourceChange(index, 'type', e.target.value)} className="p-2 border border-gray-300 rounded-md">
                    <option value="diaporama">Diaporama</option>
                    <option value="infographie">Infographie</option>
                    <option value="replay">Replay</option>
                    <option value="autre">Autre</option>
                  </select>
                  <input type="text" placeholder="URL de la ressource" value={resource.url} onChange={(e) => handleResourceChange(index, 'url', e.target.value)} className="p-2 border border-gray-300 rounded-md" required />
                </div>
                <button type="button" onClick={() => removeResource(index)} className="text-red-500 hover:text-red-700 text-sm font-medium">Supprimer cette ressource</button>
              </div>
            ))}
            <button type="button" onClick={addResource} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 text-sm font-semibold">Ajouter une ressource</button>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
              <button type="button" onClick={() => navigate('/admin/resources')} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 font-semibold">Annuler</button>
              <button type="submit" disabled={isLoading || isSummarizing} className="bg-teal-600 text-white px-6 py-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400 font-semibold">
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
