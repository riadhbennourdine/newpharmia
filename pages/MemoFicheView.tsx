import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../context/DataContext';
import { useAuth } from '../hooks/useAuth';
import { CaseStudy, UserRole, MemoFicheSectionContent } from '../types';
import { ensureArray } from '../utils/array';
import getAbsoluteImageUrl from '../utils/image';
import { getIconUrl } from '../utils/icons';
import { VideoCameraIcon, KeyIcon, CheckCircleIcon, PencilIcon, TrashIcon, Spinner, ShareIcon, ImageIcon, BookOpenIcon, SparklesIcon, SimulationIcon } from '../components/Icons'; // Added ImageIcon, BookOpenIcon, SparklesIcon, SimulationIcon
import { MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import CustomChatBot from '../components/CustomChatBot';
import FlashcardDeck from '../components/FlashcardDeck';
import EmbeddableViewer from '../components/EmbeddableViewer';
import SponsoredProductCard from '../components/SponsoredProductCard';
import PremiumSponsorBlock from '../components/PremiumSponsorBlock';
import { findCampaignForText } from '../utils/campaigns';
import { campaignService } from '../services/campaignService';
import { AdCampaign } from '../types';

const ComparisonCard: React.FC<{ title: string; description: string }> = ({ title, description }) => {
    const navigate = useNavigate();
    const [linkedFiche, setLinkedFiche] = useState<CaseStudy | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLinkedFiche = async () => {
            try {
                // Search for a fiche with this title
                const response = await fetch(`/api/memofiches?search=${encodeURIComponent(title)}&limit=1`);
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    setLinkedFiche(data.data[0]);
                }
            } catch (err) {
                console.error("Error fetching linked fiche:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLinkedFiche();
    }, [title]);

    const lesionImage = linkedFiche && Array.isArray(linkedFiche.patientSituation?.content) 
        ? linkedFiche.patientSituation.content.find((c: any) => c.type === 'image')?.value 
        : linkedFiche?.coverImageUrl;

    return (
        <div className="flex flex-col sm:flex-row bg-slate-50 rounded-xl overflow-hidden border border-slate-200 hover:border-pink-300 transition-colors group">
            <div className="w-full sm:w-32 h-32 bg-slate-200 flex-shrink-0 relative overflow-hidden">
                {lesionImage ? (
                    <img src={getAbsoluteImageUrl(lesionImage)} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <ImageIcon className="h-8 w-8 opacity-20" />
                    </div>
                )}
            </div>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 group-hover:text-pink-600 transition-colors">{title}</h4>
                    {linkedFiche && (
                        <button 
                            onClick={() => navigate(`/memofiche/${linkedFiche._id}`)}
                            className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-800 hover:text-white transition-all"
                        >
                            Voir la fiche
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

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
                    <li key={index} dangerouslySetInnerHTML={{ __html: typeof item === 'string' ? item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) : item }}></li>
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
                    <li key={index} dangerouslySetInnerHTML={{ __html: typeof item === 'string' ? item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) : item }}></li>
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
                    <li key={index} dangerouslySetInnerHTML={{ __html: typeof item === 'string' ? item.replace(/\*\*(.*?)\*\*/g, `<span class="${keywordClass}">$1</span>`) : item }}></li>
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
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<AdCampaign[]>([]);

  useEffect(() => {
    const fetchCampaigns = async () => {
        try {
            const campaigns = await campaignService.getActiveCampaigns();
            setActiveCampaigns(campaigns);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        }
    };
    fetchCampaigns();
  }, []);

  const premiumCampaign = useMemo(() => {
    if (!activeCampaigns.length) return null;
    
    // Construct a large text blob to search against to find the most relevant campaign for the page
    // We prioritize Title and Treatment sections
    const searchableText = [
        caseStudy.title,
        typeof caseStudy.pathologyOverview === 'string' ? caseStudy.pathologyOverview : '',
        ensureArray(caseStudy.mainTreatment).join(' '),
        ensureArray(caseStudy.associatedProducts).join(' ')
    ].join(' ');

    // Only consider campaigns marked as premium for the sidebar slot
    const premiumCampaigns = activeCampaigns.filter(c => c.isPremium);
    return findCampaignForText(searchableText, premiumCampaigns);
  }, [caseStudy, activeCampaigns]);

  useEffect(() => {
    // Expose zoom function globally for HTML-injected images
    (window as any).zoomMemoImage = (url: string) => {
      setZoomedImage(url);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInfographicModalOpen(false);
        setZoomedImage(null);
      }
    };

    if (isInfographicModalOpen || zoomedImage) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).zoomMemoImage;
    };
  }, [isInfographicModalOpen, zoomedImage]);
  
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
          const imgUrl = getAbsoluteImageUrl(item.value);
          // Use window.zoomMemoImage defined in useEffect
          return `<div class="my-4 flex justify-center bg-slate-50 rounded-lg overflow-hidden border border-slate-100"><img src="${imgUrl}" alt="Illustration" class="w-auto max-w-full max-h-[500px] object-contain cursor-zoom-in hover:scale-[1.02] transition-transform duration-300" onclick="window.zoomMemoImage('${imgUrl}')" /></div>`;
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

  const renderSponsoredSection = (
    content: string | string[] | MemoFicheSectionContent[] | undefined,
    isRedKeywordSection: boolean = false
  ) => {
    if (!content) return null;

    // 1. If it's complex content (images/videos), fallback to default
    if (isMemoFicheSectionContentArray(content)) {
      return renderContentWithKeywords(content, isRedKeywordSection);
    }

    // 2. Normalize to array of strings
    let lines: string[] = [];
    if (Array.isArray(content)) {
      lines = content;
    } else {
      lines = String(content).split('\n');
    }

    // 3. Render each line with potential ad injection
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
            if (!line) return null;
            // Render the line content normally (markdown)
            const renderedLine = <div key={`line-${index}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(line, isRedKeywordSection) }} />;
            
            // Check for campaign match
            const campaign = findCampaignForText(line, activeCampaigns);

            if (campaign) {
            return (
                <React.Fragment key={`group-${index}`}>
                {renderedLine}
                <SponsoredProductCard
                    sponsorName={campaign.sponsorName}
                    productName={campaign.productName}
                    description={campaign.description}
                    imageUrl={campaign.imageUrl}
                    link={campaign.link}
                />
                </React.Fragment>
            );
            }
            
            return renderedLine;
        })}
      </div>
    );
  };

  const renderMarkdown = (text: string, isRedKeywordSection: boolean = false) => {
    let html = typeof text === 'string' ? text : String(text || '');

    // --- CUSTOM: Dermo Comparator Link Mapping ---
    // Detect "COMPARAISON : [Patho] | DESCRIPTION : [Desc] | LIEN_REQUIS : true"
    if (html.includes('COMPARAISON :')) {
        const regex = /COMPARAISON\s*:\s*(.*?)\s*\|\s*DESCRIPTION\s*:\s*(.*?)\s*\|\s*LIEN_REQUIS\s*:\s*true/g;
        return <div className="grid grid-cols-1 gap-4 mt-4">
            {Array.from(html.matchAll(regex)).map((match, idx) => (
                <ComparisonCard key={idx} title={match[1]} description={match[2]} />
            ))}
        </div>;
    }

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
const isMemoFicheSectionContentEmpty = (sectionContent: any): boolean => {
    if (!sectionContent) {
        return true;
    }
    // If it's not an array, it's either legacy string data or invalid.
    if (!Array.isArray(sectionContent)) {
        // Treat as empty if it's a blank string, or not a string at all.
        return typeof sectionContent === 'string' ? sectionContent.trim() === '' : true;
    }
    // Now we know it's an array.
    if (sectionContent.length === 0) {
        return true;
    }
    // Check if all items in the array are essentially empty.
    return sectionContent.every(item => !item || !item.value || item.value.trim() === '');
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

        let renderedContent;
        if (['mainTreatment', 'associatedProducts'].includes(section.id)) {
             renderedContent = renderSponsoredSection(section.data, section.isAlert);
        } else {
             renderedContent = renderContentWithKeywords(section.data, section.isAlert);
        }

        return {
            id: section.id,
            title: section.title,
            icon: section.icon,
            content: renderedContent,
            startOpen: shouldStartOpen,
        };
    });

    content.push(
      { id: "references", title: "Référence bibliographiques", icon: <img src={getAbsoluteImageUrl("https://pharmaconseilbmb.com/photos/site/icone/22.png")} className="h-6 w-6 mr-3" alt="Références" />, content: renderContentWithKeywords(caseStudy.references), contentClassName: "text-sm", startOpen: false},
    );

    return content;
  }, [caseStudy, activeCampaigns]);

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
                        icon: <img src={getAbsoluteImageUrl(getIconUrl('video-explainer'))} className="h-8 w-8" alt="Vidéo" />
                    });    }
    if (caseStudy.pdfSlideshowUrl) {
        items.push({
            id: 'diaporama' as TabName,
            label: 'Présentation',
            icon: <img src={getAbsoluteImageUrl(getIconUrl('diaporama'))} className="h-8 w-8" alt="Diaporama" />
        });
    }

    // Add other learning tool tabs only if not in "le-medicament" manual state or if they have content
        if (!isLeMedicamentManual) {
            if (hasMemoContent) {
                items.push({ id: 'memo' as TabName, label: 'Mémo', icon: <img src={getAbsoluteImageUrl(getIconUrl('memo'))} className="h-8 w-8" alt="Mémo" /> });
            }
            if (hasFlashcards) {
                items.push({ id: 'flashcards' as TabName, label: 'Flashcards', icon: <img src={getAbsoluteImageUrl(getIconUrl('flashcards'))} className="h-8 w-8" alt="Flashcards" /> });
            }
            if (!isPreview && hasQuiz) {
                items.push({ id: 'quiz' as TabName, label: 'Quiz', icon: <img src={getAbsoluteImageUrl(getIconUrl('quiz'))} className="h-8 w-8" alt="Quiz" /> });
            }
            if (!isPreview && caseStudy.kahootUrl) {
                items.push({ id: 'kahoot' as TabName, label: 'Kahoot', icon: <img src={getAbsoluteImageUrl(getIconUrl('kahoot'))} className="h-8 w-8" alt="Kahoot" /> });
            }
            if (hasGlossary) {
                items.push({ id: 'glossary' as TabName, label: 'Glossaire', icon: <img src={getAbsoluteImageUrl(getIconUrl('glossary'))} className="h-8 w-8" alt="Glossaire" /> });
            }
            if (hasYoutubeLinks) { // Note: this is for youtubeLinks, not youtubeExplainerUrl
                items.push({ id: 'media' as TabName, label: 'Média', icon: <img src={getAbsoluteImageUrl(getIconUrl('media'))} className="h-8 w-8" alt="Média" /> });
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
                    <h4 className="font-bold text-slate-800 mb-4">Présentation</h4>
                    <EmbeddableViewer source={caseStudy.pdfSlideshowUrl} />
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

              {caseStudy.theme === 'Dermatologie' && (
                  <div className="mt-12 p-8 bg-pink-600 rounded-3xl text-white text-center shadow-xl animate-fade-in">
                      <div className="inline-flex items-center justify-center h-16 w-16 bg-white/20 rounded-full mb-4">
                        <SparklesIcon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Lecture Terminée !</h3>
                      <p className="mb-8 text-pink-100 max-w-md mx-auto">
                          Mettez vos nouvelles connaissances en pratique avec une simulation finale pour valider votre progression.
                      </p>
                      <button 
                          onClick={() => navigate(`/apps/dermo/simulation/${caseStudy._id}`)}
                          className="px-10 py-4 bg-white text-pink-600 font-bold rounded-2xl hover:bg-pink-50 transition-all shadow-lg text-lg flex items-center mx-auto transform hover:scale-105 active:scale-95"
                      >
                          <SimulationIcon className="h-6 w-6 mr-2" /> Lancer la Simulation Finale
                      </button>
                  </div>
              )}

              {showQRCode && canGenerateQRCode && (
                <div className="mt-6 flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-md animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Partagez cette fiche avec ce QR Code</h3>
                  <QRCodeSVG value={window.location.href} size={256} />
                  <p className="mt-4 text-sm text-slate-600">Scannez ce code pour ouvrir cette page sur un autre appareil.</p>
                </div>
              )}
          </div>
          {(caseStudy.infographicImageUrl || premiumCampaign) && (
            <div className="lg:col-span-1 z-10 mt-8 lg:mt-32 space-y-8">
                {caseStudy.infographicImageUrl && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Infographie</h3>
                        <div 
                            className="relative group cursor-pointer rounded-lg overflow-hidden shadow-lg border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center"
                            onClick={() => setInfographicModalOpen(true)}
                        >
                            {caseStudy.infographicImageUrl.includes('canva.com') ? (
                                <div className="relative w-full h-full bg-slate-800 overflow-hidden">
                                    <iframe 
                                        src={`${caseStudy.infographicImageUrl}?embed`}
                                        title="Infographie background" 
                                        className="w-full h-full object-cover opacity-80 pointer-events-none"
                                        tabIndex={-1}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 bg-black/30 group-hover:bg-black/40 transition-colors">
                                        <span className="text-white font-bold text-lg drop-shadow-md mb-2">Infographie Synthétique</span>
                                        <span className="text-xs text-white/90 font-medium bg-black/50 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">Cliquez pour voir plein écran</span>
                                    </div>
                                </div>
                            ) : (
                                <img src={getAbsoluteImageUrl(caseStudy.infographicImageUrl)} alt="Infographie" className="w-full h-full object-contain" />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center pointer-events-none">
                                <MagnifyingGlassPlusIcon className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                            </div>
                        </div>
                    </div>
                )}
                
                {premiumCampaign && <PremiumSponsorBlock campaign={premiumCampaign} />}
            </div>
          )}
      </div>

      {isInfographicModalOpen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4" onClick={() => setInfographicModalOpen(false)}>
            <div className="w-full max-w-[95vw] h-[90vh] flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
                {caseStudy.infographicImageUrl && caseStudy.infographicImageUrl.includes('canva.com') ? (
                     <div className="w-full h-full">
                        <EmbeddableViewer source={caseStudy.infographicImageUrl} />
                     </div>
                ) : (
                    <img 
                        src={getAbsoluteImageUrl(caseStudy.infographicImageUrl || '')} 
                        alt="Infographie en plein écran" 
                        className="max-w-full max-h-full object-contain rounded-md shadow-2xl" 
                    />
                )}
                
                {/* Close Button Inside Container for better mobile UX, but absolute to screen for desktop */}
                <button 
                    onClick={() => setInfographicModalOpen(false)}
                    className="absolute -top-12 right-0 md:-right-12 text-white hover:text-gray-300 transition-colors p-2"
                    aria-label="Fermer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4" onClick={() => setZoomedImage(null)}>
            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img 
                    src={zoomedImage} 
                    alt="Zoom" 
                    className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl" 
                />
                <button 
                    onClick={() => setZoomedImage(null)}
                    className="absolute -top-12 right-0 md:-right-12 text-white hover:text-gray-300 transition-colors p-2"
                    aria-label="Fermer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

const MemoFichePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCaseStudyById, startQuiz, editCaseStudy, deleteCaseStudy } = useData();
    const { markFicheAsRead, logout, user, token } = useAuth(); // Get logout function
    const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error messages

    useEffect(() => {
        const checkAccessAndFetch = async () => {
            if (!id) return;
            setLoading(true);
            setErrorMessage(null);

            try {
                // 1. Fetch Case Study
                const data = await getCaseStudyById(id);
                if (!data) {
                    setErrorMessage('Mémofiche non trouvée.');
                    setLoading(false);
                    return;
                }

                // 2. Planning Access Control (only for Preparateurs)
                if (user?.role === UserRole.PREPARATEUR) {
                    const groupRes = await fetch('/api/groups', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (groupRes.ok) {
                        const group = await groupRes.json();
                        if (group.isPlanningEnabled && group.planning && group.planning.length > 0) {
                            const now = new Date();
                            const allowedIds = new Set<string>();
                            let hasActivePlanning = false;

                            group.planning.forEach((item: any) => {
                                if (!item.active) return;
                                const start = new Date(item.startDate);
                                const end = item.endDate ? new Date(item.endDate) : null;
                                if (start <= now && (!end || end >= now)) {
                                    allowedIds.add(item.ficheId);
                                    hasActivePlanning = true;
                                }
                            });

                            if (hasActivePlanning && !allowedIds.has(id)) {
                                setErrorMessage("Votre pharmacien a activé un parcours guidé. Cette fiche n'est pas encore ouverte pour vous.");
                                setLoading(false);
                                return;
                            }
                        }
                    }
                }

                setCaseStudy(data);
                markFicheAsRead(id);
            } catch (err: any) {
                console.error("Error fetching case study:", err);
                if (err.message === 'Unauthorized') {
                    logout();
                    navigate('/login', { replace: true });
                } else {
                    setErrorMessage('Une erreur est survenue lors du chargement de la mémofiche.');
                }
            } finally {
                setLoading(false);
            }
        };

        checkAccessAndFetch();
    }, [id, user, token]);

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
