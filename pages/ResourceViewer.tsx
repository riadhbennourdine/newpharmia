import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ResourcePage } from '../types';
import Loader from '../components/Loader';
import { DocumentIcon, ArrowDownOnSquareIcon, VideoCameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import EmbeddableViewer from '../components/EmbeddableViewer';

const ResourceViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resourcePage, setResourcePage] = useState<ResourcePage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<{title: string, source: string} | null>(null);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      fetch(`/api/resource-pages/${id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Page de ressource non trouvée.');
          }
          return res.json();
        })
        .then(data => {
          setResourcePage(data);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, [id]);

  const getIconForResourceType = (type: string) => {
    switch (type) {
      case 'diaporama': return <ArrowDownOnSquareIcon className="h-8 w-8 text-teal-600" />;
      case 'infographie': return <PhotoIcon className="h-8 w-8 text-blue-600" />;
      case 'replay': return <VideoCameraIcon className="h-8 w-8 text-red-600" />;
      default: return <DocumentIcon className="h-8 w-8 text-gray-600" />;
    }
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;
  if (error) return <div className="text-center p-10 bg-red-50 text-red-700">{error}</div>;
  if (!resourcePage) return <div className="text-center p-10">Page de ressource non trouvée.</div>;

  return (
    <>
      <div className="bg-slate-100 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">

            <div className="relative mb-8 h-64 rounded-lg overflow-hidden shadow-2xl">
              <img src={resourcePage.coverImageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={resourcePage.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">{resourcePage.title}</h1>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="p-8">
                {resourcePage.subtitle && (
                  <p className="text-lg text-gray-600 mb-8 italic">"{resourcePage.subtitle}"</p>
                )}

                <h2 className="text-2xl font-bold text-gray-800 mb-6">Ressources à télécharger</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {resourcePage.resources.map((resource, index) => (
                    <div 
                      key={index}
                      onClick={() => setModalContent({ title: resource.title, source: resource.url })}
                      className="flex items-center p-5 border rounded-xl hover:bg-slate-50 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="flex-shrink-0 mr-5">
                        {getIconForResourceType(resource.type)}
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold text-lg text-gray-900 group-hover:text-teal-700 transition-colors">{resource.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{resource.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {modalContent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setModalContent(null)}
        >
          <div
            className="relative bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{modalContent.title}</h3>
              <button
                onClick={() => setModalContent(null)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-grow bg-slate-200">
              <EmbeddableViewer source={modalContent.source} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResourceViewer;