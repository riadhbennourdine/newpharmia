import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ResourcePage } from '../types';
import Loader from '../components/Loader';
import { DocumentIcon } from '@heroicons/react/24/outline';

const ResourceViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resourcePage, setResourcePage] = useState<ResourcePage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) return <div className="text-center p-10"><Loader /></div>;
  if (error) return <div className="bg-red-100 text-red-700 p-4 rounded-md my-4">{error}</div>;
  if (!resourcePage) return <div className="text-center p-10">Page de ressource non trouvée.</div>;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {resourcePage.coverImageUrl && (
            <div className="mb-6 pb-[40%] relative rounded-lg overflow-hidden shadow-lg">
              <img src={resourcePage.coverImageUrl} alt={resourcePage.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{resourcePage.title}</h1>
          {resourcePage.subtitle && <p className="text-xl text-gray-600 mb-8">{resourcePage.subtitle}</p>}
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ressources</h2>
            <div className="space-y-4">
              {resourcePage.resources.map((resource, index) => (
                <a 
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 border rounded-lg hover:bg-gray-100 hover:shadow-md transition-all"
                >
                  <DocumentIcon className="h-8 w-8 text-teal-600 mr-4" />
                  <div>
                    <p className="font-semibold text-lg text-gray-800">{resource.title}</p>
                    <p className="text-sm text-gray-500 capitalize">{resource.type}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceViewer;
