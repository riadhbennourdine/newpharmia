import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Webinar,
  UserRole,
  WebinarGroup,
  WebinarStatus,
  WebinarResource,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';
import {
  Spinner,
  SparklesIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  PlayIcon,
  DocumentTextIcon,
  PhotoIcon,
  BookOpenIcon,
  VideoCameraIcon,
} from './Icons'; // Assuming Icons.tsx exists

const formatUrl = (url: string | undefined): string => {
  if (!url) return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

interface WebinarResourceIconProps {
  resource: WebinarResource;
}

const WebinarResourceIcon: React.FC<WebinarResourceIconProps> = ({
  resource,
}) => {
  let IconComponent: React.ElementType;

  switch (resource.type) {
    case 'Replay':
    case 'youtube':
      IconComponent = VideoCameraIcon;
      break;
    case 'Infographie':
    case 'Diaporama':
      IconComponent = PhotoIcon;
      break;
    case 'pdf':
      IconComponent = DocumentTextIcon;
      break;
    case 'link':
    default:
      IconComponent = BookOpenIcon;
      break;
  }

  return <IconComponent className="h-6 w-6" />;
};

const WebinarCard: React.FC<{
  webinar: Webinar & {
    registrationStatus?: string | null;
    googleMeetLink?: string | null;
    calculatedStatus?: WebinarStatus;
  };
  isLiveCard?: boolean;
  isMyWebinarCard?: boolean;
  onResourceClick: (resource: WebinarResource) => void;
  onManageResources: (webinar: Webinar) => void;
  userCredits?: number; // New prop
  pharmiaCredits?: number; // New prop for PharmIA credits
  onUseCredit?: (webinarId: string) => void; // New prop
}> = ({
  webinar,
  isLiveCard,
  isMyWebinarCard = false,
  onResourceClick,
  onManageResources,
  userCredits = 0,
  pharmiaCredits = 0,
  onUseCredit,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { findItem } = useCart();
  const isInCart = !!findItem(webinar._id as string);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isWebinarAdmin = user?.role === UserRole.ADMIN_WEBINAR;
  const isMasterClass = webinar.group === WebinarGroup.MASTER_CLASS;

  const renderButtons = () => {
    if (webinar.calculatedStatus === WebinarStatus.REGISTRATION_CLOSED) {
      return (
        <p className="text-sm text-slate-500 italic">Inscriptions fermées</p>
      );
    }
    if (webinar.calculatedStatus === WebinarStatus.PAST) {
      return <p className="text-sm text-slate-500 italic">Webinaire passé</p>;
    }
    if (webinar.registrationStatus === 'CONFIRMED' && !webinar.googleMeetLink) {
      return (
        <button
          onClick={() => navigate(`/webinars/${webinar._id}`)}
          className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
        >
          Inscription validée
        </button>
      );
    }
    if (
      webinar.registrationStatus === 'CONFIRMED' &&
      webinar.googleMeetLink &&
      webinar.googleMeetLink.trim()
    ) {
      return (
        <a
          href={formatUrl(webinar.googleMeetLink)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
        >
          <span className="mr-2">Rejoindre</span>
          <img
            src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png"
            alt="Google Meet Logo"
            className="h-6"
          />
        </a>
      );
    }
    if (
      webinar.registrationStatus === 'PENDING' ||
      webinar.registrationStatus === 'PAYMENT_SUBMITTED'
    ) {
      return (
        <button
          onClick={() => navigate(`/webinars/${webinar._id}`)}
          className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
        >
          Voir inscription
        </button>
      );
    }

    // Logic for using credits (Master Class Only)
    if (isMasterClass && userCredits > 0 && onUseCredit && !isInCart) {
      return (
        <button
          onClick={() => onUseCredit(webinar._id as string)}
          className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors flex items-center"
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          Utiliser 1 crédit
        </button>
      );
    }

    // Logic for using credits (PharmIA Only)
    if (
      webinar.group === WebinarGroup.PHARMIA &&
      pharmiaCredits > 0 &&
      onUseCredit &&
      !isInCart
    ) {
      return (
        <button
          onClick={() => onUseCredit(webinar._id as string)}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          Utiliser 1 crédit PharmIA
        </button>
      );
    }

    if (isInCart) {
      return (
        <button
          onClick={() => navigate(`/webinars/${webinar._id}`)}
          className="bg-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors"
        >
          Ajouté
        </button>
      );
    }
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate(`/webinars/${webinar._id}`)}
          className="text-sm bg-slate-200 text-slate-800 font-semibold py-2 px-3 rounded-lg hover:bg-slate-300 transition-colors"
        >
          Détails et Inscriptions
        </button>
      </div>
    );
  };

  if (isLiveCard) {
    return (
      <div className="group bg-white rounded-lg border border-slate-200 hover:border-teal-500 transition-shadow duration-300 overflow-hidden flex flex-col">
        <Link to={`/webinars/${webinar._id}`} className="block relative">
          <img
            src={
              webinar.imageUrl ||
              'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'
            }
            alt={webinar.title}
            className="h-24 w-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm font-bold px-2 py-1 rounded">
            {new Date(webinar.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </Link>
        <div className="p-4 flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center">
              <Link
                to={`/webinars/${webinar._id}`}
                className="flex items-center"
              >
                {webinar.title}
              </Link>
            </h3>
            {webinar.registrationStatus === 'CONFIRMED' &&
              webinar.googleMeetLink &&
              webinar.googleMeetLink.trim() && (
                <a
                  href={formatUrl(webinar.googleMeetLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                  <img
                    src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png"
                    alt="Google Meet Logo"
                    className="h-6 mr-2"
                  />
                  Rejoindre
                </a>
              )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-lg border border-slate-200 hover:border-teal-500 transition-shadow duration-300 overflow-hidden flex flex-col">
      <Link to={`/webinars/${webinar._id}`} className="block relative">
        <img
          src={
            webinar.imageUrl ||
            'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'
          }
          alt={webinar.title}
          className="h-40 w-full object-cover"
        />
        {webinar.price === 0 && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg animate-bounce">
            GRATUIT
          </div>
        )}
      </Link>
      <div className="p-4 flex-grow flex flex-col">
        <Link to={`/webinars/${webinar._id}`} className="block">
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700">
            {isMasterClass && webinar.title.includes(' - ')
              ? webinar.title.split(' - ')[0]
              : webinar.title}
          </h3>
          {isMasterClass && webinar.title.includes(' - ') && (
            <p className="text-md font-medium text-teal-600 mt-1">
              {webinar.title.split(' - ').slice(1).join(' - ')}
            </p>
          )}
        </Link>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2">
          Animé par {webinar.presenter}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {isMasterClass
            ? `Le ${new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' })}`
            : `Le ${new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
        </p>
        {!isMyWebinarCard && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">
            {webinar.description}
          </p>
        )}
      </div>
      <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50 flex flex-row justify-between items-center">
        <p className="text-xl font-bold text-teal-600 py-2">
          {isMasterClass
            ? '240 DT HT' // Display 240 DT HT for MCs
            : new Date(webinar.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
        </p>
        {renderButtons()}
      </div>
      {isMyWebinarCard && (
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <h4 className="text-sm font-bold text-slate-700 mb-2">
            Documents et Médias
          </h4>
          {webinar.resources && webinar.resources.length > 0 ? (
            <ul className="space-y-2">
              {webinar.resources.map((resource, index) =>
                resource.source && resource.source.trim() !== '' ? (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <button
                      onClick={() => {
                        onResourceClick(resource);
                      }}
                      className="flex items-center text-sm text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      <WebinarResourceIcon resource={resource} />
                      <span className="ml-2">
                        {resource.title || resource.type}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm text-slate-600 text-red-500 italic"
                  >
                    <WebinarResourceIcon resource={resource} />
                    <span className="ml-2">
                      {resource.title || resource.type} (Source manquante)
                    </span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Aucun média ajouté pour ce webinaire.
            </p>
          )}
          {isAdmin && (
            <button
              onClick={() => onManageResources(webinar)}
              className="mt-3 bg-teal-600 text-white text-sm px-3 py-1 rounded hover:bg-teal-700"
            >
              Gérer les médias
            </button>
          )}

          {/* NOUVELLE SECTION POUR LES MÉMOFICHES LIÉES */}
          {webinar.linkedMemofiches && webinar.linkedMemofiches.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2">
                Mémofiches liées
              </h4>
              <ul className="space-y-2">
                {webinar.linkedMemofiches.map((ficheId, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <Link
                      to={`/memofiche/${ficheId}`}
                      className="flex items-center text-sm text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      <BookOpenIcon className="h-5 w-5 mr-2" />
                      {/* TODO: Récupérer le titre de la mémofiche via une API ou en peuplant le webinar object */}
                      <span>Mémofiche: {ficheId.toString()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* Admin Edit Shortcut */}
      {isAdmin && !isMyWebinarCard && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault(); // Prevent link navigation
              navigate('/admin/webinars', {
                state: { editWebinarId: webinar._id },
              });
            }}
            className="bg-slate-800 text-white p-2 rounded-full shadow-md hover:bg-slate-700 opacity-75 hover:opacity-100 transition-all"
            title="Modifier le webinaire (Admin)"
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
          </button>
        </div>
      )}
    </div>
  );
};

export default WebinarCard;
