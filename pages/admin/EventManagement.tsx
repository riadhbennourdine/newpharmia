import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PharmiaEvent } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/Loader';

const EventManagement: React.FC = () => {
  const [events, setEvents] = useState<PharmiaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchAllEvents = async () => {
    try {
      const response = await fetch('/api/events/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error('Impossible de charger les événements.');
      const data = await response.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, [token]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      try {
        const response = await fetch(`/api/events/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Échec de la suppression.');
        fetchAllEvents(); // Refresh list
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleTogglePublish = async (event: PharmiaEvent) => {
    try {
      const response = await fetch(`/api/events/${event._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...event, isPublished: !event.isPublished }),
      });
      if (!response.ok) throw new Error('Échec de la mise à jour du statut.');
      fetchAllEvents(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    }
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
        <h1 className="text-3xl font-bold">Gestion des Événements</h1>
        <Link
          to="/admin/events/new"
          className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700"
        >
          Créer un événement
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
                Statut
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date de création
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event._id as string}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {event.title}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span
                    onClick={() => handleTogglePublish(event)}
                    className={`cursor-pointer relative inline-block px-3 py-1 font-semibold leading-tight ${event.isPublished ? 'text-green-900' : 'text-yellow-900'}`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-0 ${event.isPublished ? 'bg-green-200' : 'bg-yellow-200'} opacity-50 rounded-full`}
                    ></span>
                    <span className="relative">
                      {event.isPublished ? 'Publié' : 'Brouillon'}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button
                    onClick={() => navigate(`/admin/events/edit/${event._id}`)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(event._id as string)}
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

export default EventManagement;
