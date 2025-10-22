import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../hooks/useAuth';
import { CaseStudy, UserRole, MemoFicheSectionContent } from '../types';
import { VideoCameraIcon, KeyIcon, CheckCircleIcon, PencilIcon, TrashIcon, Spinner } from '../components/Icons';
import CustomChatBot from '../components/CustomChatBot';
import FlashcardDeck from '../components/FlashcardDeck';

const AccordionSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isAlert?: boolean;
    isOpen: boolean;
    onToggle: () => void;
    contentClassName?: string;
}> = ({ title, icon, children, isAlert = false, isOpen, onToggle, contentClassName = '' }) => (
    <div className="mb-2 bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden transition-all duration-300">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
            aria-expanded={isOpen}
        >
            <div className="flex items-center">
                {icon}
                <h3 className={`text-lg font-bold ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
            </div>
            <svg
                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
        </button>
        <div
            className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
            <div className={`p-4 pt-0 pl-12 space-y-2 prose max-w-none ${isAlert ? 'text-red-600' : 'text-slate-700'} ${contentClassName}`} dangerouslySetInnerHTML={{ __html: children as string }}>
            </div>
        </div>
    </div>
);

interface DetailedMemoFicheViewProps {
  caseStudy: CaseStudy;
  onBack?: () => void;
  onStartQuiz?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPreview?: boolean;
}

type TabName = 'memo' | 'flashcards' | 'quiz' | 'glossary' | 'media' | 'kahoot';


export const DetailedMemoFicheView: React.FC<DetailedMemoFicheViewProps> = ({ caseStudy, onBack, onStartQuiz, onEdit, onDelete, isPreview = false }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { user } = useAuth();
  const isAuthorized = user?.role === UserRole.ADMIN || user?.role === UserRole.FORMATEUR;
  const canEdit = isAuthorized && !isPreview;
  const canDelete = user?.role === UserRole.ADMIN && !isPreview;

  const [openSection, setOpenSection] = useState<string | null>('patientSituation');
  const [activeTab, setActiveTab] = useState<TabName>('memo');

  const handleToggle = (title: string) => setOpenSection(openSection === title ? null : title);
  
  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette mémofiche ? Cette action est irréversible.")) {
        onDelete?.();
    }
  };

  const getYoutubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    let videoId = '';
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') videoId = urlObj.pathname.slice(1);
        else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtubeeducation.com')) videoId = urlObj.searchParams.get('v') || '';
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (error) {
        console.error("Invalid YouTube URL:", error);
        return null;
    }
  };

  const formattedDate = new Date(caseStudy.creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const renderContentWithKeywords = (content: string | string[] | MemoFicheSectionContent[] | undefined, isRedKeywordSection: boolean = false) => {
    if (!content) return '';

    if (typeof content === 'string' || Array.isArray(content) && content.every(item => typeof item === 'string')) {
        const text = Array.isArray(content) ? content.join('\n') : content;
        let html = text;
        
        const keywordClass = isRedKeywordSection ? 'font-bold text-slate-800 hover:text-red-600 transition-colors duration-300' : 'font-bold text-slate-800 hover:text-teal-600 transition-colors duration-300';
        html = html.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`);
        
        const lines = html.split('\n');
        let inList = false;
        const processedLines = lines.map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
                const listItem = `<li>${trimmedLine.substring(2)}</li>`;
                if (!inList) {
                    inList = true;
                    return `<ul>${listItem}`;
                }
                return listItem;
            } else {
                if (inList) {
                    inList = false;
                    return `</ul><p>${line}</p>`;
                }
                return line ? `<p>${line}</p>` : '';
            }
        });
        if (inList) {
            processedLines.push('</ul>');
        }
        return processedLines.join('');
    }

    const contentArray = content as MemoFicheSectionContent[];
    return contentArray.map(item => {
        if (item.type === 'image') {
            return `<img src="${item.value}" alt="Image de la mémofiche" class="w-full h-auto rounded-md my-4" />`;
        }
        if (item.type === 'video') {
            const embedUrl = getYoutubeEmbedUrl(item.value);
            if (embedUrl) {
                return `<div class="w-full" style="padding-bottom: 56.25%; position: relative; height: 0; margin-top: 1rem; margin-bottom: 1rem;"><iframe src="${embedUrl}" title="Vidéo YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full rounded-md"></iframe></div>`;
            }
            return '';
        }
        // Handle text
        let html = item.value;
        const keywordClass = isRedKeywordSection ? 'font-bold text-slate-800 hover:text-red-600 transition-colors duration-300' : 'font-bold text-slate-800 hover:text-teal-600 transition-colors duration-300';
        html = html.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`);
        const lines = html.split('\n');
        let inList = false;
        const processedLines = lines.map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
                const listItem = `<li>${trimmedLine.substring(2)}</li>`;
                if (!inList) {
                    inList = true;
                    return `<ul>${listItem}`;
                }
                return listItem;
            } else {
                if (inList) {
                    inList = false;
                    return `</ul><p>${line}</p>`;
                }
                return line ? `<p>${line}</p>` : '';
            }
        });
        if (inList) {
            processedLines.push('</ul>');
        }
        return processedLines.join('');
    }).join('');
  };

  const memoContent = useMemo(() => {
    const content: any[] = [];
    if (caseStudy.type === 'dispositifs-medicaux') {
      content.push(
        { id: 'casComptoir', title: 'Cas comptoir', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/14.png" className="h-6 w-6 mr-3" alt="Cas comptoir" />, content: renderContentWithKeywords(caseStudy.casComptoir.content)},
        { id: 'objectifsConseil', title: 'Objectifs de conseil', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/15.png" className="h-6 w-6 mr-3" alt="Objectifs de conseil" />, content: renderContentWithKeywords(caseStudy.objectifsConseil.content)},
        { id: 'pathologiesConcernees', title: 'Pathologies concernées', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/16.png" className="h-6 w-6 mr-3" alt="Pathologies concernées" />, content: renderContentWithKeywords(caseStudy.pathologiesConcernees.content)},
        { id: 'interetDispositif', title: 'Intérêt du dispositif', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/18.png" className="h-6 w-6 mr-3" alt="Intérêt du dispositif" />, content: renderContentWithKeywords(caseStudy.interetDispositif.content)},
        { id: 'beneficesSante', title: 'Bénéfices pour la santé', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/19.png" className="h-6 w-6 mr-3" alt="Bénéfices pour la santé" />, content: renderContentWithKeywords(caseStudy.beneficesSante.content)},
        { id: 'dispositifsAConseiller', title: 'Dispositifs à conseiller ou à dispenser', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/20.png" className="h-6 w-6 mr-3" alt="Dispositifs à conseiller ou à dispenser" />, content: renderContentWithKeywords(caseStudy.dispositifsAConseiller.content)},
        { id: 'reponsesObjections', title: 'Réponses aux objections des clients', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/21.png" className="h-6 w-6 mr-3" alt="Réponses aux objections des clients" />, content: renderContentWithKeywords(caseStudy.reponsesObjections.content)},
        { id: 'pagesSponsorisees', title: 'Pages sponsorisées', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/22.png" className="h-6 w-6 mr-3" alt="Pages sponsorisées" />, content: renderContentWithKeywords(caseStudy.pagesSponsorisees.content)},
      );
    } else if (caseStudy.type === 'ordonnances') {
      const conseilsTraitementContent = (caseStudy.conseilsTraitement as {medicament: string, conseils: string[]}[] || []).map(ct =>
        `**${ct.medicament}**\n${ct.conseils.join('\n')}`
      ).join('\n\n');

      content.push(
        { id: 'ordonnance', title: 'Ordonnance', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/14.png" className="h-6 w-6 mr-3" alt="Ordonnance" />, content: renderContentWithKeywords(caseStudy.ordonnance as string[])},
        { id: 'analyseOrdonnance', title: 'Analyse de l\'ordonnance', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/15.png" className="h-6 w-6 mr-3" alt="Analyse de l\'ordonnance" />, content: renderContentWithKeywords(caseStudy.analyseOrdonnance as string[])},
        { id: 'conseilsTraitement', title: 'Conseils sur le traitement médicamenteux', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/18.png" className="h-6 w-6 mr-3" alt="Conseils sur le traitement médicamenteux" />, content: renderContentWithKeywords(conseilsTraitementContent)},
        { id: 'informationsMaladie', title: 'Informations sur la maladie', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/16.png" className="h-6 w-6 mr-3" alt="Informations sur la maladie" />, content: renderContentWithKeywords(caseStudy.informationsMaladie as string[])},
        { id: 'conseilsHygieneDeVie', title: 'Conseils hygiène de vie', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/20.png" className="h-6 w-6 mr-3" alt="Conseils hygiène de vie" />, content: renderContentWithKeywords(caseStudy.conseilsHygieneDeVie as string[])},
        { id: 'conseilsAlimentaires', title: 'Conseils alimentaires', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/21.png" className="h-6 w-6 mr-3" alt="Conseils alimentaires" />, content: renderContentWithKeywords(caseStudy.conseilsAlimentaires as string[])},
      );

      if (caseStudy.ventesAdditionnelles) {
        if (Array.isArray(caseStudy.ventesAdditionnelles)) {
          // Handle old format for backward compatibility
          content.push({ id: 'ventesAdditionnelles', title: 'Ventes additionnelles', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/19.png" className="h-6 w-6 mr-3" alt="Ventes additionnelles" />, content: renderContentWithKeywords(caseStudy.ventesAdditionnelles as string[])});
        } else {
          // Handle new object format
          const va = caseStudy.ventesAdditionnelles as { complementsAlimentaires?: string[], accessoires?: string[], dispositifs?: string[], cosmetiques?: string[] };
          if (va.complementsAlimentaires && va.complementsAlimentaires.length > 0) {
            content.push({ id: 'va-complements', title: 'Compléments alimentaires', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/19.png" className="h-6 w-6 mr-3" alt="Compléments alimentaires" />, content: renderContentWithKeywords(va.complementsAlimentaires)});
          }
          if (va.accessoires && va.accessoires.length > 0) {
            content.push({ id: 'va-accessoires', title: 'Accessoires', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/20.png" className="h-6 w-6 mr-3" alt="Accessoires" />, content: renderContentWithKeywords(va.accessoires)});
          }
          if (va.dispositifs && va.dispositifs.length > 0) {
            content.push({ id: 'va-dispositifs', title: 'Dispositifs', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/21.png" className="h-6 w-6 mr-3" alt="Dispositifs" />, content: renderContentWithKeywords(va.dispositifs)});
          }
          if (va.cosmetiques && va.cosmetiques.length > 0) {
            content.push({ id: 'va-cosmetiques', title: 'Cosmétiques', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/22.png" className="h-6 w-6 mr-3" alt="Cosmétiques" />, content: renderContentWithKeywords(va.cosmetiques)});
          }
        }
      }
    } else if (caseStudy.type === 'communication') {
      if (caseStudy.summary) {
        content.push({ id: 'summary', title: 'Résumé', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/14.png" className="h-6 w-6 mr-3" alt="Résumé" />, content: renderContentWithKeywords(caseStudy.summary)});
      }
      if (caseStudy.patientSituation) {
        content.push({ id: 'patientSituation', title: 'Cas comptoir', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/14.png" className="h-6 w-6 mr-3" alt="Cas comptoir" />, content: renderContentWithKeywords(caseStudy.patientSituation.content)});
      }
    } else if (caseStudy.type !== 'pharmacologie') {
      if (caseStudy.patientSituation) {
        content.push({ id: 'patientSituation', title: 'Cas comptoir', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/14.png" className="h-6 w-6 mr-3" alt="Cas comptoir" />, content: renderContentWithKeywords(caseStudy.patientSituation.content)});
      }
      if (caseStudy.keyQuestions && caseStudy.keyQuestions.length > 0) {
        content.push({ id: 'keyQuestions', title: 'Questions clés à poser', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/15.png" className="h-6 w-6 mr-3" alt="Questions clés" />, content: renderContentWithKeywords(caseStudy.keyQuestions)});
      }
      if (caseStudy.pathologyOverview) {
        content.push({ id: "pathologyOverview", title: "Aperçu pathologie", icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/16.png" className="h-6 w-6 mr-3" alt="Aperçu pathologie" />, content: renderContentWithKeywords(caseStudy.pathologyOverview.content)});
      }
      if (caseStudy.redFlags && caseStudy.redFlags.length > 0) {
        content.push({ id: "redFlags", title: "Signaux d'alerte", icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/17.png" className="h-6 w-6 mr-3" alt="Signaux d'alerte" />, content: renderContentWithKeywords(caseStudy.redFlags, true)});
      }
      if (caseStudy.recommendations) {
        content.push(
          { id: 'mainTreatment', title: 'Traitement principal', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/18.png" className="h-6 w-6 mr-3" alt="Traitement principal" />, content: renderContentWithKeywords(caseStudy.recommendations.mainTreatment)},
          { id: 'associatedProducts', title: 'Produits associés', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/19.png" className="h-6 w-6 mr-3" alt="Produits associés" />, content: renderContentWithKeywords(caseStudy.recommendations.associatedProducts)},
          { id: 'lifestyleAdvice', title: 'Hygiène de vie', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/20.png" className="h-6 w-6 mr-3" alt="Hygiène de vie" />, content: renderContentWithKeywords(caseStudy.recommendations.lifestyleAdvice)},
          { id: 'dietaryAdvice', title: 'Conseils alimentaires', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/21.png" className="h-6 w-6 mr-3" alt="Conseils alimentaires" />, content: renderContentWithKeywords(caseStudy.recommendations.dietaryAdvice)},
        );
      }
    }
    if (caseStudy.customSections && caseStudy.customSections.length > 0) {
      caseStudy.customSections.forEach((section, index) => {
        content.push({
          id: `customSection-${index}`,
          title: section.title,
          icon: <div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">{index + 1}</div>,
          content: renderContentWithKeywords(section.content),
        });
      });
    }
    content.push(
      { id: "references", title: "Références bibliographiques", icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/22.png" className="h-6 w-6 mr-3" alt="Références" />, content: renderContentWithKeywords(caseStudy.references), contentClassName: "text-sm"},
    );
    return content;
  }, [caseStudy]);

  const menuItems: { id: TabName; label: string; icon: React.ReactNode }[] = [
      { id: 'memo', label: 'Mémo', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/9.png" className="h-8 w-8" alt="Mémo" /> },
      { id: 'flashcards', label: 'Flashcards', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/10.png" className="h-8 w-8" alt="Flashcards" /> },
      ...(!isPreview ? [{ id: 'quiz' as TabName, label: 'Quiz', icon: <img src="https://pharmaconseilbmb.com/photos/site/quiz-2.png" className="h-8 w-8" alt="Quiz" /> }] : []),
      ...(!isPreview && caseStudy.kahootUrl ? [{ id: 'kahoot' as TabName, label: 'Kahoot', icon: <img src="https://pharmaconseilbmb.com/photos/site/icons8-kahoot-48.png" className="h-8 w-8" alt="Kahoot" /> }] : []),
      { id: 'glossary', label: 'Glossaire', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/12.png" className="h-8 w-8" alt="Glossaire" /> },
      { id: 'media', label: 'Média', icon: <img src="https://pharmaconseilbmb.com/photos/site/icone/13.png" className="h-8 w-8" alt="Média" /> }
  ];

  const renderContent = () => {
    switch (activeTab) {
        case 'memo': return memoContent.map(section => <AccordionSection key={section.id} {...section} isOpen={openSection === section.id} onToggle={() => handleToggle(section.id)}>{section.content}</AccordionSection>);
        case 'flashcards': return <FlashcardDeck flashcards={caseStudy.flashcards} memoFicheId={caseStudy._id as string} />;
        case 'glossary': return <div className="bg-white p-6 rounded-lg shadow-md space-y-4">{caseStudy.glossary.map((item, i) => <div key={i} className="border-b border-slate-200 pb-2"><h4 className="font-bold text-slate-800">{item.term}</h4><p className="text-slate-600">{item.definition}</p></div>)}</div>;
        case 'media':
            const youtubeEmbedUrls = (caseStudy.youtubeLinks || [])
                .map(link => ({ ...link, embedUrl: getYoutubeEmbedUrl(link.url) }))
                .filter(link => link.embedUrl);

            return youtubeEmbedUrls.length > 0 ? (
                <div className="space-y-6">
                    {youtubeEmbedUrls.map((link, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                            <h4 className="font-bold text-slate-800 mb-4">{link.title || 'Vidéo YouTube'}</h4>
                            <div className="w-full" style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
                                <iframe
                                    src={link.embedUrl!}
                                    title={link.title || 'YouTube video player'}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full rounded-md"
                                ></iframe>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <div className="text-center text-slate-500">Aucun média disponible.</div>;
        case 'quiz': return <div className="text-center bg-white p-8 rounded-lg shadow-md"><h3 className="text-2xl font-bold text-slate-800 mb-4">Testez vos connaissances !</h3><button onClick={onStartQuiz} className="inline-flex items-center bg-[#0B8278] text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-700"><CheckCircleIcon className="h-6 w-6 mr-2" /> Démarrer le Quiz</button></div>;
        case 'kahoot': return caseStudy.kahootUrl ? <div className="bg-white p-4 rounded-lg shadow-md"><h4 className="font-bold text-slate-800 mb-4">Jeu Kahoot!</h4><iframe src={caseStudy.kahootUrl} title="Kahoot! Game" frameBorder="0" allowFullScreen className="w-full rounded-md" style={{ height: '80vh' }}></iframe></div> : <div className="text-center text-slate-600">Aucun lien Kahoot! disponible.</div>;
    }
  };

  return (
    <div className="animate-fade-in container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {caseStudy.coverImageUrl ? (
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg relative h-64 flex items-end p-8 text-white bg-slate-800">
              <img src={caseStudy.coverImageUrl} alt={caseStudy.title} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: caseStudy.coverImagePosition || 'center' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
              <div className="relative z-20">
                  <h2 className="text-4xl font-extrabold tracking-tight">{caseStudy.title}</h2>
                  <div className="mt-2 text-sm font-medium opacity-90">
                      <span>{caseStudy.theme}</span><span className="mx-2">&bull;</span><span>{caseStudy.system}</span><span className="mx-2">&bull;</span><span>{`Créé le ${formattedDate}`}</span><span className="mx-2">&bull;</span><span>Statut: {caseStudy.status}</span>
                  </div>
              </div>
          </div>
      ) : (
           <div className="text-center mb-8">
              <div className="flex flex-col items-center justify-center">
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{caseStudy.title}</h2>
                  <div className="mt-2 text-sm font-medium text-slate-600">
                      <span>{caseStudy.theme}</span><span className="mx-2">&bull;</span><span>{caseStudy.system}</span><span className="mx-2">&bull;</span><span>{`Créé le ${formattedDate}`}</span><span className="mx-2">&bull;</span><span>Statut: {caseStudy.status}</span>
                  </div>
              </div>
           </div>
      )}
      
      {caseStudy.keyPoints && caseStudy.keyPoints.length > 0 && (
          <div className="mb-8 p-6 bg-teal-50 border-l-4 border-teal-500 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-teal-800 mb-3 flex items-center"><KeyIcon className="h-6 w-6 mr-3" />Points Clés à Retenir</h3>
              <ul className="space-y-2 pl-5 list-disc text-teal-900">{caseStudy.keyPoints.map((point, i) => <li key={i} className="text-base">{point}</li>)}</ul>
          </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              <div className="mb-6 border-b border-slate-200 flex space-x-0.5 sm:space-x-1 overflow-x-auto pb-px">
                 {menuItems.map(item => {
                    const isActive = activeTab === item.id;
                    const baseTabClass = 'flex flex-col items-center px-2 sm:px-3 py-2 text-sm sm:text-base font-medium rounded-t-md transition-all duration-300 border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500';
                    const activeTabClass = 'bg-white text-teal-600 border-teal-600 shadow-sm';
                    const inactiveTabClass = 'border-transparent text-slate-500 hover:text-teal-500 hover:bg-slate-50';
                    return (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`${baseTabClass} ${isActive ? activeTabClass : inactiveTabClass}`}>
                            {item.icon}
                            <span className="text-xs mt-1 text-center">{item.label}</span>
                        </button>
                    );
                 })}
              </div>
              <div key={activeTab} className="min-h-[300px] animate-fade-in">{renderContent()}</div>
               <div className="mt-8 flex items-center justify-center space-x-4"> 
                  {onBack && <button onClick={onBack} className="px-6 py-3 text-base font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300">Retour</button>}
                  {canEdit && onEdit && <button onClick={onEdit} className="px-6 py-3 text-base font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center"><PencilIcon className="h-5 w-5 mr-2" /> Modifier</button>}
                  {canDelete && onDelete && <button onClick={handleDelete} className="px-6 py-3 text-base font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center"><TrashIcon className="h-5 w-5 mr-2" /> Supprimer</button>}
              </div>
          </div>
          <aside className="lg:col-span-1 z-10"><div className="sticky top-24"><CustomChatBot title={caseStudy.title} context={JSON.stringify(caseStudy)} /></div></aside>
      </div>
    </div>
  );
};

const MemoFichePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCaseStudyById, startQuiz, editCaseStudy, deleteCaseStudy } = useData();
    const { markFicheAsRead } = useAuth(); // Get the new function
    const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getCaseStudyById(id).then(data => {
                if (data) {
                    setCaseStudy(data);
                }
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [id, getCaseStudyById]);

    // Effect to mark the fiche as read
    useEffect(() => {
        if (id) {
            markFicheAsRead(id);
        }
    }, [id, markFicheAsRead]);

    const handleDeleteAndRedirect = async () => {
        if(caseStudy) {
            await deleteCaseStudy(caseStudy._id);
            alert('Mémofiche supprimée avec succès.');
            navigate('/dashboard');
        }
    }

    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    if (!caseStudy) return <Navigate to="/dashboard" replace />;
    
    return <DetailedMemoFicheView 
        caseStudy={caseStudy}
        onBack={() => navigate('/dashboard')}
        onStartQuiz={() => startQuiz(caseStudy._id)}
        onEdit={() => editCaseStudy(caseStudy._id)}
        onDelete={handleDeleteAndRedirect}
    />;
};

export default MemoFichePage;
