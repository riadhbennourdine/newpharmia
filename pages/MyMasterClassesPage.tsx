import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Webinar, WebinarGroup, WebinarResource } from '../types';
import { fetchMyWebinars } from '../services/webinarService';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import { VideoCameraIcon, BookOpenIcon, PhotoIcon, DocumentTextIcon, PlayCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import MediaViewerModal from '../components/MediaViewerModal';
import ManageMasterClassResourcesModal from '../components/ManageMasterClassResourcesModal';
import { UserRole, ObjectId } from '../types'; // Import UserRole and ObjectId
import { updateWebinarResources } from '../services/webinarService'; // Import updateWebinarResources

type Tab = 'replays' | 'slides' | 'gallery' | 'documents';

const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
};

const ResourceCard: React.FC<{ resource: WebinarResource, onResourceClick: (resource: WebinarResource) => void }> = ({ resource, onResourceClick }) => {
    const getIcon = () => {
        switch (resource.type) {
            case 'Diaporama':
                return <BookOpenIcon className="h-8 w-8 text-teal-600" />;
            case 'Infographie':
                return <PhotoIcon className="h-8 w-8 text-teal-600" />;
            default:
                return <DocumentTextIcon className="h-8 w-8 text-teal-600" />;
        }
    };

    return (
        <button 
            onClick={() => onResourceClick(resource)}
            className="w-full text-left block p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow bg-white"
        >
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">{resource.title}</h3>
                    <p className="text-sm text-slate-500 truncate">{resource.source}</p>
                </div>
            </div>
        </button>
    );
};

const VideoCard: React.FC<{ resource: WebinarResource, onPlay: (resource: WebinarResource) => void }> = ({ resource, onPlay }) => {
    const videoId = getYoutubeVideoId(resource.source);
    if (!videoId) return null;

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return (
        <div 
            onClick={() => onPlay(resource)}
            className="group relative cursor-pointer"
        >
            <div className="relative w-full aspect-video bg-slate-200 rounded-lg overflow-hidden">
                 <img src={thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <PlayCircleIcon className="h-16 w-16 text-white text-opacity-80 transform group-hover:scale-110 transition-transform" />
                 </div>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-800">{resource.title}</h3>
        </div>
    );
};


const MyMasterClassesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [myMasterClasses, setMyMasterClasses] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('replays');

  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<WebinarResource | null>(null);

  const [isManageResourcesModalOpen, setIsManageResourcesModalOpen] = useState(false);
  const [editingMasterClassWebinar, setEditingMasterClassWebinar] = useState<Webinar | null>(null);

  const handleResourceClick = (resource: WebinarResource) => {
    setSelectedResource(resource);
    setIsMediaViewerOpen(true);
  };

  const handleCloseMediaViewer = () => {
    setSelectedResource(null);
    setIsMediaViewerOpen(false);
  };

  const handleOpenManageResourcesModal = (webinar: Webinar) => {
    setEditingMasterClassWebinar(webinar);
    setIsManageResourcesModalOpen(true);
  };

  const handleCloseManageResourcesModal = () => {
    setEditingMasterClassWebinar(null);
    setIsManageResourcesModalOpen(false);
  };

  const handleSaveManagedResources = async (
    webinarId: string,
    resources: WebinarResource[],
    linkedMemofiches: (ObjectId | string)[],
    kahootUrl: string | undefined,
  ) => {
    if (!token) {
      setError('Vous devez être connecté pour sauvegarder les ressources.');
      return;
    }
    // Note: Authorization check for ADMIN role is done on the backend
    try {
      await updateWebinarResources(
        webinarId,
        resources,
        linkedMemofiches,
        kahootUrl,
        token,
      );
      // Refresh data after saving
      const allMyWebinars = await fetchMyWebinars(token);
      const mcs = allMyWebinars.filter(
        (w) => w.group === WebinarGroup.MASTER_CLASS,
      );
      setMyMasterClasses(mcs);
      handleCloseManageResourcesModal();
    } catch (err: any) {
      console.error('Failed to save resources:', err);
      setError('Erreur lors de la sauvegarde des ressources.');
    }
  };


  useEffect(() => {
    const loadMyMasterClasses = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const allMyWebinars = await fetchMyWebinars(token);
        const mcs = allMyWebinars.filter(
          (w) => w.group === WebinarGroup.MASTER_CLASS,
        );
        setMyMasterClasses(mcs);
        if (mcs.length > 0) {
          // Auto-select the first theme based on date
          const sortedMcs = [...mcs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setSelectedTheme(sortedMcs[0].masterClassTheme || sortedMcs[0].title);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load your Master Classes.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMyMasterClasses();
  }, [token]);

  const themes = useMemo(() => {
    const themeMap: { [key: string]: Webinar } = {};
    const sortedMcs = [...myMasterClasses].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedMcs.forEach((mc) => {
      const themeName = mc.masterClassTheme || mc.title;
      if (!themeMap[themeName]) {
        themeMap[themeName] = mc;
      }
    });
    return Object.values(themeMap);
  }, [myMasterClasses]);

  const selectedMasterClass = useMemo(() => {
    // We assume resources are the same for all webinars in a theme, so we find the first one.
    return myMasterClasses.find(
      (mc) => (mc.masterClassTheme || mc.title) === selectedTheme,
    );
  }, [selectedTheme, myMasterClasses]);

  const renderContent = () => {
    if (!selectedMasterClass) {
      return (
        <div className="text-center text-slate-500 py-12">
          Veuillez sélectionner un thème.
        </div>
      );
    }
    
    const resources = selectedMasterClass.resources || [];

    switch (activeTab) {
      case 'replays':
        const replays = resources.filter(r => r.type === 'Replay' || r.type === 'youtube');
        return replays.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {replays.map((res, i) => <VideoCard key={i} resource={res} onPlay={handleResourceClick} />)}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucun replay disponible pour ce thème.</p>;
      
      case 'slides':
         const slides = resources.filter(r => r.type === 'Diaporama');
         return slides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {slides.map((res, i) => <ResourceCard key={i} resource={res} onResourceClick={handleResourceClick} />)}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucun diaporama disponible pour ce thème.</p>;

      case 'gallery':
        const images = resources.filter(r => r.type === 'Infographie');
        return images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((res, i) => (
                    <div key={i} onClick={() => handleResourceClick(res)} className="group block cursor-pointer">
                        <img 
                            src={res.source} 
                            alt={res.title || 'Lésion élémentaire'}
                            className="w-full h-40 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                        />
                        <p className="text-center text-sm mt-2 text-slate-700">{res.title}</p>
                    </div>
                ))}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucune photo disponible pour ce thème.</p>;

      case 'documents':
         const documents = resources.filter(r => r.type === 'pdf' || r.type === 'link');
         return documents.length > 0 ? (
            <div className="space-y-4">
                {documents.map((res, i) => <ResourceCard key={i} resource={res} onResourceClick={handleResourceClick} />)}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucun document disponible pour ce thème.</p>;

      default:
        return null;
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-12">{error}</div>;
  }
  
  if (myMasterClasses.length === 0) {
      return (
          <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-slate-700">Vous n'êtes inscrit à aucune Master Class</h2>
              <p className="mt-4 text-slate-500">Une fois inscrit, vos Master Class et leurs ressources apparaîtront ici.</p>
               <Link to="/webinars" className="mt-6 inline-block bg-teal-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-teal-700 transition-transform">
                Explorer les formations
              </Link>
          </div>
      )
  }

  return (
    <>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
          <h1 className="text-3xl font-bold mb-6 text-slate-800">Mes Master Class</h1>

          {/* Theme Selector */}
          <div className="mb-8 flex items-end gap-4">
            <div className="flex-1">
                <label htmlFor="theme-select" className="block text-sm font-medium text-slate-700 mb-2">
                    Thème de la Master Class
                </label>
                <select
                  id="theme-select"
                  value={selectedTheme || ''}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="w-full max-w-md p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
                >
                  {themes.map((theme) => (
                    <option key={theme._id.toString()} value={theme.masterClassTheme || theme.title}>
                      {theme.masterClassTheme || theme.title}
                    </option>
                  ))}
                </select>
            </div>
            {user?.role === UserRole.ADMIN && selectedMasterClass && (
                <button
                    onClick={() => handleOpenManageResourcesModal(selectedMasterClass)}
                    className="flex items-center gap-2 text-sm bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold px-3 py-2 rounded-md transition-colors"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                    Gérer les ressources
                </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 mb-8">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  <button onClick={() => setActiveTab('replays')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'replays' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                      Vidéos Replay
                  </button>
                   <button onClick={() => setActiveTab('slides')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'slides' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                      Diaporamas
                  </button>
                   <button onClick={() => setActiveTab('gallery')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'gallery' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                      Galerie Photos
                  </button>
                   <button onClick={() => setActiveTab('documents')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                      Documents
                  </button>
              </nav>
          </div>
          
          {/* Tab Content */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
              {renderContent()}
          </div>
        </div>

        {isMediaViewerOpen && selectedResource && (
            <MediaViewerModal
            resource={selectedResource}
            onClose={handleCloseMediaViewer}
            />
        )}

        {isManageResourcesModalOpen && editingMasterClassWebinar && (
            <ManageMasterClassResourcesModal
                webinarId={editingMasterClassWebinar._id.toString()}
                resources={editingMasterClassWebinar.resources || []}
                linkedMemofiches={editingMasterClassWebinar.linkedMemofiches || []}
                kahootUrl={editingMasterClassWebinar.kahootUrl}
                onClose={handleCloseManageResourcesModal}
                onSave={handleSaveManagedResources}
            />
        )}
    </>
  );
};

export default MyMasterClassesPage;
