import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PharmiaEvent } from '../types';
import Loader from '../components/Loader';

const EventCard: React.FC<{ event: PharmiaEvent }> = ({ event }) => (
  <Link to={`/events/${event.slug}`} className="block group">
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl">
      <img
        src={event.imageUrl}
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-teal-600 transition-colors">
          {event.title}
        </h2>
        <p className="text-gray-600 text-sm mb-4">{event.summary}</p>
        <span className="font-semibold text-teal-700">
          Lire la suite &rarr;
        </span>
      </div>
    </div>
  </Link>
);

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<PharmiaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Impossible de charger les événements.');
        }
        const data = await response.json();
        setEvents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center p-10">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Erreur: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">
        Nos Événements
      </h1>
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <EventCard key={event._id as string} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          Aucun événement à afficher pour le moment.
        </p>
      )}
    </div>
  );
};

export default EventsPage;
