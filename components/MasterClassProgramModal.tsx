import React, { useState, useEffect } from 'react';
import {
  XCircleIcon,
  CalendarIcon,
  ClockIcon,
  PencilSquareIcon,
  BookOpenIcon,
  VideoCameraIcon,
  LinkIcon,
  QuestionMarkCircleIcon,
} from './Icons';
import { Webinar, WebinarGroup, WebinarResource } from '../types';
import { useAuth } from '../hooks/useAuth';
import ManageMasterClassResourcesModal from './ManageMasterClassResourcesModal';

interface MasterClassProgramModalProps {
  onClose: () => void;
}

interface MasterClassTheme {
  theme: string;
  webinars: Webinar[];
  mainWebinar: Webinar; // Le premier wébinaire, qui porte les ressources
}

// Helper pour l'icône de ressource
const ResourceIcon: React.FC<{ type: WebinarResource['type'] }> = ({
  type,
}) => {
  switch (type) {
    case 'Replay':
    case 'youtube':
    case 'Vidéo explainer':
      return <VideoCameraIcon className="h-5 w-5 text-slate-500" />;
    case 'Diaporama':
    case 'Infographie':
    case 'pdf':
      return <BookOpenIcon className="h-5 w-5 text-slate-500" />;
    case 'link':
      return <LinkIcon className="h-5 w-5 text-slate-500" />;
    default:
      return <QuestionMarkCircleIcon className="h-5 w-5 text-slate-500" />;
  }
};

const MasterClassProgramModal: React.FC<MasterClassProgramModalProps> = ({
  onClose,
}) => {
  const { token, user } = useAuth();
  const [themes, setThemes] = useState<MasterClassTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<MasterClassTheme | null>(
    null,
  );

  const fetchMasterClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/webinars?group=${encodeURIComponent(
          WebinarGroup.MASTER_CLASS,
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        throw new Error('Failed to fetch master classes');
      }
      const allWebinars: Webinar[] = await response.json();

      // Group by masterClassTheme
      const groupedByTheme = allWebinars.reduce(
        (acc, webinar) => {
          const themeName = webinar.masterClassTheme || 'Thème non défini';
          if (!acc[themeName]) {
            acc[themeName] = [];
          }
          acc[themeName].push(webinar);
          return acc;
        },
        {} as Record<string, Webinar[]>,
      );

      // Sort webinars within each theme by date and create the final structure
      const structuredThemes: MasterClassTheme[] = Object.entries(
        groupedByTheme,
      )
        .map(([theme, webinars]) => {
          const sortedWebinars = webinars.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          return {
            theme,
            webinars: sortedWebinars,
            mainWebinar: sortedWebinars[0], // Le premier wébinaire est le principal
          };
        })
        .sort((a, b) =>
          new Date(a.mainWebinar.date).getTime() >
          new Date(b.mainWebinar.date).getTime()
            ? 1
            : -1,
        );

      setThemes(structuredThemes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMasterClasses();
    }
  }, [token]);

  const handleOpenResourcesModal = (theme: MasterClassTheme) => {
    setEditingTheme(theme);
    setIsResourcesModalOpen(true);
  };

  const handleCloseResourcesModal = () => {
    setEditingTheme(null);
    setIsResourcesModalOpen(false);
  };

  const handleSaveResources = async (
    webinarId: string,
    resources: WebinarResource[],
    linkedMemofiches: (string | ObjectId)[],
    kahootUrl?: string,
  ) => {
    try {
      const response = await fetch(`/api/webinars/${webinarId}/resources`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resources, linkedMemofiches, kahootUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to save resources',
        );
      }
      
      // Refresh data to show changes
      await fetchMasterClasses();
      handleCloseResourcesModal();

    } catch (err: any) {
      setError(err.message);
      // Optionally, keep the modal open and show an error message inside it
    }
  };
  
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      {isResourcesModalOpen && editingTheme && (
        <ManageMasterClassResourcesModal
          webinarId={editingTheme.mainWebinar._id.toString()}
          resources={editingTheme.mainWebinar.resources || []}
          linkedMemofiches={editingTheme.mainWebinar.linkedMemofiches || []}
          kahootUrl={editingTheme.mainWebinar.kahootUrl}
          onClose={handleCloseResourcesModal}
          onSave={handleSaveResources}
        />
      )}
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="h-7 w-7 text-teal-600" />
                Programme & Calendrier 2026
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Master Class Officine • Mercredis 09h00 - 13h00
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XCircleIcon className="h-8 w-8" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-10">
            {/* SECTION 1: Déroulement (Steps) - Reste statique */}
            <section>
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-l-4 border-teal-500 pl-3">
              <ClockIcon className="h-6 w-6 text-slate-400" />
              Structure d'une Matinée Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-slate-400">
                  1
                </div>
                <div className="text-teal-600 font-bold text-sm mb-1">
                  09h00 – 11h00
                </div>
                <div className="font-bold text-slate-800 mb-1">
                  Théorie & Analyse
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fondamentaux, physiopathologie et reconnaissance visuelle.
                </p>
              </div>
              {/* Step 2 */}
              <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-amber-400">
                  2
                </div>
                <div className="text-amber-600 font-bold text-sm mb-1">
                  11h00 – 11h30
                </div>
                <div className="font-bold text-slate-800 mb-1">Pause Café</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Moment d'échange convivial et networking.
                </p>
              </div>
              {/* Step 3 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-slate-400">
                  3
                </div>
                <div className="text-teal-600 font-bold text-sm mb-1">
                  11h30 – 13h00
                </div>
                <div className="font-bold text-slate-800 mb-1">
                  Pratique & Méthode
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cas comptoir, Méthode PHARMA et arbres décisionnels.
                </p>
              </div>
              {/* Step 4 */}
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-black text-indigo-400">
                  4
                </div>
                <div className="text-indigo-600 font-bold text-sm mb-1">
                  13h00
                </div>
                <div className="font-bold text-slate-800 mb-1">Clôture</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Remise des supports numériques et fiches pratiques.
                </p>
              </div>
            </div>
          </section>

            {/* SECTION 2: Calendrier (Table) */}
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-l-4 border-teal-500 pl-3">
                Planning Annuel 2026
              </h3>
              {isLoading ? (
                <div className="text-center p-8">Chargement du programme...</div>
              ) : error ? (
                <div className="text-center p-8 text-red-500">{error}</div>
              ) : (
                <div className="space-y-6">
                  {themes.map((theme, index) => (
                    <div
                      key={theme.theme}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-bold text-slate-900 flex items-center gap-3">
                          <span className="text-teal-600 font-black text-lg">
                            {index + 1}
                          </span>
                          {theme.theme}
                        </h4>
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenResourcesModal(theme)}
                            className="flex items-center gap-2 text-sm bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold px-3 py-1.5 rounded-md transition-colors"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Gérer les ressources
                          </button>
                        )}
                      </div>
                      <div className="p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Colonne des dates */}
                          <div>
                            <h5 className="font-semibold text-slate-600 mb-3 text-sm">
                              Sessions
                            </h5>
                            <ul className="space-y-2">
                              {theme.webinars.map((webinar) => (
                                <li key={webinar._id.toString()} className="flex items-center gap-3">
                                  <CalendarIcon className="h-5 w-5 text-slate-400" />
                                  <span className="text-slate-800 font-medium">
                                    {new Date(
                                      webinar.date,
                                    ).toLocaleDateString('fr-FR', {
                                      day: '2-digit',
                                      month: 'long',
                                    })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {/* Colonne des ressources */}
                          <div>
                             <h5 className="font-semibold text-slate-600 mb-3 text-sm">
                              Ressources et Supports
                            </h5>
                            {(theme.mainWebinar.resources?.length || 0) > 0 || theme.mainWebinar.kahootUrl ? (
                              <ul className="space-y-2">
                               {theme.mainWebinar.resources?.map(
                                  (resource, r_idx) => (
                                    <li key={r_idx} className="flex items-center gap-3">
                                      <ResourceIcon type={resource.type} />
                                       <a
                                        href={resource.source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-800 hover:text-teal-600 transition-colors"
                                      >
                                        {resource.title || "Lien"}
                                      </a>
                                    </li>
                                  ),
                                )}
                                {theme.mainWebinar.kahootUrl && (
                                   <li className="flex items-center gap-3">
                                      <QuestionMarkCircleIcon className="h-5 w-5 text-slate-500" />
                                       <a
                                        href={theme.mainWebinar.kahootUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-800 hover:text-teal-600 transition-colors"
                                      >
                                        Quiz Kahoot
                                      </a>
                                    </li>
                                )}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-400 italic">Aucune ressource pour le moment.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MasterClassProgramModal;
