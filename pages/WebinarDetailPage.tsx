import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, NavLink } from 'react-router-dom';
import {
  Webinar,
  User,
  UserRole,
  WebinarTimeSlot,
  WebinarGroup,
  ProductType,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart, CartItem } from '../context/CartContext';
import {
  Spinner,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  UploadIcon,
} from '../components/Icons';
import {
  BANK_DETAILS,
  PHARMIA_WEBINAR_PRICE_HT,
  TAX_RATES,
} from '../constants';

import EmbeddableViewer from '../components/EmbeddableViewer';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import ManageWebinarResourcesModal from '../components/ManageWebinarResourcesModal';
import AddToCartForm from '../components/AddToCartForm';

const AttendeesList: React.FC<{ attendees: any[] }> = ({ attendees }) => {
  if (!attendees || attendees.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-slate-800 mb-4">Participants (0)</h3>
        <p className="text-slate-500">Aucun participant inscrit pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold text-slate-800 mb-4">
        Participants ({attendees.length})
      </h3>
      <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
        {attendees.map((attendee) => (
          <div
            key={attendee._id}
            className="p-3 bg-white rounded-md shadow-sm text-sm border"
          >
            <p className="font-semibold">
              {attendee.userId.firstName} {attendee.userId.lastName}
            </p>
            <p className="text-slate-600">{attendee.userId.email}</p>
            <p className="text-slate-500 mt-1">
              Statut: <span className="font-medium">{attendee.status}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ManualEnrollmentForm: React.FC<{
  webinarId: string;
  onEnroll: (
    webinarId: string,
    userId: string,
    userName: string,
  ) => Promise<void>;
  isEnrolling: boolean;
  token: string | null;
}> = ({ webinarId, onEnroll, isEnrolling, token }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number,
  ) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): void => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
  };

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Failed to search users:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [token]);

  useEffect(() => {
    if (query && !selectedUser) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch, selectedUser]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setQuery(`${user.firstName} ${user.lastName}`);
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      alert('Veuillez rechercher et sélectionner un utilisateur.');
      return;
    }
    await onEnroll(
      webinarId,
      selectedUser._id.toString(),
      `${selectedUser.firstName} ${selectedUser.lastName}`,
    );
    setSelectedUser(null);
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <h4 className="text-xl font-bold text-slate-800 mb-3">
        Inscription Manuelle
      </h4>
      <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-lg border">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedUser) {
                setSelectedUser(null);
              }
            }}
            placeholder="Rechercher par nom..."
            className="input input-bordered w-full"
            disabled={isEnrolling}
          />
          {(isSearching || results.length > 0) && (
            <ul className="absolute z-10 w-full max-w-xs bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
              {isSearching && (
                <li className="p-2 text-sm text-gray-500">Recherche...</li>
              )}
              {!isSearching &&
                results.map((user) => (
                  <li
                    key={user._id.toString()}
                    onClick={() => handleSelectUser(user)}
                    className="p-2 text-sm hover:bg-teal-50 cursor-pointer"
                  >
                    {user.firstName} {user.lastName} ({user.email})
                  </li>
                ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary bg-teal-600 hover:bg-teal-700 text-white"
          disabled={isEnrolling || !selectedUser}
        >
          {isEnrolling ? 'Inscription...' : 'Inscrire'}
        </button>
      </div>
    </form>
  );
};


const isHtmlString = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return (
    str.trim().startsWith('<') &&
    str.trim().endsWith('>') &&
    (/<[a-z][\s\S]*>/i.test(str) || /&lt;[a-z][\s\S]*&gt;/i.test(str))
  );
};

const formatUrl = (url: string | undefined): string => {
  if (!url) return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const getUserDisplayName = (user: Partial<User>): string => {
  if (typeof user !== 'object' || user === null) return 'ID Inconnu';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || user.email || 'Utilisateur inconnu';
};

const getGroupLogo = (group: WebinarGroup): string => {
  switch (group) {
    case WebinarGroup.CROP_TUNIS:
      return '/api/ftp/view?filePath=%2Fpharmia%2Fcropt%2Fcrop-tunis.jpg';
    case WebinarGroup.PHARMIA:
      return '/assets/logo-pharmia.png';
    default:
      return '';
  }
};

const WebinarDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [relatedWebinars, setRelatedWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webinarDescription, setWebinarDescription] = useState<string | null>(
    null,
  );
  const [isAdded, setIsAdded] = useState(false);
  const [isKahootModalOpen, setIsKahootModalOpen] = useState(false);
  const [isManageResourcesModalOpen, setIsManageResourcesModalOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    if (!id || !token || user?.role !== UserRole.ADMIN) return;
    try {
      // This endpoint needs to be created.
      // It should return attendees with populated user details.
      const response = await fetch(`/api/webinars/${id}/subscribers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        // Don't throw an error, just log it, as the endpoint might not exist yet
        console.error('Could not fetch subscribers. The endpoint might be missing.');
        return;
      }
      const data = await response.json();
      setSubscribers(data);
    } catch (error) {
      console.error('Failed to fetch subscribers', error);
    }
  }, [id, token, user]);

  const handleManualEnrollment = async (
    webinarId: string,
    userId: string,
    userName: string,
  ) => {
    if (!token) return;
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir inscrire ${userName} à ce webinaire ?`,
      )
    )
      return;

    setIsEnrolling(true);
    setError(null);
    try {
      const response = await fetch(`/api/webinars/${webinarId}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de l'inscription manuelle");
      }

      await fetchSubscribers(); // Refresh subscribers list
      alert('Utilisateur inscrit avec succès !');
    } catch (err: any) {
      setError(err.message);
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUseCreditForMasterClass = async (
    timeSlots: WebinarTimeSlot[],
  ) => {
    if (!token || !webinar || !user) return;

    // Optional: Add a more specific loading state if needed for this operation
    // setIsLoading(true);

    try {
      const response = await fetch(`/api/webinars/${webinar._id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeSlots,
          useCredit: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Display a user-friendly error message
        alert(
          data.message ||
            "Une erreur est survenue lors de l'inscription avec crédit.",
        );
        throw new Error(data.message || 'Failed to register with credit');
      }

      // Success: Optionally refresh user data to show updated credit count
      // and refresh webinar data to reflect registration status
      // You might want to trigger a global context update or a refetch here
      alert('Inscription confirmée avec succès en utilisant un crédit !');

      // Refresh webinar data
      const freshWebinarDataResponse = await fetch(
        `/api/webinars/${webinar._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache', // Ensure fresh data
          },
        },
      );
      if (!freshWebinarDataResponse.ok) {
        throw new Error(
          'Failed to refetch webinar data after credit registration.',
        );
      }
      const freshWebinarData = await freshWebinarDataResponse.json();
      setWebinar(freshWebinarData);

      // Refresh auth context user data to update credit count in UI
      // This might require a method in useAuth context to refresh user data
      // For now, we'll just reload the window for simplicity, or navigate
      window.location.reload(); // Simple but effective to refresh all states
    } catch (err: any) {
      console.error('Error in handleUseCreditForMasterClass:', err);
      setError(err.message); // Update error state for display on the page
    } finally {
      // Optional: Reset specific loading state
      // setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchWebinarData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      setRelatedWebinars([]);

      try {
        const headers: HeadersInit = { 'Cache-Control': 'no-cache' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/webinars/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch webinar details');

        const data: Webinar = await response.json();
        setWebinar(data);

        // Fetch related webinars if masterClassTheme is set
        if (data.masterClassTheme) {
          const relatedResponse = await fetch(
            `/api/webinars?masterClassTheme=${encodeURIComponent(data.masterClassTheme)}`,
            { headers },
          );
          if (relatedResponse.ok) {
            const relatedData = await relatedResponse.json();
            // Sort by date ascending
            relatedData.sort(
              (a: Webinar, b: Webinar) =>
                new Date(a.date).getTime() - new Date(b.date).getTime(),
            );
            setRelatedWebinars(relatedData);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinarData();
    fetchSubscribers();
  }, [id, token, user, fetchSubscribers]); // Added user to dependencies

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 h-screen">
        <Spinner className="text-teal-600 h-12 w-12" />
      </div>
    );
  }

  if (error)
    return (
      <div className="text-center py-20 bg-red-50 text-red-700">{error}</div>
    );
  if (!webinar)
    return <div className="text-center py-20">Webinar not found.</div>;

  const registeredAttendee = webinar.attendees?.find((att) => {
    const attendeeId =
      typeof att.userId === 'object'
        ? att.userId._id.toString()
        : att.userId.toString();
    return attendeeId === user?._id?.toString();
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Tabs for related webinars */}
          {relatedWebinars.length > 1 && webinar.masterClassTheme && (
            <div className="mb-8">
              <nav
                className="flex space-x-1 rounded-lg bg-slate-200 p-1"
                aria-label="Tabs"
              >
                {relatedWebinars.map((related, index) => (
                  <NavLink
                    key={related._id}
                    to={`/webinars/${related._id}`}
                    className={({ isActive }) => `
                      flex-1 whitespace-nowrap text-center px-3 py-2 text-sm font-medium rounded-md transition-all
                      ${isActive ? 'bg-white text-teal-700 shadow' : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'}
                    `}
                  >
                    Session {index + 1}:{' '}
                    {new Date(related.date).toLocaleDateString('fr-FR', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Header section remains similar */}
          <div className="relative mb-6 pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
            <img
              src={
                webinar.imageUrl ||
                'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'
              }
              alt={webinar.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10 flex flex-col justify-end p-6">
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                {webinar.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg opacity-90 text-white">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span className="font-medium">
                    {new Date(webinar.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  <span className="font-medium">
                    Animé par {webinar.presenter}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-slate-700 mb-8">
                <MarkdownRenderer content={webinar.description} />
              </div>

              {registeredAttendee && webinar.resourcePageId && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">
                    Page de Ressources
                  </h3>
                  <Link
                    to={`/resources/${webinar.resourcePageId}`}
                    className="inline-block bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors"
                  >
                    Accéder aux ressources
                  </Link>
                </div>
              )}

              {(webinar.calculatedStatus === 'PAST' || registeredAttendee) &&
              (webinar.resources?.length || webinar.kahootUrl) ? (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">
                    Ressources du Webinaire
                  </h3>
                  {webinar.resources && webinar.resources.length > 0 && (
                    <div className="space-y-6">
                      {webinar.resources.map((resource, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="text-xl font-semibold mb-2">
                            {resource.title}
                          </h4>
                          {resource.type === 'Diaporama' ? (
                            <EmbeddableViewer source={resource.source} />
                          ) : (
                            <a
                              href={resource.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Accéder à la ressource
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {webinar.kahootUrl && (
                    <div className="mt-6 border rounded-lg p-4 bg-purple-50">
                      <h4 className="text-xl font-semibold mb-2 text-purple-800">
                        Testez vos connaissances !
                      </h4>
                      <p className="text-purple-700 mb-4">
                        Participez à notre quiz Kahoot pour réviser les points
                        clés de ce webinaire de manière ludique.
                      </p>
                      <button
                        onClick={() => setIsKahootModalOpen(true)}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Lancer le Quiz Kahoot
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {isKahootModalOpen && webinar.kahootUrl && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                  onClick={() => setIsKahootModalOpen(false)}
                >
                  <div
                    className="relative bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="text-xl font-bold text-slate-800">
                        Quiz Kahoot
                      </h3>
                      <button
                        onClick={() => setIsKahootModalOpen(false)}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-grow">
                      <EmbeddableViewer source={webinar.kahootUrl} />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-6 rounded-lg mt-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  INSCRIPTION
                </h2>
                {registeredAttendee ? (
                  <div>
                    <p
                      className={`font-semibold text-center mb-4 ${registeredAttendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}
                    >
                      {registeredAttendee.status === 'CONFIRMED'
                        ? 'Votre inscription est confirmée !'
                        : 'Votre inscription est en attente de validation.'}
                    </p>
                    {registeredAttendee.status === 'CONFIRMED' &&
                      webinar.googleMeetLink && (
                        <a
                          href={formatUrl(webinar.googleMeetLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-4 inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                        >
                          <span className="mr-2">Rejoindre la conférence</span>
                          <img
                            src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png"
                            alt="Google Meet Logo"
                            className="h-6"
                          />
                        </a>
                      )}
                  </div>
                ) : (
                  <AddToCartForm
                    webinar={webinar}
                    userMasterClassCredits={user?.masterClassCredits || 0}
                    onUseCredit={handleUseCreditForMasterClass}
                    isAdded={isAdded}
                    setIsAdded={setIsAdded}
                  />
                )}
              </div>
            </div>
          </div>
          {user?.role === UserRole.ADMIN && (
            <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
              <AttendeesList attendees={subscribers} />
              <ManualEnrollmentForm
                webinarId={webinar._id}
                onEnroll={handleManualEnrollment}
                isEnrolling={isEnrolling}
                token={token}
              />
            </div>
          )}
        </div>
      </div>
      {isManageResourcesModalOpen && webinar && (
        <ManageWebinarResourcesModal
          webinarId={webinar._id as string}
          resources={webinar.resources || []}
          linkedMemofiches={webinar.linkedMemofiches || []}
          kahootUrl={webinar.kahootUrl}
          onClose={() => setIsManageResourcesModalOpen(false)}
          onSave={async (
            id,
            newResources,
            newLinkedMemofiches,
            newKahootUrl,
          ) => {
            // This logic should be here or handled via a refetch
          }}
        />
      )}
    </div>
  );
};

export default WebinarDetailPage;
