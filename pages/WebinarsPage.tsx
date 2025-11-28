import { Spinner, SparklesIcon, ShoppingCartIcon, CheckCircleIcon, PlayIcon, DocumentTextIcon, PhotoIcon, BookOpenIcon } from '../components/Icons'; // Import necessary icons

interface WebinarResourceIconProps {
    resource: WebinarResource;
}

const WebinarResourceIcon: React.FC<WebinarResourceIconProps> = ({ resource }) => {
    let IconComponent: React.ElementType;
    let label: string;

    switch (resource.type) {
        case 'youtube':
            IconComponent = PlayIcon;
            label = resource.title || 'Replay Vidéo';
            break;
        case 'infographic':
            IconComponent = PhotoIcon;
            label = resource.title || 'Infographie';
            break;
        case 'pdf':
            IconComponent = DocumentTextIcon;
            label = resource.title || 'Diaporama';
            break;
        case 'link':
            IconComponent = BookOpenIcon; // Using BookOpen for general link or MemoFiche
            label = resource.title || 'Lien';
            break;
        default:
            return null;
    }

    return (
        <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex flex-col items-center p-2 text-slate-600 hover:text-teal-600 transition-colors"
            title={label}
        >
            <IconComponent className="h-6 w-6" />
            <span className="text-xs mt-1 truncate w-full text-center">{label}</span>
        </a>
    );
};

const WebinarCard: React.FC<{ 
    webinar: Webinar & { registrationStatus?: string | null, googleMeetLink?: string | null, calculatedStatus?: WebinarStatus },
    isLiveCard?: boolean,
    isMyWebinarCard?: boolean // New prop
}> = ({ webinar, isLiveCard, isMyWebinarCard = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { findItem } = useCart();
    const isInCart = !!findItem(webinar._id as string);

    const renderButtons = () => {
        if (webinar.calculatedStatus === WebinarStatus.PAST) {
            return (
                <p className="text-sm text-slate-500 italic">Webinaire passé</p>
            );
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
        if (webinar.registrationStatus === 'CONFIRMED' && webinar.googleMeetLink) {
            return (
                <a
                    href={webinar.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                    <span className="mr-2">Rejoindre</span>
                    <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6" />
                </a>
            );
        }
        if (webinar.registrationStatus === 'PENDING' || webinar.registrationStatus === 'PAYMENT_SUBMITTED') {
            return (
                 <button
                    onClick={() => navigate(`/webinars/${webinar._id}`)}
                    className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                >
                    Voir inscription
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
                    <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-24 w-full object-cover" />
                    {webinar.calculatedStatus === WebinarStatus.LIVE && (
                        <img src="https://newpharmia-production.up.railway.app/uploads/imageFile-1762858268856-857165789.gif" alt="Live Icon" className="absolute top-2 left-2 h-12 w-12" />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-sm font-bold px-2 py-1 rounded">
                        {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </Link>
                <div className="p-4 flex flex-col">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center">
                            <Link to={`/webinars/${webinar._id}`} className="flex items-center">
                                <SparklesIcon className="h-5 w-5 text-teal-500 mr-2" />
                                {webinar.title}
                            </Link>
                        </h3>
                        {webinar.registrationStatus === 'CONFIRMED' && webinar.googleMeetLink && (
                            <a
                                href={webinar.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                            >
                                <img src="https://logos-world.net/wp-content/uploads/2022/05/Google-Meet-Symbol.png" alt="Google Meet Logo" className="h-6 mr-2" />
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
                <img src={webinar.imageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} alt={webinar.title} className="h-40 w-full object-cover" />
                {webinar.calculatedStatus === WebinarStatus.LIVE && (
                    <img src="https://newpharmia-production.up.railway.app/uploads/imageFile-1762858268856-857165789.gif" alt="Live Icon" className="absolute top-2 left-2 h-12 w-12" />
                )}
            </Link>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate flex items-center">
                    <Link to={`/webinars/${webinar._id}`} className="flex items-center">
                        <SparklesIcon className="h-5 w-5 text-teal-500 mr-2" />
                        {webinar.title}
                    </Link>
                </h3>
                <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide mt-1">Animé par {webinar.presenter}</p>
                <p className="text-xs text-slate-500 mt-1">Le {new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                {!isMyWebinarCard && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-grow">{webinar.description}</p>
                )}
            </div>
            <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50 flex flex-row justify-between items-center">
                <p className="text-xl font-bold text-teal-600 py-2">
                    {new Date(webinar.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                {renderButtons()}
            </div>
            {isMyWebinarCard && webinar.resources && webinar.resources.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-around items-center">
                    {webinar.resources.map((resource, index) => (
                        <WebinarResourceIcon key={index} resource={resource} />
                    ))}
                </div>
            )}
        </div>
    );
};


export default WebinarsPage;