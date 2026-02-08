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
  const [webinarDescription, setWebinarDescription] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [isKahootModalOpen, setIsKahootModalOpen] = useState(false);
  const [isManageResourcesModalOpen, setIsManageResourcesModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
          const relatedResponse = await fetch(`/api/webinars?masterClassTheme=${encodeURIComponent(data.masterClassTheme)}`, { headers });
          if (relatedResponse.ok) {
            const relatedData = await relatedResponse.json();
            // Sort by date ascending
            relatedData.sort((a: Webinar, b: Webinar) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
  }, [id, token]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 h-screen">
        <Spinner className="text-teal-600 h-12 w-12" />
      </div>
    );
  }

  if (error) return <div className="text-center py-20 bg-red-50 text-red-700">{error}</div>;
  if (!webinar) return <div className="text-center py-20">Webinar not found.</div>;

  const registeredAttendee = webinar.attendees?.find((att) => {
    const attendeeId = typeof att.userId === 'object' ? att.userId._id.toString() : att.userId.toString();
    return attendeeId === user?._id?.toString();
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
        
          {/* Tabs for related webinars */}
          {relatedWebinars.length > 1 && webinar.masterClassTheme && (
            <div className="mb-8">
              <nav className="flex space-x-1 rounded-lg bg-slate-200 p-1" aria-label="Tabs">
                {relatedWebinars.map((related, index) => (
                  <NavLink
                    key={related._id}
                    to={`/webinars/${related._id}`}
                    className={({ isActive }) => `
                      flex-1 whitespace-nowrap text-center px-3 py-2 text-sm font-medium rounded-md transition-all
                      ${isActive ? 'bg-white text-teal-700 shadow' : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'}
                    `}
                  >
                    Session {index + 1}: {new Date(related.date).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' })}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}

          {/* Header section remains similar */}
          <div className="relative mb-6 pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
            <img
              src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'}
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
                  <span className="font-medium">{new Date(webinar.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  <span className="font-medium">Animé par {webinar.presenter}</span>
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
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">Page de Ressources</h3>
                  <Link to={`/resources/${webinar.resourcePageId}`} className="inline-block bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
                    Accéder aux ressources
                  </Link>
                </div>
              )}

              {(webinar.calculatedStatus === 'PAST' || registeredAttendee) && (webinar.resources?.length || webinar.kahootUrl) ? (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">Ressources du Webinaire</h3>
                  {webinar.resources && webinar.resources.length > 0 && (
                    <div className="space-y-6">
                      {webinar.resources.map((resource, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="text-xl font-semibold mb-2">{resource.title}</h4>
                          {resource.type === 'Diaporama' ? (
                            <EmbeddableViewer source={resource.source} />
                          ) : (
                            <a href={resource.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Accéder à la ressource
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {webinar.kahootUrl && (
                    <div className="mt-6 border rounded-lg p-4 bg-purple-50">
                      <h4 className="text-xl font-semibold mb-2 text-purple-800">Testez vos connaissances !</h4>
                      <p className="text-purple-700 mb-4">Participez à notre quiz Kahoot pour réviser les points clés de ce webinaire de manière ludique.</p>
                      <button onClick={() => setIsKahootModalOpen(true)} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                        Lancer le Quiz Kahoot
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {isKahootModalOpen && webinar.kahootUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsKahootModalOpen(false)}>
                  <div className="relative bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="text-xl font-bold text-slate-800">Quiz Kahoot</h3>
                      <button onClick={() => setIsKahootModalOpen(false)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <h2 className="text-2xl font-bold text-slate-800 mb-4">INSCRIPTION</h2>
                {registeredAttendee ? (
                  <div>
                    <p className={`font-semibold text-center mb-4 ${registeredAttendee.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-500'}`}>
                      {registeredAttendee.status === 'CONFIRMED' ? 'Votre inscription est confirmée !' : 'Votre inscription est en attente de validation.'}
                    </p>
                    {registeredAttendee.status === 'CONFIRMED' && webinar.googleMeetLink && (
                      <a href={formatUrl(webinar.googleMeetLink)} target="_blank" rel="noopener noreferrer" className="w-full mt-4 inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        <span className="mr-2">Rejoindre la conférence</span>
                        <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6" />
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
        </div>
      </div>
       {isManageResourcesModalOpen && webinar && (
        <ManageWebinarResourcesModal
          webinarId={webinar._id as string}
          resources={webinar.resources || []}
          linkedMemofiches={webinar.linkedMemofiches || []}
          kahootUrl={webinar.kahootUrl}
          onClose={() => setIsManageResourcesModalOpen(false)}
          onSave={async (id, newResources, newLinkedMemofiches, newKahootUrl) => {
            // This logic should be here or handled via a refetch
          }}
        />
      )}
    </div>
  );
};

export default WebinarDetailPage;