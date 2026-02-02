import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Webinar, WebinarGroup, WebinarResource } from '../types';
import { fetchMyWebinars } from '../services/webinarService';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import { VideoCameraIcon, BookOpenIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

type Tab = 'replays' | 'slides' | 'gallery' | 'documents';

const ResourceCard: React.FC<{ resource: WebinarResource }> = ({ resource }) => {
    const getIcon = () => {
        switch (resource.type) {
            case 'Replay':
            case 'youtube':
                return <VideoCameraIcon className="h-8 w-8 text-teal-600" />;
            case 'Diaporama':
                return <BookOpenIcon className="h-8 w-8 text-teal-600" />;
            case 'Infographie':
                return <PhotoIcon className="h-8 w-8 text-teal-600" />;
            default:
                return <DocumentTextIcon className="h-8 w-8 text-teal-600" />;
        }
    };

    return (
        <a 
            href={resource.source} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow bg-white"
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
        </a>
    );
};


const MyMasterClassesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [myMasterClasses, setMyMasterClasses] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('replays');

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
          // Auto-select the first theme
          setSelectedTheme(mcs[0].masterClassTheme || mcs[0].title);
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
    myMasterClasses.forEach((mc) => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {replays.map((res, i) => <ResourceCard key={i} resource={res} />)}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucun replay disponible pour ce thème.</p>;
      
      case 'slides':
         const slides = resources.filter(r => r.type === 'Diaporama');
         return slides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {slides.map((res, i) => <ResourceCard key={i} resource={res} />)}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucun diaporama disponible pour ce thème.</p>;

      case 'gallery':
        const images = resources.filter(r => r.type === 'Infographie');
        return images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((res, i) => (
                    <a key={i} href={res.source} target="_blank" rel="noopener noreferrer" className="group block">
                        <img 
                            src={res.source} 
                            alt={res.title || 'Lésion élémentaire'}
                            className="w-full h-40 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                        />
                        <p className="text-center text-sm mt-2 text-slate-700">{res.title}</p>
                    </a>
                ))}
            </div>
        ) : <p className="text-center text-slate-500 py-12">Aucune photo disponible pour ce thème.</p>;

      case 'documents':
         const documents = resources.filter(r => r.type === 'pdf' || r.type === 'link');
         return documents.length > 0 ? (
            <div className="space-y-4">
                {documents.map((res, i) => <ResourceCard key={i} resource={res} />)}
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Mes Master Class</h1>

      {/* Theme Selector */}
      <div className="mb-8">
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
  );
};

export default MyMasterClassesPage;
