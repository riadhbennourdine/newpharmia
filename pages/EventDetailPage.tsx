
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { PharmiaEvent } from '../types';
import { useAuth } from '../hooks/useAuth';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import Loader from '../components/Loader';

const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<PharmiaEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${slug}`);
        if (!response.ok) {
          throw new Error('Événement non trouvé.');
        }
        const data = await response.json();
        setEvent(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  if (isLoading) {
    return <div className="text-center p-10"><Loader /></div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  if (!event) {
    return <div className="text-center p-10">Événement non trouvé.</div>;
  }

  const renderGatedContent = () => {
    if (isAuthenticated) {
      return (
        <div>
          <MarkdownRenderer content={event.content} />
          {/* Render Slides, Videos, and Artifacts */}
          <div className="mt-8">
            {event.slidesUrl && <a href={event.slidesUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Voir le diaporama</a>}
            {event.youtubeUrls && event.youtubeUrls.map((video, index) => (
              <div key={index} className="mt-4">
                <h3 className="font-bold">{video.title}</h3>
                <iframe width="560" height="315" src={video.url.replace('watch?v=', 'embed/')} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
              </div>
            ))}
            {event.artifacts && event.artifacts.map((artifact, index) => (
                <div key={index} className="mt-4">
                    <a href={artifact.data.url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{artifact.title}</a>
                </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center bg-gray-100 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Contenu réservé aux membres</h2>
        <p className="mb-6">Veuillez vous connecter ou vous inscrire pour accéder au contenu complet de cet événement, y compris les documents et les vidéos.</p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="bg-teal-600 text-white px-6 py-2 rounded-md hover:bg-teal-700">Se connecter</Link>
          <Link to="/register" className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700">S'inscrire</Link>
        </div>
      </div>
    );
  };
  
  const eventUrl = window.location.href;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <article>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h1 className="text-4xl font-bold text-gray-800">{event.title}</h1>
          <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-md">
            <QRCodeSVG value={eventUrl} size={64} />
          </div>
        </div>
        <p className="text-lg text-gray-600 mb-6">{event.summary}</p>
        <img src={event.imageUrl} alt={event.title} className="w-full h-96 object-cover rounded-lg mb-8" />
        
        <div className="prose lg:prose-xl max-w-none">
            {renderGatedContent()}
        </div>
      </article>
    </div>
  );
};

export default EventDetailPage;
