
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PharmiaEvent } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/Loader';
import ImagePickerModal from '../../components/ImagePickerModal';
import EmbeddableViewer from '../../components/EmbeddableViewer';

const EventEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [event, setEvent] = useState<Partial<PharmiaEvent>>({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    slidesUrl: '',
    youtubeUrls: [],
    artifacts: [],
    isPublished: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      fetch(`/api/events/admin/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => {
            if (!res.ok) {
                throw new Error('Événement non trouvé ou accès refusé.');
            }
            return res.json();
        })
        .then(data => {
            if(data) setEvent(data);
            setIsLoading(false);
        })
        .catch(() => {
            setError("Impossible de charger l'événement.");
            setIsLoading(false);
        });
    }
  }, [id, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEvent({ ...event, [e.target.name]: e.target.value });
  };
  
  const handlePublishedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEvent({ ...event, isPublished: e.target.checked });
  };

  const handleImageSelect = (imageUrl: string) => {
    setEvent({ ...event, imageUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const url = id ? `/api/events/${id}` : '/api/events';
    const method = id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error('Échec de la sauvegarde de l\'événement.');
      }
      navigate('/admin/events');
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
        <h1 className="text-3xl font-bold mb-6">{id ? 'Modifier' : 'Créer'} un événement</h1>
        {error && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
            <input type="text" name="title" id="title" value={event.title} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Résumé</label>
            <textarea name="summary" id="summary" value={event.summary} onChange={handleChange} required rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contenu (Markdown)</label>
            <textarea name="content" id="content" value={event.content} onChange={handleChange} required rows={10} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL de l'image principale</label>
            <div className="flex items-center gap-2">
                <input type="url" name="imageUrl" id="imageUrl" value={event.imageUrl} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                <button type="button" onClick={() => setIsImagePickerOpen(true)} className="mt-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">Galerie</button>
            </div>
            {event.imageUrl && <img src={event.imageUrl} alt="Aperçu" className="mt-2 h-32 w-auto rounded"/>}
          </div>
          
          <div>
            <label htmlFor="slidesUrl" className="block text-sm font-medium text-gray-700">URL du diaporama (Canva, optionnel)</label>
            <input type="url" name="slidesUrl" id="slidesUrl" value={event.slidesUrl || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            {event.slidesUrl && event.slidesUrl.includes('canva.com') && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Aperçu du diaporama :</h4>
                    <div className="w-full h-80 border rounded-md overflow-hidden">
                        <EmbeddableViewer source={event.slidesUrl} />
                    </div>
                </div>
            )}
          </div>

          <div className="flex items-center">
              <input type="checkbox" name="isPublished" id="isPublished" checked={!!event.isPublished} onChange={handlePublishedChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded" />
              <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">Publier l'événement</label>
          </div>
          
          <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/admin/events')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Annuler</button>
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

export default EventEditor;

