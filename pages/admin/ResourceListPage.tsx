import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResourcePage } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/Loader';

const ResourceListPage: React.FC = () => {
  const [resourcePages, setResourcePages] = useState<ResourcePage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchResourcePages = async () => {
    try {
      const response = await fetch('/api/resource-pages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error('Impossible de charger les pages de ressources.');
      const data = await response.json();
      setResourcePages(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResourcePages();
  }, [token]);

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        'Êtes-vous sûr de vouloir supprimer cette page de ressources ?',
      )
    ) {
      try {
        const response = await fetch(`/api/resource-pages/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Échec de la suppression.');
        fetchResourcePages(); // Refresh list
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/#/resources/${id}`;
    navigator.clipboard.writeText(url);
    alert('Lien copié dans le presse-papiers !');
  };

  if (isLoading)
    return (
      <div className="text-center p-10">
        <Loader />
      </div>
    );
  if (error)
    return <div className="text-center p-10 text-red-500">Erreur: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Pages de Ressources</h1>
        <Link
          to="/admin/resources/new"
          className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700"
        >
          Créer une page de ressources
        </Link>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Titre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date de création
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {resourcePages.map((page) => (
              <tr key={page._id as string}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {page.title}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {new Date(page.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button
                    onClick={() => navigate(`/resources/${page._id}`)}
                    className="text-green-600 hover:text-green-900 mr-4"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => copyLink(page._id as string)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Copier Lien
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/admin/resources/edit/${page._id}`)
                    }
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(page._id as string)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceListPage;
