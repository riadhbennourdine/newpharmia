import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import ManageWebinarResourcesModal from '../components/ManageWebinarResourcesModal'; // Import the modal
import AddToCartForm from '../components/AddToCartForm';

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
  const webinarId = id;
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webinarDescription, setWebinarDescription] = useState<string | null>(
    null,
  );
  const { user, token } = useAuth();
  const { findItem, addToCart } = useCart(); // Access findItem and addToCart from useCart
  const [isAdded, setIsAdded] = useState(false); // New state elevated to WebinarDetailPage
  const navigate = useNavigate();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isKahootModalOpen, setIsKahootModalOpen] = useState(false);
  const [isManageResourcesModalOpen, setIsManageResourcesModalOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('La recherche a échoué.');
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  }, [token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, handleSearchUsers]);

  const handleAddAttendee = async (userId: string) => {
    if (!webinarId || !token) return;

    setIsAddingUser(true);
    try {
      const addResponse = await fetch(`/api/webinars/${webinarId}/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        throw new Error(
          errorData.message || "Erreur lors de l'ajout du participant.",
        );
      }

      alert('Participant ajouté avec succès.');
      setSearchQuery('');
      setSearchResults([]);
      window.location.reload(); // Reload to refresh the list
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleUseCreditForMasterClass = async (webinarId: string) => {
    if (!user || !token || !webinarId) return;
    if (
      !window.confirm(
        'Voulez-vous utiliser 1 crédit Master Class pour vous inscrire à ce webinaire ?',
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/webinars/${webinarId}/register-with-credit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user._id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register with credit');
      }

      alert('Inscription confirmée avec succès ! 1 crédit a été utilisé.');
      window.location.reload();
    } catch (err: any) {
      alert(`Erreur lors de l'inscription avec crédit : ${err.message}`);
    }
  };

  const handleUpdateRegistration = async (newSlots: WebinarTimeSlot[]) => {
    if (!user || !webinarId) return;

    try {
      const response = await fetch(
        `/api/webinars/${webinarId}/attendees/${user._id}/slots`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newSlots }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update time slots');
      }

      // Refetch webinar data to show updated slots
      // The useEffect will handle the refetch
    } catch (err: any) {
      alert(`Erreur lors de la mise à jour des créneaux : ${err.message}`);
    }
  };

  const handleDeleteAttendee = async (attendeeUserId: string) => {
    if (
      !window.confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')
    ) {
      return;
    }
    try {
      const response = await fetch(
        `/api/webinars/${webinarId}/attendees/${attendeeUserId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete attendee');
      }

      alert('Participant supprimé avec succès.');
      window.location.reload(); // Reload to refresh the list
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchWebinar = async () => {
      if (!webinarId) return;

      try {
        const headers: HeadersInit = { 'Cache-Control': 'no-cache' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/webinars/${webinarId}`, { headers });

        if (!response.ok) {
          throw new Error('Failed to fetch webinar details');
        }
        const data = await response.json();
        setWebinar(data);

        // --- NEW LOGIC FOR MASTERCLASS DESCRIPTION ---
        if (data.group === WebinarGroup.MASTER_CLASS) {
          console.log(
            'WebinarDetailPage: Master Class Webinar Price:',
            data.price,
          ); // Diagnostic log
          try {
            const mdResponse = await fetch(
              '/content/master_class_description.md',
            );
            if (mdResponse.ok) {
              const mdText = await mdResponse.text();
              setWebinarDescription(mdText);
            } else {
              console.warn(
                'Failed to fetch global master_class_description.md',
              );
              setWebinarDescription(data.description); // Fallback to webinar's own description
            }
          } catch (mdErr) {
            console.error(
              'Error fetching global master_class_description.md:',
              mdErr,
            );
            setWebinarDescription(data.description); // Fallback to webinar's own description
          }
        } else {
          // Existing logic for non-MasterClass webinars
          try {
            const mdResponse = await fetch(`/content/webinars/${webinarId}.md`);
            if (mdResponse.ok) {
              const mdText = await mdResponse.text();
              setWebinarDescription(mdText);
            } else {
              setWebinarDescription(null); // Explicitly set to null if no specific MD found
            }
          } catch (mdErr) {
            console.warn(
              'No specific markdown description found, using default.',
              mdErr,
            );
            setWebinarDescription(null); // Fallback to null (which means it will use webinar.description)
          }
        }
        // --- END NEW LOGIC ---
      } catch (err: any) {
        setError(err.message);
      }
    };

    const initialLoad = async () => {
      setIsLoading(true);
      await fetchWebinar();
      setIsLoading(false);
    };
    initialLoad();

    if (webinar?.registrationStatus === 'PAYMENT_SUBMITTED') {
      const intervalId = setInterval(fetchWebinar, 5000);
      return () => clearInterval(intervalId);
    }
  }, [webinarId, token, webinar?.registrationStatus]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-red-50 text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!webinar) {
    return <div className="text-center py-20">Webinar not found.</div>;
  }

  const registrationStatus = webinar.registrationStatus;
  const registeredAttendee = webinar.attendees?.find((att) => {
    // Handle both ObjectId string and populated User object for att.userId
    const attendeeId =
      typeof att.userId === 'object'
        ? att.userId._id.toString()
        : att.userId.toString();
    return attendeeId === user?._id?.toString();
  });
  const logoUrl = getGroupLogo(webinar.group);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-4 mb-6">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${webinar.group} Logo`}
                className="h-24 w-auto mb-2"
              />
            )}
            <h1 className="text-3xl font-bold text-teal-600 text-center">
              {webinar.group === WebinarGroup.CROP_TUNIS ? (
                <>Préparateurs en Ligne - {webinar.group}</>
              ) : (
                <>Wébinaires - {webinar.group}</>
              )}
            </h1>
                        {webinar.group === WebinarGroup.MASTER_CLASS && (
                          <button
                            onClick={() =>
                              navigate('/webinars', { state: { openProgramModal: true } })
                            }
                            className="text-teal-600 hover:text-teal-800 font-medium py-2 px-4 rounded-lg border border-teal-600 hover:border-teal-800 transition-colors mt-2"
                          >
                            Voir le Programme Annuel Complet
                          </button>
                        )}
            {user?.role === UserRole.ADMIN && (
              <button
                onClick={() =>
                  navigate('/admin/webinars', {
                    state: { editWebinarId: webinar._id },
                  })
                }
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-full hover:bg-slate-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Modifier (Admin)
                                </button>
                              )}
                              {(user?.role === UserRole.ADMIN ||
                                user?.role === UserRole.ADMIN_WEBINAR) && (
                                <button
                                  onClick={() => setIsManageResourcesModalOpen(true)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375H12a2.25 2.25 0 0 1-2.25-2.25V6.75m3.75 0-3.75-3.75M9 16.5v-4.725A2.25 2.25 0 0 1 11.25 9H15m1.5 1.5.75.75M17.25 21v-2.625a3.375 3.375 0 0 0-3.375-3.375H12a2.25 2.25 0 0 1-2.25-2.25V10.5m3.75 0-3.75-3.75"
                                    />
                                  </svg>
                                  Gérer les ressources
                                </button>
                              )}
                            </div>
          <div className="relative mb-6 pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
            {' '}
            {/* 16:9 Aspect Ratio */}
            <img
              src={
                webinar.imageUrl ||
                'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'
              }
              alt={webinar.title}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10 flex flex-col justify-end p-6">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                {webinar.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg opacity-90 text-white">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span className="font-medium">
                    {webinar.group === WebinarGroup.MASTER_CLASS
                      ? `Date : ${new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                      : new Date(webinar.date).toLocaleDateString('fr-FR', {
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

          {/* NEW PRICE POSITION HERE */}
          {webinar.group === WebinarGroup.MASTER_CLASS && (
            <div className="text-right mb-4">
              <p className="text-xl font-bold text-teal-600">
                Prix du cycle Master Class (3 sessions) : 240 DT HT
              </p>
            </div>
          )}
          {webinar.group === WebinarGroup.PHARMIA && (
            <div className="text-right mb-4">
              {webinar.price === 0 ? (
                <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold text-xl animate-pulse">
                  🎁 GRATUIT
                </span>
              ) : (
                <>
                  <p className="text-xl font-bold text-teal-600">
                    Prix : {PHARMIA_WEBINAR_PRICE_HT.toFixed(3)} DT HT
                  </p>
                  <p className="text-sm text-slate-500 font-medium">
                    Soit{' '}
                    {(PHARMIA_WEBINAR_PRICE_HT * (1 + TAX_RATES.TVA)).toFixed(
                      3,
                    )}{' '}
                    DT TTC
                  </p>
                </>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-slate-700 mb-8">
                <MarkdownRenderer
                  content={
                    webinar.group === WebinarGroup.MASTER_CLASS
                      ? (webinar.description
                          ? webinar.description + '\n\n---\n\n'
                          : '') + (webinarDescription || '')
                      : webinarDescription && !isHtmlString(webinarDescription)
                        ? webinarDescription
                        : webinar.description &&
                            !isHtmlString(webinar.description)
                          ? webinar.description
                          : 'Description non disponible ou formatée incorrectement.'
                  }
                />
              </div>

              {registeredAttendee && webinar.resourcePageId && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">
                    Page de Ressources
                  </h3>
                  <Link to={`/resources/${webinar.resourcePageId}`} className="inline-block bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
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

                {registeredAttendee &&
                (registeredAttendee.status === 'PAYMENT_SUBMITTED' ||
                  registeredAttendee.status === 'CONFIRMED') ? (
                  <div>
                    <p
                      className={`font-semibold text-center mb-4 ${registeredAttendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}
                    >
                      {registeredAttendee.status === 'CONFIRMED'
                        ? 'Votre inscription est confirmée !'
                        : 'Votre inscription est en attente de validation.'}
                    </p>
                    {registeredAttendee.timeSlots &&
                      registeredAttendee.timeSlots.length > 0 &&
                      webinar.group !== WebinarGroup.MASTER_CLASS &&
                      webinar.price !== 0 && (
                        <>
                          <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            Vos créneaux choisis :
                          </h3>
                          {/* Display current slots or allow modification */}
                          <AddToCartForm
                            webinar={webinar} // Pass the webinar object
                            initialSelectedSlots={registeredAttendee.timeSlots}
                            onUpdateRegistration={handleUpdateRegistration}
                            userMasterClassCredits={
                              user?.masterClassCredits || 0
                            }
                            onUseCredit={handleUseCreditForMasterClass}
                            isAdded={isAdded} // Pass isAdded state
                            setIsAdded={setIsAdded} // Pass setIsAdded setter
                          />
                        </>
                      )}
                    {registeredAttendee.status === 'CONFIRMED' &&
                      webinar.googleMeetLink &&
                      webinar.googleMeetLink.trim() && (
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
                    isAdded={isAdded} // Pass isAdded state
                    setIsAdded={setIsAdded} // Pass setIsAdded setter
                  /> // Pass the webinar object
                )}
              </div>

              {(user?.role === UserRole.ADMIN ||
                user?.role === UserRole.ADMIN_WEBINAR) &&
                webinar.attendees && (
                  <div className="mt-8 p-4 border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-slate-800">
                      Participants ({webinar.attendees.length})
                    </h3>
                    <div className="mt-4 mb-4 p-4 border rounded-lg bg-slate-50">
                      <h4 className="font-semibold text-slate-700 mb-2">
                        Ajouter un participant manuellement
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher un utilisateur par nom..."
                          className="flex-grow p-2 border rounded-md"
                        />
                      </div>
                      {isSearching && <p>Recherche en cours...</p>}
                      <ul className="list-none mt-2">
                        {searchResults.map((userResult) => (
                          <li key={userResult._id} className="flex items-center justify-between p-2 border-b">
                            <span>{userResult.firstName} {userResult.lastName} ({userResult.email})</span>
                            <button
                              onClick={() => handleAddAttendee(userResult._id)}
                              disabled={isAddingUser}
                              className="px-3 py-1 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                            >
                              {isAddingUser ? 'Ajout...' : 'Ajouter'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ul className="list-disc list-inside mt-2 text-slate-600">
                      {webinar.attendees.map((attendee) => (
                        <li
                          key={attendee.userId.toString()}
                          className="flex items-center justify-between"
                        >
                          <span>
                            {getUserDisplayName(attendee.userId as User)} -{' '}
                            <span
                              className={`font-semibold ${attendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}
                            >
                              {attendee.status}
                            </span>
                            {attendee.proofUrl && (
                              <a
                                href={attendee.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 ml-2"
                              >
                                (Voir justificatif)
                              </a>
                            )}
                          </span>
                          {(user?.role === UserRole.ADMIN ||
                            user?.role === UserRole.ADMIN_WEBINAR) && (
                            <button
                              onClick={() =>
                                handleDeleteAttendee(
                                  (attendee.userId as User)._id.toString(),
                                )
                              }
                              className="ml-4 text-red-500 hover:text-red-700 text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {isManageResourcesModalOpen && webinar && (
        <ManageWebinarResourcesModal
          webinarId={webinar._id as string}
          resources={webinar.resources || []}
          linkedMemofiches={webinar.linkedMemofiches || []}
          kahootUrl={webinar.kahootUrl} // Pass existing kahootUrl
          onClose={() => setIsManageResourcesModalOpen(false)}
          onSave={async (
            id,
            newResources,
            newLinkedMemofiches,
            newKahootUrl,
          ) => {
            try {
              const response = await fetch(`/api/webinars/${id}/resources`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  resources: newResources,
                  linkedMemofiches: newLinkedMemofiches,
                  kahootUrl: newKahootUrl, // Include kahootUrl
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.message ||
                    'Erreur lors de la mise à jour des ressources.',
                );
              }

              alert('Ressources du webinaire mises à jour avec succès !');
              setIsManageResourcesModalOpen(false);
              // Refresh webinar data
              const refreshedWebinarResponse = await fetch(
                `/api/webinars/${id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!refreshedWebinarResponse.ok)
                throw new Error('Failed to refetch webinar after update.');
              const updatedWebinar = await refreshedWebinarResponse.json();
              setWebinar(updatedWebinar); // Update the state with new webinar data
            } catch (err: any) {
              alert(`Erreur: ${err.message}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default WebinarDetailPage;
