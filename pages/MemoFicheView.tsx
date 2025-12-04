import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../context/DataContext';
import { useAuth } from '../hooks/useAuth';
import { CaseStudy, UserRole, MemoFicheSectionContent } from '../types';
import { ensureArray } from '../utils/array';
import getAbsoluteImageUrl from '../utils/image';
import { getIconUrl } from '../utils/icons';
import { VideoCameraIcon, KeyIcon, CheckCircleIcon, PencilIcon, TrashIcon, Spinner, ShareIcon, ImageIcon, BookOpenIcon } from '../components/Icons'; // Added ImageIcon, BookOpenIcon
import { MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import CustomChatBot from '../components/CustomChatBot';
import FlashcardDeck from '../components/FlashcardDeck';
import PdfSlideshow from '../components/PdfSlideshow';
import { getFtpViewUrl } from '../utils/ftp';

const AccordionSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isAlert?: boolean;
    startOpen?: boolean;
    contentClassName?: string;
}> = ({ title, icon, children, isAlert = false, startOpen = false, contentClassName = '' }) => {
    const [isOpen, setIsOpen] = useState(startOpen);

    const onToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
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
                <div className={`p-4 pt-0 pl-4 sm:pl-12 space-y-2 ${isAlert ? 'text-red-600' : 'text-slate-700'} ${contentClassName}`}>
                    {typeof children === 'string' ? (
                        <div dangerouslySetInnerHTML={{ __html: children }} />
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
};

const VentesAdditionnellesSection: React.FC<{ ventes: any }> = ({ ventes }) => {
    const renderList = (items: string[] | undefined) => {
        if (!items || items.length === 0) return null;
        const keywordClass = 'font-bold text-slate-800 hover:text-teal-500 transition-colors duration-300';
        return (
            <ul>
                {items.map((item, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) }}></li>
                ))}
            </ul>
        );
    };

    const sections = [
        { title: 'Compléments Alimentaires', content: renderList(ventes.complementsAlimentaires) },
        { title: 'Accessoires', content: renderList(ventes.accessoires) },
        { title: 'Dispositifs', content: renderList(ventes.dispositifs) },
        { title: 'Cosmétiques', content: renderList(ventes.cosmetiques) },
    ];

    return (
        <div>
            {sections.map(section => (
                section.content && (
                    <AccordionSection
                        key={section.title}
                        title={section.title}
                        icon={<div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">+</div>}
                    >
                        {section.content}
                    </AccordionSection>
                )
            ))}
        </div>
    );
};

const ConseilsTraitementSection: React.FC<{ conseils: any }> = ({ conseils }) => {
    const renderList = (items: string[] | undefined) => {
        if (!items || items.length === 0) return null;
        const keywordClass = 'font-bold text-slate-800 hover:text-teal-500 transition-colors duration-300';
        return (
            <ul>
                {items.map((item, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) }}></li>
                ))}
            </ul>
        );
    };

    return (
        <div>
            {(conseils as { medicament: string; conseils: string[] }[] || []).map((item, index) => (
                <AccordionSection
                    key={index}
                    title={item.medicament}
                    icon={<div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">+</div>}
                >
                    {renderList(item.conseils)}
                </AccordionSection>
            ))}
        </div>
    );
};

const ConseilsAlimentairesSection: React.FC<{ conseils: string[] }> = ({ conseils }) => {
    const aPrivilegier = conseils.filter(c => c.toLowerCase().includes('privilégier'));
    const aEviter = conseils.filter(c => c.toLowerCase().includes('éviter'));

    const renderList = (items: string[] | undefined) => {
        if (!items || items.length === 0) return null;
        const keywordClass = 'font-bold text-slate-800 hover:text-teal-500 transition-colors duration-300';
        return (
            <ul>
                {items.map((item, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) }}></li>
                ))}
            </ul>
        );
    };

    return (
        <div>
            {aPrivilegier.length > 0 && (
                <AccordionSection
                    title="Aliments à privilégier"
                    icon={<div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">+</div>}
                >
                    {renderList(aPrivilegier)}
                </AccordionSection>
            )}
            {aEviter.length > 0 && (
                <AccordionSection
                    title="Aliments à éviter"
                    icon={<div className="flex items-center justify-center h-6 w-6 mr-3 bg-red-600 text-white rounded-full font-bold text-sm">-</div>}
                >
                    {renderList(aEviter)}
                </AccordionSection>
            )}
        </div>
    );
};

interface DetailedMemoFicheViewProps {
  caseStudy: CaseStudy;
  onBack?: () => void;
  onStartQuiz?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPreview?: boolean;
}

type TabName = 'memo' | 'flashcards' | 'quiz' | 'glossary' | 'media' | 'kahoot' | 'video-explainer' | 'infographie' | 'diaporama';


export const DetailedMemoFicheView: React.FC<DetailedMemoFicheViewProps> = ({ caseStudy, onBack, onStartQuiz, onEdit, onDelete, isPreview = false }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { user } = useAuth();
  const isAuthorized = user?.role === UserRole.ADMIN || user?.role === UserRole.FORMATEUR;
  const canEdit = isAuthorized && !isPreview;
  const canDelete = user?.role === UserRole.ADMIN && !isPreview;
  const canGenerateQRCode = user?.role === UserRole.ADMIN && !isPreview;

  const [showQRCode, setShowQRCode] = useState(false);
  const [isInfographicModalOpen, setInfographicModalOpen] = useState(false);
  
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

  // Helper to check if content is MemoFicheSectionContent[]
  const isMemoFicheSectionContentArray = (content: any): content is MemoFicheSectionContent[] => {
    return Array.isArray(content) && content.every(item => typeof item === 'object' && item !== null && 'type' in item && 'value' in item);
  };

  const renderContentWithKeywords = (
    content: string | string[] | MemoFicheSectionContent[] | undefined,
    isRedKeywordSection: boolean = false
  ) => {
    if (!content) return null;

    let textContent = '';

    if (isMemoFicheSectionContentArray(content)) {
      textContent = content.map(item => {
        if (item.type === 'image') {
          return `<img src="${getAbsoluteImageUrl(item.value)}" alt="Image de la mémofiche" class="w-full h-auto rounded-md my-4" />`;
        }
        if (item.type === 'video') {
          const embedUrl = getYoutubeEmbedUrl(item.value);
          if (embedUrl) {
            return `<div class="w-full" style="padding-bottom: 56.25%; position: relative; height: 0; margin-top: 1rem; margin-bottom: 1rem;"><iframe src="${embedUrl}" title="Vidéo YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full rounded-md"></iframe></div>`;
          }
          return '';
        }
        // Assuming 'text' type
        return item.value; // Get the raw text content for markdown processing
      }).join('\n'); // Join all content parts for overall markdown processing
    } else {
      textContent = Array.isArray(content) ? content.join('\n') : content;
    }

    // Now process textContent for numerical headings and accordions
    const numericalHeadingRegex = /^\s*(?:•\s*)?(\d+\.\s.*)/gm;
    const isLongContent = textContent.length > 1000; // Define 'long' content threshold
    // Test with the original textContent to correctly identify headings
    const hasNumericalHeadings = numericalHeadingRegex.test(textContent);

    if (isLongContent && hasNumericalHeadings) {
        // Reset regex lastIndex after testing
        numericalHeadingRegex.lastIndex = 0; 
      // Split by numerical headings, preserving the delimiter for the title
      const parts = textContent.split(/(^\s*(?:•\s*)?\d+\.\s.*)/gm).filter(Boolean); // filter(Boolean) to remove empty strings

      const subsections = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.match(numericalHeadingRegex)) {
          // This is a new title
          subsections.push({ title: part, content: '' });
        } else if (subsections.length > 0) {
          // This is content for the last title
          subsections[subsections.length - 1].content += (subsections[subsections.length - 1].content ? '\n' : '') + part;
        }
      }
      
      // If no valid subsections were found or content is short, fall back to normal rendering
      if (subsections.length === 0 || !isLongContent) {
        return <div dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent, isRedKeywordSection) }} />;
      }

      return (
        <div>
          {subsections.map((subsection, index) => (
            <AccordionSection
              key={index}
              title={subsection.title.replace(/^\s*•\s*/, '')} // Remove leading bullet for title
              icon={<div className="flex items-center justify-center h-6 w-6 mr-3 bg-gray-600 text-white rounded-full font-bold text-sm">{index + 1}</div>}
              startOpen={index === 0}
            >
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(subsection.content, isRedKeywordSection) }} />
            </AccordionSection>
          ))}
        </div>
      );
    }

    // Default rendering for short content or content without numerical headings
    return <div dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent, isRedKeywordSection) }} />;
  };

  const renderMarkdown = (text: string, isRedKeywordSection: boolean = false) => {
    let html = text;

    // Keywords (bold)
    const keywordClass = isRedKeywordSection ? 'font-bold text-slate-800 hover:text-red-600 transition-colors duration-300' : 'font-bold text-slate-800 hover:text-teal-600 transition-colors duration-300';
    html = html.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`);

    // Headings (e.g., # H1, ## H2, ### H3)
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Lists (bullet points and numerical lists)
    // First, convert list items
    html = html.replace(/^\s*([*•-]) (.*)/gm, '<li>$2</li>'); // Bullet points
    html = html.replace(/^\s*(\d+\.) (.*)/gm, '<li>$1 $2</li>'); // Numerical lists (keep number in li for now)
    
    // Then, wrap consecutive list items in <ul> or <ol>
    html = html.replace(/((?:^|\n)(?:\s*<li[\s\S]*?>(?:[\s\S]*?)<\/li>))+/g, (match) => {
      // Check if the first li in the block is a numerical list item (e.g. contains "1.")
      if (match.match(/<li[^>]*>\s*\d+\./)) {
        return `<ol>${match}</ol>`;
      } else {
        return `<ul>${match}</ul>`;
      }
    });

    // Paragraphs - only wrap lines that are not part of other blocks and are not empty
    html = html.split('\n').map(line => {
        const trimmedLine = line.trim();
        // Check if the line is not empty and not already part of a block (like headings or lists)
        if (trimmedLine && !trimmedLine.match(/<(h[1-6]|ul|ol|li|div|p|img|iframe)>/i)) {
            return `<p>${trimmedLine}</p>`;
        }
        return line;
    }).join('\n');

    // Remove any remaining empty <p></p> tags that might have been created
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }

// Helper to check if a MemoFicheSection is empty
const isMemoFicheSectionContentEmpty = (sectionContent: MemoFicheSectionContent[]): boolean => {
    if (!sectionContent || sectionContent.length === 0) {
        return true;
    }
    return sectionContent.every(item => !item.value || item.value.trim() === '');
};
  
      const memoContent = useMemo(() => {
      if (caseStudy.type === 'savoir' || caseStudy.type === 'pharmacologie') {
        const content = (caseStudy.memoSections || [])
            .filter(section => !isMemoFicheSectionContentEmpty(section.content)) // Filter out empty memo sections
            .map((section, index) => ({
          id: section.id || `memoSection-${index}`,
          title: section.title,
          icon: <div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">{index + 1}</div>,
          content: renderContentWithKeywords(section.content),
          startOpen: index === 0,
        }));
        content.push(
          { id: "references", title: "Référence bibliographiques", icon: <img src={getAbsoluteImageUrl(getIconUrl('references'))} className="h-6 w-6 mr-3" alt="Références" />, content: renderContentWithKeywords(caseStudy.references), contentClassName: "text-sm", startOpen: false},
        );
        return content;
      } else if (caseStudy.type === 'ordonnances') {
        const content = [
          { id: 'ordonnance', title: 'Ordonnance', icon: <img src={getAbsoluteImageUrl(getIconUrl('ordonnance'))} className="h-6 w-6 mr-3" alt="Ordonnance" />, content: renderContentWithKeywords(caseStudy.ordonnance), startOpen: true },
          { id: 'analyseOrdonnance', title: 'Analyse de l\'ordonnance', icon: <img src={getAbsoluteImageUrl(getIconUrl('analyseOrdonnance'))} className="h-6 w-6 mr-3" alt="Analyse" />, content: renderContentWithKeywords(caseStudy.analyseOrdonnance), startOpen: false },
          { id: 'conseilsTraitement', title: 'Conseils sur le traitement', icon: <img src={getAbsoluteImageUrl(getIconUrl('conseilsTraitement'))} className="h-6 w-6 mr-3" alt="Conseils" />, content: <ConseilsTraitementSection conseils={caseStudy.conseilsTraitement} />, startOpen: false },
          { id: 'informationsMaladie', title: 'Informations sur la maladie', icon: <img src={getAbsoluteImageUrl(getIconUrl('informationsMaladie'))} className="h-6 w-6 mr-3" alt="Maladie" />, content: renderContentWithKeywords(caseStudy.informationsMaladie), startOpen: false },
          { id: 'conseilsHygieneDeVie', title: 'Conseils d\'hygiène de vie', icon: <img src={getAbsoluteImageUrl(getIconUrl('conseilsHygieneDeVie'))} className="h-6 w-6 mr-3" alt="Hygiène de vie" />, content: renderContentWithKeywords(caseStudy.conseilsHygieneDeVie), startOpen: false },
          { id: 'conseilsAlimentaires', title: 'Conseils alimentaires', icon: <img src={getAbsoluteImageUrl(getIconUrl('conseilsAlimentaires'))} className="h-6 w-6 mr-3" alt="Alimentation" />, content: <ConseilsAlimentairesSection conseils={caseStudy.conseilsAlimentaires as string[]} />, startOpen: false },
          { id: 'ventesAdditionnelles', title: 'Ventes additionnelles', icon: <img src={getAbsoluteImageUrl(getIconUrl('ventesAdditionnelles'))} className="h-6 w-6 mr-3" alt="Ventes" />, content: <VentesAdditionnellesSection ventes={caseStudy.ventesAdditionnelles} />, startOpen: false },
          { id: "references", title: "Références bibliographiques", icon: <img src={getAbsoluteImageUrl(getIconUrl('references'))} className="h-6 w-6 mr-3" alt="Références" />, content: renderContentWithKeywords(caseStudy.references), contentClassName: "text-sm", startOpen: false},
        ];
        return content;
      }
  
      const mainSections = [
        { id: 'patientSituation', title: 'Cas comptoir', icon: <img src={getAbsoluteImageUrl(getIconUrl('patientSituation'))} className="h-6 w-6 mr-3" alt="Cas comptoir" />, data: typeof caseStudy.patientSituation === 'string' ? caseStudy.patientSituation : caseStudy.patientSituation?.content, isAlert: false },
        { id: 'keyQuestions', title: 'Questions clés à poser', icon: <img src={getAbsoluteImageUrl(getIconUrl('keyQuestions'))} className="h-6 w-6 mr-3" alt="Questions clés" />, data: caseStudy.keyQuestions, isAlert: false },
        { id: 'pathologyOverview', title: "Aperçu pathologie", icon: <img src={getAbsoluteImageUrl(getIconUrl('pathologyOverview'))} className="h-6 w-6 mr-3" alt="Aperçu pathologie" />, data: typeof caseStudy.pathologyOverview === 'string' ? caseStudy.pathologyOverview : caseStudy.pathologyOverview?.content, isAlert: false },
        { id: 'redFlags', title: "Signaux d'alerte", icon: <img src={getAbsoluteImageUrl(getIconUrl('redFlags'))} className="h-6 w-6 mr-3" alt="Signaux d'alerte" />, data: caseStudy.redFlags, isAlert: true },
        { id: 'mainTreatment', title: 'Traitement principal', icon: <img src={getAbsoluteImageUrl(getIconUrl('mainTreatment'))} className="h-6 w-6 mr-3" alt="Traitement principal" />, data: (caseStudy.mainTreatment && caseStudy.mainTreatment.length > 0) ? caseStudy.mainTreatment : caseStudy.recommendations?.mainTreatment, isAlert: false },
        { id: 'associatedProducts', title: 'Produits associés', icon: <img src={getAbsoluteImageUrl(getIconUrl('associatedProducts'))} className="h-6 w-6 mr-3" alt="Produits associés" />, data: (caseStudy.associatedProducts && caseStudy.associatedProducts.length > 0) ? caseStudy.associatedProducts : caseStudy.recommendations?.associatedProducts, isAlert: false },
        { id: 'lifestyleAdvice', title: 'Hygiène de vie', icon: <img src={getAbsoluteImageUrl(getIconUrl('lifestyleAdvice'))} className="h-6 w-6 mr-3" alt="Hygiène de vie" />, data: (caseStudy.lifestyleAdvice && caseStudy.lifestyleAdvice.length > 0) ? caseStudy.lifestyleAdvice : caseStudy.recommendations?.lifestyleAdvice, isAlert: false },
        { id: 'dietaryAdvice', title: 'Conseils alimentaires', icon: <img src={getAbsoluteImageUrl(getIconUrl('dietaryAdvice'))} className="h-6 w-6 mr-3" alt="Conseils alimentaires" />, data: (caseStudy.dietaryAdvice && caseStudy.dietaryAdvice.length > 0) ? caseStudy.dietaryAdvice : caseStudy.recommendations?.dietaryAdvice, isAlert: false },
      ];
  
    const memoSectionsForDisplay = (caseStudy.memoSections || [])
        .filter(section => !isMemoFicheSectionContentEmpty(section.content)) // Filter out empty memo sections
        .map((section, index) => ({
            id: section.id || `memoSection-${index}`,
            title: section.title,
            icon: <div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">{index + 1}</div>,
            data: section.content, // Use section.content for MemoFicheSection
            isMemoSection: true,
            isAlert: false,
        }));

    const customSections = (caseStudy.customSections || []).map((section, index) => ({
      id: section.id || `customSection-${index}`,
      title: section.title,
      icon: <div className="flex items-center justify-center h-6 w-6 mr-3 bg-teal-600 text-white rounded-full font-bold text-sm">{index + 1}</div>,
      data: section.content,
      isAlert: false,
    }));

    const allSections = [...mainSections, ...memoSectionsForDisplay, ...customSections];

    let effectiveSectionOrder = ensureArray(caseStudy.sectionOrder);
    const allAvailableSectionIds = allSections.map(s => s.id);

    // Add any sections that are in allSections but not in the original sectionOrder
    const missingDefaultSectionIds = allAvailableSectionIds.filter(id => !effectiveSectionOrder.includes(id));
    effectiveSectionOrder = [...effectiveSectionOrder, ...missingDefaultSectionIds];

    const orderedSections = effectiveSectionOrder
      .map(id => allSections.find(s => s.id === id))
      .filter(Boolean);

    let isFirstSection = true;
    const content = orderedSections.map(section => {
        const shouldStartOpen = isFirstSection;
        isFirstSection = false;
        return {
            id: section.id,
            title: section.title,
            icon: section.icon,
            content: renderContentWithKeywords(section.data, section.isAlert),
            startOpen: shouldStartOpen,
        };
    });

    content.push(
      { id: "references", title: "Référence bibliographiques", icon: <img src={getAbsoluteImageUrl("https://pharmaconseilbmb.com/photos/site/icone/22.png")} className="h-6 w-6 mr-3" alt="Références" />, content: renderContentWithKeywords(caseStudy.references), contentClassName: "text-sm", startOpen: false},
    );

    return content;
  }, [caseStudy]);

  const menuItems: { id: TabName; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const hasYoutubeLinks = caseStudy.youtubeLinks && caseStudy.youtubeLinks.length > 0;
    const hasFlashcards = caseStudy.flashcards && caseStudy.flashcards.length > 0;
    const hasQuiz = caseStudy.quiz && caseStudy.quiz.length > 0;
    const hasGlossary = caseStudy.glossary && caseStudy.glossary.length > 0;
    
    // Check if memoContent actually has content based on caseStudy.memoSections
    const hasMemoContent = caseStudy.memoSections != null;

    const isLeMedicamentManual = caseStudy.type === 'le-medicament' && !hasFlashcards && !hasQuiz;

    const items: { id: TabName; label: string; icon: React.ReactNode }[] = [];

    // Prioritize "Le médicament" specific media tabs if present
    if (caseStudy.youtubeExplainerUrl) {
                    items.push({
                        id: 'video-explainer' as TabName,
                        label: 'Vidéo',
                        icon: <img src={getFtpViewUrl("media.png")} className="h-8 w-8" alt="Vidéo" />
                    });    }
    if (caseStudy.pdfSlideshowUrl) {
        items.push({
            id: 'diaporama' as TabName,
            label: 'Diaporama',
            icon: <img src={getFtpViewUrl("diaporama.png")} className="h-8 w-8" alt="Diaporama" />
        });
    }

    // Add other learning tool tabs only if not in "le-medicament" manual state or if they have content
        if (!isLeMedicamentManual) {
            if (hasMemoContent) {
                items.push({ id: 'memo' as TabName, label: 'Mémo', icon: <img src={getFtpViewUrl("memo.png")} className="h-8 w-8" alt="Mémo" /> });
            }
            if (hasFlashcards) {
                items.push({ id: 'flashcards' as TabName, label: 'Flashcards', icon: <img src={getFtpViewUrl("flashcards.png")} className="h-8 w-8" alt="Flashcards" /> });
            }
            if (!isPreview && hasQuiz) {
                items.push({ id: 'quiz' as TabName, label: 'Quiz', icon: <img src={getFtpViewUrl("quiz.png")} className="h-8 w-8" alt="Quiz" /> });
            }
            if (!isPreview && caseStudy.kahootUrl) {
                items.push({ id: 'kahoot' as TabName, label: 'Kahoot', icon: <img src={getAbsoluteImageUrl(getIconUrl('kahoot'))} className="h-8 w-8" alt="Kahoot" /> });
            }
            if (hasGlossary) {
                items.push({ id: 'glossary' as TabName, label: 'Glossaire', icon: <img src={getAbsoluteImageUrl(getIconUrl('glossary'))} className="h-8 w-8" alt="Glossaire" /> });
            }
            if (hasYoutubeLinks) { // Note: this is for youtubeLinks, not youtubeExplainerUrl
                items.push({ id: 'media' as TabName, label: 'Média', icon: <img src={getFtpViewUrl("media.png")} className="h-8 w-8" alt="Média" /> });
            }
        }    
    return items;
  }, [caseStudy.youtubeLinks, caseStudy.kahootUrl, isPreview, caseStudy.type, caseStudy.youtubeExplainerUrl, caseStudy.infographicImageUrl, caseStudy.pdfSlideshowUrl, caseStudy.flashcards, caseStudy.quiz, memoContent]);

  const [activeTab, setActiveTab] = useState<TabName>(() => {
    // Determine the initial active tab
    if (menuItems.length > 0) {
        return menuItems[0].id;
    }
    // Fallback if no specific tabs are generated (e.g., if it's a completely empty memo fiche)
    return 'memo'; 
  });

  // Ensure activeTab is always a valid tab from menuItems
  useEffect(() => {
    if (menuItems.length > 0 && !menuItems.some(item => item.id === activeTab)) {
      setActiveTab(menuItems[0].id);
    } else if (menuItems.length === 0 && activeTab !== 'memo') {
      // If no other tabs, default to memo (if memo content becomes available later)
      setActiveTab('memo');
    }
  }, [menuItems, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
        case 'memo': return memoContent.map(section => <AccordionSection key={section.id} {...section} >{section.content}</AccordionSection>);
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
        case 'video-explainer':
            const explainerEmbedUrl = getYoutubeEmbedUrl(caseStudy.youtubeExplainerUrl);
            return explainerEmbedUrl ? (
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h4 className="font-bold text-slate-800 mb-4">Vidéo Explicative</h4>
                    <div className="w-full" style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
                        <iframe
                            src={explainerEmbedUrl}
                            title="Vidéo Explicative"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full rounded-md"
                        ></iframe>
                    </div>
                </div>
            ) : <div className="text-center text-slate-500">Aucune vidéo explicative disponible.</div>;
        case 'diaporama':
            return caseStudy.pdfSlideshowUrl ? (
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h4 className="font-bold text-slate-800 mb-4">Diaporama PDF</h4>
                    <PdfSlideshow pdfUrl={caseStudy.pdfSlideshowUrl} />
                </div>
            ) : <div className="text-center text-slate-500">Aucun diaporama PDF disponible.</div>;
    }
  };

    const chatContext = {
        title: caseStudy.title,
        patientSituation: caseStudy.patientSituation,
        pathologyOverview: caseStudy.pathologyOverview,
        keyPoints: caseStudy.keyPoints,
        mainTreatment: caseStudy.mainTreatment,
        redFlags: caseStudy.redFlags,
    };

  return (
    <div className="animate-fade-in container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {caseStudy.coverImageUrl ? (
          <div className="mb-8 rounded-lg overflow-hidden shadow-lg relative h-64 flex items-end p-8 text-white bg-slate-800">
              <img src={getAbsoluteImageUrl(caseStudy.coverImageUrl)} alt={caseStudy.title} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: caseStudy.coverImagePosition || 'center' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10"></div>
              <div className="relative z-20">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">{caseStudy.title}</h2>
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
              <div className="mb-6 border-b border-slate-200 flex space-x-1 sm:space-x-2 overflow-x-auto pb-px">
                 {menuItems.map(item => {
                    const isActive = activeTab === item.id;
                    const baseTabClass = 'flex flex-col items-center px-3 py-3 text-sm sm:text-base font-medium rounded-t-md transition-all duration-300 border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500';
                    const activeTabClass = 'bg-white text-teal-600 border-teal-600 shadow-sm';
                    const inactiveTabClass = 'border-transparent text-slate-500 hover:text-teal-500 hover:bg-slate-50';
                    return (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`${baseTabClass} ${isActive ? activeTabClass : inactiveTabClass}`}>
                            {item.icon}
                            <span className="text-sm mt-1 text-center">{item.label}</span>
                        </button>
                    );
                 })}
              </div>
              <div key={activeTab} className="min-h-[300px] animate-fade-in">{renderContent()}</div>
               <div className="mt-8 flex items-center justify-center space-x-4"> 
                  {onBack && <button onClick={onBack} className="px-6 py-3 text-base font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300">Retour</button>}
                  {canEdit && onEdit && <button onClick={onEdit} className="px-6 py-3 text-base font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center"><PencilIcon className="h-5 w-5 mr-2" /> Modifier</button>}
                  {canDelete && onDelete && <button onClick={handleDelete} className="px-6 py-3 text-base font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center"><TrashIcon className="h-5 w-5 mr-2" /> Supprimer</button>}
                  {canGenerateQRCode && (
                    <button onClick={() => setShowQRCode(!showQRCode)} className="px-6 py-3 text-base font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 flex items-center">
                      <ShareIcon className="h-5 w-5 mr-2" /> Partager (QR)
                    </button>
                  )}
              </div>
              {showQRCode && canGenerateQRCode && (
                <div className="mt-6 flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-md animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Partagez cette fiche avec ce QR Code</h3>
                  <QRCodeSVG value={window.location.href} size={256} />
                  <p className="mt-4 text-sm text-slate-600">Scannez ce code pour ouvrir cette page sur un autre appareil.</p>
                </div>
              )}
          </div>
          {caseStudy.infographicImageUrl && (
            <div className="lg:col-span-1 z-10 mt-16">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Infographie</h3>
                <div 
                    className="relative group cursor-pointer rounded-lg overflow-hidden shadow-lg border border-slate-200 bg-slate-100"
                    onClick={() => setInfographicModalOpen(true)}
                >
                    <img src={getAbsoluteImageUrl(caseStudy.infographicImageUrl)} alt="Infographie" className="w-full h-auto max-h-[500px] object-contain" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                        <MagnifyingGlassPlusIcon className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                </div>
            </div>
          )}
      </div>

      {isInfographicModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setInfographicModalOpen(false)}>
            <img 
                src={getAbsoluteImageUrl(caseStudy.infographicImageUrl)} 
                alt="Infographie en plein écran" 
                className="max-w-[95vw] max-h-[95vh] object-contain" 
                onClick={(e) => e.stopPropagation()} 
            />
            <button 
                onClick={() => setInfographicModalOpen(false)}
                className="absolute top-4 right-4 bg-white rounded-full p-2 text-slate-800 hover:bg-slate-200"
                aria-label="Fermer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      )}
    </div>
  );
};

const MemoFichePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCaseStudyById, startQuiz, editCaseStudy, deleteCaseStudy } = useData();
    const { markFicheAsRead, logout } = useAuth(); // Get logout function
    const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error messages

    useEffect(() => {
        if (id) {
            setLoading(true);
            setErrorMessage(null); // Clear previous errors
            getCaseStudyById(id).then(data => {
                if (data) {
                    setCaseStudy(data);
                } else {
                    setErrorMessage('Mémofiche non trouvée.');
                }
                setLoading(false);
            }).catch(err => {
                console.error("Error fetching case study:", err);
                if (err.message === 'Unauthorized') {
                    logout(); // Log out the user
                    navigate('/login', { replace: true }); // Redirect to login
                } else if (err.message === 'Mémofiche non trouvée.') {
                    setErrorMessage('La mémofiche demandée n\'existe pas.');
                } else {
                    setErrorMessage('Une erreur est survenue lors du chargement de la mémofiche.');
                }
                setLoading(false);
            });
        }
    }, [id, getCaseStudyById, logout, navigate]);

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

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    }
    if (errorMessage) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-600 text-lg font-semibold">
                <p>{errorMessage}</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md">Retour au tableau de bord</button>
            </div>
        );
    }
    if (!caseStudy) { // Fallback, should ideally be caught by errorMessage now
        return <Navigate to="/dashboard" replace />;
    }
    
    return <DetailedMemoFicheView 
        caseStudy={caseStudy}
        onBack={() => navigate('/dashboard')}
        onStartQuiz={() => startQuiz(caseStudy._id)}
        onEdit={() => editCaseStudy(caseStudy._id)}
        onDelete={handleDeleteAndRedirect}
    />;
};

export default MemoFichePage;
