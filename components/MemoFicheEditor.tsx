import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CaseStudy, QuizQuestion, Flashcard, GlossaryTerm, MemoFicheSection, MemoFicheSectionContent, MemoFicheStatus, UserRole } from '../types';
import { ensureArray } from '../utils/array';
import getAbsoluteImageUrl from '../utils/image';
import { TrashIcon, PlusCircleIcon, ChevronUpIcon, ChevronDownIcon, ShareIcon, ImageIcon, SparklesIcon, Spinner } from './Icons';
import { useAuth } from '../hooks/useAuth';
import ImageUploadModal from './ImageUploadModal';
import { buildAIPrompt } from '../utils/aiPromptBuilder'; // Import AI prompt builder
import { generateCaseStudyDraft, generateLearningTools } from '../services/geminiService'; // Import AI services

import { TOPIC_CATEGORIES } from '../constants';

interface MemoFicheEditorProps {
  initialCaseStudy?: CaseStudy;
  onSave: (caseStudy: CaseStudy) => void;
  onCancel: () => void;
}

const convertToSection = (field: string | MemoFicheSection | undefined, title: string): MemoFicheSection => {
  if (typeof field === 'object' && field !== null && 'content' in field) {
    return { ...field, content: ensureArray(field.content) };
  }
  if (typeof field === 'string') {
    return { title, content: [{ type: 'text', value: field }] };
  }
  return { title, content: [] };
};

const createSafeCaseStudy = (caseStudy: CaseStudy | undefined): CaseStudy => {
  // Determine the type, defaulting to 'maladie'
  const caseStudyType = caseStudy?.type || 'maladie';

  // Process custom sections
  const safeCustomSections = ensureArray(caseStudy?.customSections).map(section => {
    if (typeof section === 'object' && section !== null && 'title' in section && 'content' in section) {
      const content = ensureArray(section.content).map(item => {
        if (typeof item === 'object' && item !== null && 'type' in item && 'value' in item) {
          return { type: item.type, value: item.value };
        }
        if (typeof item === 'string') {
          return { type: 'text', value: item };
        }
        return { type: 'text', value: '' };
      });
      return { id: section.id || `custom-${Date.now()}`, title: section.title, content };
    }
    if (typeof section === 'string') {
        return { id: `custom-${Date.now()}`, title: 'Section', content: [{ type: 'text', value: section }] };
    }
    return { id: (section as any)?.id || `custom-${Date.now()}`, title: (section as any)?.title || '', content: [] };
  });

  // Build a list of default dynamic section IDs based on the caseStudy type
  const defaultDynamicSectionIds: string[] = [];
  if (caseStudyType === 'maladie') {
    defaultDynamicSectionIds.push('patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags');
  } else if (caseStudyType === 'dispositifs-medicaux') {
    defaultDynamicSectionIds.push('casComptoir', 'objectifsConseil', 'pathologiesConcernees', 'interetDispositif', 'beneficesSante', 'dispositifsAConseiller', 'reponsesObjections', 'pagesSponsorisees', 'referencesBibliographiquesDM');
  } else if (caseStudyType === 'ordonnances') {
    defaultDynamicSectionIds.push('ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles');
  }

  // Add common dynamic sections if not already covered by specific types
  // This ensures 'mainTreatment', 'associatedProducts', etc., are only added if the type isn't too specific
  const excludedTypesForCommonDynamicSections = ['dispositifs-medicaux', 'dermocosmetique', 'ordonnances', 'savoir', 'maladie', 'communication', 'le-medicament']; 
  if (!excludedTypesForCommonDynamicSections.includes(caseStudyType)) {
    defaultDynamicSectionIds.push('mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'keyPoints');
  }
  defaultDynamicSectionIds.push('references'); // Always add references

  // Logic for memoSections (creates a default if needed for 'maladie' type, otherwise just ensures array format)
  let finalMemoSections = ensureArray(caseStudy?.memoSections).map((section, index) => {
    if (typeof section === 'object' && section !== null && 'title' in section && 'content' in section) {
      const content = ensureArray(section.content).map(item => {
        if (typeof item === 'object' && item !== null && 'type' in item && 'value' in item) {
          return { type: item.type, value: item.value };
        }
        if (typeof item === 'string') {
          return { type: 'text', value: item };
        }
        return { type: 'text', value: '' };
      });
      return { id: section.id || `memo-${index}`, title: section.title, content };
    }
    if (typeof section === 'string') {
        return { id: `memo-${index}`, title: 'Section', content: [{ type: 'text', value: section }] };
    }
    return { id: (section as any)?.id || `memo-${index}`, title: (section as any)?.title || '', content: [] };
  });

  // Ensure default memo section if missing for applicable types
  const memoApplicableTypes = ['maladie', 'pharmacologie', 'savoir'];
  if (memoApplicableTypes.includes(caseStudyType) && finalMemoSections.length === 0) {
      const newMemoSectionId = `memo-${Date.now()}`;
      finalMemoSections.push({ id: newMemoSectionId, title: 'Mémo', content: [{ type: 'text', value: '' }] });
  }

  // Now, build the final sectionOrder
  let finalSectionOrder: string[] = ensureArray(caseStudy?.sectionOrder);

  // Get IDs of all automatically included sections (dynamic non-memo sections + memo sections)
  let autoIncludedSectionIds = [...defaultDynamicSectionIds]; // Create mutable copy
  if (caseStudyType === 'maladie' || caseStudyType === 'pharmacologie' || caseStudyType === 'savoir') {
    autoIncludedSectionIds.push(...finalMemoSections.map(s => s.id));
  }
  const customSectionIds = safeCustomSections.map(s => s.id);

  // If sectionOrder is empty, populate it with a default set of IDs
  if (finalSectionOrder.length === 0) {
    finalSectionOrder = [...autoIncludedSectionIds, ...customSectionIds];
  } else {
    // Ensure all auto-included and custom sections are present in an existing sectionOrder
    const allExpectedIds = [...autoIncludedSectionIds, ...customSectionIds];
    const missingIds = allExpectedIds.filter(id => !finalSectionOrder.includes(id));
    finalSectionOrder = [...finalSectionOrder, ...missingIds];
  }

  // Construct the final CaseStudy object
  return {
    // Explicitly define all properties for clarity and type safety
    _id: caseStudy?._id || '',
    id: caseStudy?.id || '',
    type: caseStudyType,
    title: caseStudy?.title || '',
    shortDescription: caseStudy?.shortDescription || '',
    theme: caseStudy?.theme || '',
    system: caseStudy?.system || '',
    level: caseStudy?.level || 'Facile',
    isFree: caseStudy?.isFree || false,
    coverImageUrl: caseStudy?.coverImageUrl || '',
    coverImagePosition: caseStudy?.coverImagePosition || 'middle', // Added default position
    youtubeLinks: ensureArray(caseStudy?.youtubeLinks),
    kahootUrl: caseStudy?.kahootUrl || '',
    status: caseStudy?.status || MemoFicheStatus.DRAFT,

    patientSituation: convertToSection(caseStudy?.patientSituation, 'Cas comptoir'),
    pathologyOverview: convertToSection(caseStudy?.pathologyOverview, 'Aperçu pathologie'),
    keyQuestions: ensureArray(caseStudy?.keyQuestions),
    redFlags: ensureArray(caseStudy?.redFlags),
    mainTreatment: (ensureArray(caseStudy?.mainTreatment).length > 0) ? ensureArray(caseStudy?.mainTreatment) : ensureArray(caseStudy?.recommendations?.mainTreatment),
    associatedProducts: (ensureArray(caseStudy?.associatedProducts).length > 0) ? ensureArray(caseStudy?.associatedProducts) : ensureArray(caseStudy?.recommendations?.associatedProducts),
    lifestyleAdvice: (ensureArray(caseStudy?.lifestyleAdvice).length > 0) ? ensureArray(caseStudy?.lifestyleAdvice) : ensureArray(caseStudy?.recommendations?.lifestyleAdvice),
    dietaryAdvice: (ensureArray(caseStudy?.dietaryAdvice).length > 0) ? ensureArray(caseStudy?.dietaryAdvice) : ensureArray(caseStudy?.recommendations?.dietaryAdvice),
    keyPoints: ensureArray(caseStudy?.keyPoints),
    references: ensureArray(caseStudy?.references),
    flashcards: ensureArray(caseStudy?.flashcards),
    glossary: ensureArray(caseStudy?.glossary),
    quiz: ensureArray(caseStudy?.quiz),

    // Dispositifs médicaux specific fields
    casComptoir: convertToSection(caseStudy?.casComptoir, 'Cas comptoir'),
    objectifsConseil: convertToSection(caseStudy?.objectifsConseil, 'Objectifs de conseil'),
    pathologiesConcernees: convertToSection(caseStudy?.pathologiesConcernees, 'Pathologies concernées'),
    interetDispositif: convertToSection(caseStudy?.interetDispositif, 'Intérêt du dispositif'),
    beneficesSante: convertToSection(caseStudy?.beneficesSante, 'Bénéfices pour la santé'),
    dispositifsAConseiller: convertToSection(caseStudy?.dispositifsAConseiller, 'Dispositifs à conseiller ou à dispenser'),
    reponsesObjections: convertToSection(caseStudy?.reponsesObjections, 'Réponses aux objections des clients'),
    pagesSponsorisees: convertToSection(caseStudy?.pagesSponsorisees, 'Pages sponsorisées'),
    referencesBibliographiquesDM: ensureArray(caseStudy?.referencesBibliographiquesDM),

    // Ordonnances specific fields
    ordonnance: ensureArray(caseStudy?.ordonnance),
    analyseOrdonnance: ensureArray(caseStudy?.analyseOrdonnance),
    conseilsTraitement: caseStudy?.conseilsTraitement || [], // Array of objects
    informationsMaladie: ensureArray(caseStudy?.informationsMaladie),
    conseilsHygieneDeVie: ensureArray(caseStudy?.conseilsHygieneDeVie),
    conseilsAlimentaires: ensureArray(caseStudy?.conseilsAlimentaires),
    ventesAdditionnelles: caseStudy?.ventesAdditionnelles || {}, // Object

    // "Le medicament" specific fields
    youtubeExplainerUrl: caseStudy?.youtubeExplainerUrl || '',
    infographicImageUrl: caseStudy?.infographicImageUrl || '',
    pdfSlideshowUrl: caseStudy?.pdfSlideshowUrl || '',

    // Processed collections
    memoSections: finalMemoSections,
    customSections: safeCustomSections,
    sectionOrder: finalSectionOrder,

    // Any other properties from the original caseStudy that are not explicitly listed above
    // This spread must be last but should not overwrite explicitly set values
    // Using Object.fromEntries(Object.entries(caseStudy || {}).filter(...)) is a robust way to ensure
    // properties explicitly handled above take precedence over anything from the spread
    ...Object.fromEntries(
        Object.entries(caseStudy || {}).filter(([key]) => ![
            '_id', 'id', 'type', 'title', 'shortDescription', 'theme', 'system', 'level', 'isFree', 'coverImageUrl', 'coverImagePosition', 'youtubeLinks', 'kahootUrl', 'status',
            'patientSituation', 'pathologyOverview', 'keyQuestions', 'redFlags', 'mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'keyPoints', 'references', 'flashcards', 'glossary', 'quiz',
            'casComptoir', 'objectifsConseil', 'pathologiesConcernees', 'interetDispositif', 'beneficesSante', 'dispositifsAConseiller', 'reponsesObjections', 'pagesSponsorisees', 'referencesBibliographiquesDM',
            'ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles',
            'youtubeExplainerUrl', 'infographicImageUrl', 'pdfSlideshowUrl',
            'memoSections', 'customSections', 'sectionOrder'
        ].includes(key))
    ),
  };
};

type ListName = 'quiz' | 'flashcards' | 'glossary';

const FormSection: React.FC <{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="border p-4 rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
);

const Label: React.FC <{htmlFor: string, children: React.ReactNode}> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{children}</label>
);

const Input: React.FC <any> = (props) => (
  <input {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

const Textarea: React.FC <any> = (props) => (
  <textarea {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

interface RichContentSectionEditorProps {
  section: MemoFicheSection;
  onChange: (section: MemoFicheSection) => void;
  showTitle?: boolean;
  onRemove?: () => void;
  openImageModal: (callback: (url: string) => void) => void;
}

const RichContentSectionEditor: React.FC<RichContentSectionEditorProps> = ({ section, onChange, showTitle = true, onRemove, openImageModal }) => {

  const handleContentChange = (index: number, value: string) => {
    const newContent = [...(section.content || [])];
    newContent[index] = { ...newContent[index], value };
    onChange({ ...section, content: newContent });
  };

  const addContentBlock = (type: 'text' | 'image' | 'video') => {
    const newContent = [...(section.content || []), { type, value: '' }];
    onChange({ ...section, content: newContent });
  };

  const removeContentBlock = (index: number) => {
    const newContent = [...(section.content || [])];
    newContent.splice(index, 1);
    onChange({ ...section, content: newContent });
  };

  return (
    <div className="border p-3 rounded-md bg-slate-50 relative">
      {showTitle && (
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-grow">
            <label htmlFor={`custom_title_${section.id}`}>Titre de la section</label>
            <Input type="text" id={`custom_title_${section.id}`} value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} />
          </div>
          {onRemove && <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>}
        </div>
      )}
      <div className="space-y-2">
        {(section.content || []).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.type === 'text' && <Textarea value={item.value} onChange={e => handleContentChange(index, e.target.value)} rows={3} className="flex-grow" />}
            {item.type === 'image' && (
              <div className="flex-grow flex items-center gap-2">
                <Input type="text" value={getAbsoluteImageUrl(item.value)} onChange={e => handleContentChange(index, e.target.value)} placeholder="URL de l'image" className="flex-grow" />
                <button type="button" onClick={() => openImageModal(url => handleContentChange(index, url))} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                  <ImageIcon className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            )}
            {item.type === 'video' && <Input type="text" value={item.value} onChange={e => handleContentChange(index, e.target.value)} placeholder="URL de la vidéo YouTube" className="flex-grow" />}
            <button type="button" onClick={() => removeContentBlock(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={() => addContentBlock('text')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Texte
        </button>
        <button type="button" onClick={() => addContentBlock('image')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Image
        </button>
        <button type="button" onClick={() => addContentBlock('video')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Vidéo
        </button>
      </div>
    </div>
  );
};

const Section: React.FC <{
    title: string;
    children: React.ReactNode;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    onRemove?: () => void;
}> = ({ title, children, onMoveUp, onMoveDown, isFirst, isLast, onRemove }) => {
    return (
        <div className="border p-4 rounded-lg bg-white shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onMoveUp} disabled={isFirst} className="text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronUpIcon className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={onMoveDown} disabled={isLast} className="text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronDownIcon className="h-5 w-5" />
                    </button>
                    {onRemove && (
                        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
};

const MemoFicheEditor: React.FC<MemoFicheEditorProps> = ({ initialCaseStudy, onSave, onCancel }) => {
  const [caseStudy, setCaseStudy] = useState<CaseStudy>(createSafeCaseStudy(initialCaseStudy));
  const [displayedSections, setDisplayedSections] = useState<any[]>([]);
  const { user } = useAuth();
  const [showQRCode, setShowQRCode] = useState(false);
  const canGenerateQRCode = user && user.role === UserRole.ADMIN;
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [imageCallback, setImageCallback] = useState<(url: string) => void>(() => () => {});

  // AI Generation States
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);

  const openImageModal = (callback: (url: string) => void) => {
    setImageCallback(() => callback);
    setImageModalOpen(true);
  };

  const handleGenerateAI = useCallback(async () => {
    if (!aiPromptInput.trim()) {
        setAiGenerationError('Veuillez entrer un sujet pour la génération IA.');
        return;
    }
    setIsGeneratingAI(true);
    setAiGenerationError(null);

    try {
        const memoFicheType = caseStudy.type || 'maladie'; // Use current type
        const currentTheme = caseStudy.theme || TOPIC_CATEGORIES[0].topics[0];
        const currentSystem = caseStudy.system || TOPIC_CATEGORIES[1].topics[0];
        
        const aiPrompt = buildAIPrompt(
            memoFicheType,
            aiPromptInput,
            currentTheme, // selectedTheme
            currentSystem, // selectedSystem
            currentTheme, // pharmaTheme (re-using currentTheme for simplicity, adjust if specific pharmaTheme logic is needed)
            currentSystem  // pharmaPathology (re-using currentSystem for simplicity, adjust if specific pharmaPathology logic is needed)
        );

        const draft = await generateCaseStudyDraft(aiPrompt, memoFicheType);
        const learningTools = await generateLearningTools(draft);
                  
        setCaseStudy(prevCaseStudy => ({
            ...prevCaseStudy, // Keep existing manual fields
            ...draft,
            ...learningTools,
            _id: prevCaseStudy._id,
            id: prevCaseStudy.id,
            type: memoFicheType,
            status: MemoFicheStatus.DRAFT,
            theme: draft.theme || currentTheme,
            system: draft.system || currentSystem,
            coverImageUrl: draft.coverImageUrl || prevCaseStudy.coverImageUrl,
            youtubeLinks: draft.youtubeLinks || prevCaseStudy.youtubeLinks,
            sourceText: aiPromptInput, // Store the AI prompt as source text
            flashcards: learningTools.flashcards || [],
            glossary: learningTools.glossary || [],
            quiz: learningTools.quiz || [],
            // Preserve manual fields from the current caseStudy
            youtubeExplainerUrl: prevCaseStudy.youtubeExplainerUrl,
            infographicImageUrl: prevCaseStudy.infographicImageUrl,
            pdfSlideshowUrl: prevCaseStudy.pdfSlideshowUrl,
        }));
        
        setIsGenModalOpen(false);
        setAiPromptInput(''); // Clear prompt input
    } catch (error) {
        console.error('Error generating AI memo fiche:', error);
        setAiGenerationError('Erreur lors de la génération de la mémofiche par l\'IA. Veuillez réessayer.');
    } finally {
        setIsGeneratingAI(false);
    }
  }, [aiPromptInput, caseStudy]); // Dependencies for useCallback

  useEffect(() => {
    setCaseStudy(createSafeCaseStudy(initialCaseStudy));
  }, [initialCaseStudy]);

  useEffect(() => {
    const buildSections = () => {
        let allSections: any[] = [];

        // Correctly include memoSections for applicable types
        if (caseStudy.type === 'savoir' || caseStudy.type === 'pharmacologie' || caseStudy.type === 'maladie') {
            allSections.push(...(caseStudy.memoSections || []).map(section => ({
                id: section.id,
                title: section.title,
                isMemoSection: true,
                rawContent: section // Store raw content for editor
            })));
        } 
        
        // Add dynamic sections based on type
        // Note: The logic for pushing to 'sections' vs 'allSections' needs to be unified
        // For simplicity, let's assume 'allSections' is the primary list for display order
        
        // Fallback or specific sections based on type if not memo-type
        if (caseStudy.type === 'maladie') {
            allSections.push(
                { id: 'patientSituation', title: 'Cas comptoir', rawContent: caseStudy.patientSituation },
                { id: 'keyQuestions', title: 'Questions clés à poser', rawContent: caseStudy.keyQuestions },
                { id: 'pathologyOverview', title: 'Aperçu pathologie', rawContent: caseStudy.pathologyOverview },
                { id: 'redFlags', title: 'Signaux d\'alerte', rawContent: caseStudy.redFlags }
            );
        } else if (caseStudy.type === 'dispositifs-medicaux') {
            allSections.push(
                { id: 'casComptoir', title: 'Cas comptoir', rawContent: caseStudy.casComptoir },
                { id: 'objectifsConseil', title: 'Objectifs de conseil', rawContent: caseStudy.objectifsConseil },
                { id: 'pathologiesConcernees', title: 'Pathologies concernées', rawContent: caseStudy.pathologiesConcernees },
                { id: 'interetDispositif', title: 'Intérêt du dispositif', rawContent: caseStudy.interetDispositif },
                { id: 'beneficesSante', title: 'Bénéfices pour la santé', rawContent: caseStudy.beneficesSante },
                { id: 'dispositifsAConseiller', title: 'Dispositifs à conseiller ou à dispenser', rawContent: caseStudy.dispositifsAConseiller },
                { id: 'reponsesObjections', title: 'Réponses aux objections des clients', rawContent: caseStudy.reponsesObjections },
                { id: 'pagesSponsorisees', title: 'Pages sponsorisées', rawContent: caseStudy.pagesSponsorisees },
                { id: 'referencesBibliographiquesDM', title: 'Références bibliographiques', rawContent: caseStudy.referencesBibliographiquesDM }
            );
        } else if (caseStudy.type === 'ordonnances') {
            allSections.push(
                { id: 'ordonnance', title: 'Ordonnance', rawContent: caseStudy.ordonnance },
                { id: 'analyseOrdonnance', title: 'Analyse de l\'ordonnance', rawContent: caseStudy.analyseOrdonnance },
                { id: 'conseilsTraitement', title: 'Conseils sur le traitement médicamenteux', rawContent: caseStudy.conseilsTraitement },
                { id: 'informationsMaladie', title: 'Informations sur la maladie', rawContent: caseStudy.informationsMaladie },
                { id: 'conseilsHygieneDeVie', title: 'Conseils hygiène de vie', rawContent: caseStudy.conseilsHygieneDeVie },
                { id: 'conseilsAlimentaires', title: 'Conseils alimentaires', rawContent: caseStudy.conseilsAlimentaires },
                { id: 'ventesAdditionnelles', title: 'Ventes additionnelles', rawContent: caseStudy.ventesAdditionnelles }
            );
        }

        // Common sections that apply if not dermocosmetique/dispositifs-medicaux/ordonnances/savoir
        if (caseStudy.type !== 'dispositifs-medicaux' && caseStudy.type !== 'dermocosmetique' && caseStudy.type !== 'ordonnances' && caseStudy.type !== 'savoir' && caseStudy.type !== 'communication') {
            allSections.push(
                { id: 'mainTreatment', title: 'Traitement Principal', rawContent: caseStudy.mainTreatment },
                { id: 'associatedProducts', title: 'Produits Associés', rawContent: caseStudy.associatedProducts },
                { id: 'lifestyleAdvice', title: 'Conseils Hygiène de vie', rawContent: caseStudy.lifestyleAdvice },
                { id: 'dietaryAdvice', title: 'Conseils alimentaires', rawContent: caseStudy.dietaryAdvice },
                { id: 'keyPoints', title: 'Points Clés & Références', rawContent: caseStudy.keyPoints }
            );
        }
        
        // Add custom sections
        const customSections = (caseStudy.customSections || []).map((section) => ({ id: section.id, title: section.title, isCustom: true, rawContent: section })) || [];
        allSections.push(...customSections);
        
        // Ensure references are always present, but avoid duplicates if already added by dynamicSections
        if (!allSections.some(s => s.id === 'references')) {
          allSections.push({ id: 'references', title: 'Références bibliographiques', rawContent: caseStudy.references });
        }
        
        // Order sections based on sectionOrder
        const orderedSections = (caseStudy.sectionOrder || [])
            .map(id => allSections.find(s => s.id === id))
            .filter(Boolean); // Filter out any undefined if ID not found

        // Add any sections not in sectionOrder at the end
        const newSections = allSections.filter(s => !orderedSections.some(os => os.id === s.id));
        
        setDisplayedSections([...orderedSections, ...newSections]);
    };

    buildSections();
  }, [caseStudy.type, caseStudy.customSections, caseStudy.sectionOrder, caseStudy.memoSections, caseStudy.patientSituation, caseStudy.keyQuestions, caseStudy.pathologyOverview, caseStudy.redFlags, caseStudy.mainTreatment, caseStudy.associatedProducts, caseStudy.lifestyleAdvice, caseStudy.dietaryAdvice, caseStudy.keyPoints, caseStudy.references, caseStudy.casComptoir, caseStudy.objectifsConseil, caseStudy.pathologiesConcernees, caseStudy.interetDispositif, caseStudy.beneficesSante, caseStudy.dispositifsAConseiller, caseStudy.reponsesObjections, caseStudy.pagesSponsorisees, caseStudy.referencesBibliographiquesDM, caseStudy.ordonnance, caseStudy.analyseOrdonnance, caseStudy.conseilsTraitement, caseStudy.informationsMaladie, caseStudy.conseilsHygieneDeVie, caseStudy.conseilsAlimentaires, caseStudy.ventesAdditionnelles]);


  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...displayedSections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSections.length) {
        return;
    }
    const [movedSection] = newSections.splice(index, 1);
    newSections.splice(newIndex, 0, movedSection);
    setDisplayedSections(newSections);
    setCaseStudy(prev => ({ ...prev, sectionOrder: newSections.map(s => s.id) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCaseStudy(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleArrayChange = (name: keyof CaseStudy, value: string) => {
    const arrayValue = value.split('\n').filter(item => item.trim() !== '');
    setCaseStudy(prev => ({ ...prev, [name]: arrayValue as any }));
  };


  const handleItemChange = (listName: ListName, index: number, field: string, value: string | number) => {
    setCaseStudy(prev => {
      const newList = [...(prev[listName] as any[])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
  };
  
  const handleQuizOptionChange = (qIndex: number, oIndex: number, value: string) => {
    setCaseStudy(prev => {
      const newQuiz = [...(prev.quiz || [])];
      const newOptions = [...newQuiz[qIndex].options];
      newOptions[oIndex] = value;
      newQuiz[qIndex] = { ...newQuiz[qIndex], options: newOptions };
      return { ...prev, quiz: newQuiz };
    });
  };
  
  const handleAddItem = (listName: ListName) => {
    setCaseStudy(prev => {
      let newItem: QuizQuestion | Flashcard | GlossaryTerm;
      if (listName === 'quiz') {
        newItem = { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' };
      } else if (listName === 'flashcards') {
        newItem = { question: '', answer: '' };
      } else { // glossary
        newItem = { term: '', definition: '' };
      }
      return { ...prev, [listName]: [...(prev[listName] as any[]), newItem] };
    });
  };
  
  const handleRemoveItem = (listName: ListName, index: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
      setCaseStudy(prev => {
        const newList = [...(prev[listName] as any[])];
        newList.splice(index, 1);
        return { ...prev, [listName]: newList };
      });
    }
  };

  const handleCustomSectionChange = (newCustomSections: MemoFicheSection[]) => {
    setCaseStudy(prev => ({ ...prev, customSections: newCustomSections }));
  };

  const addCustomSection = () => {
    setCaseStudy(prev => {
      const newId = `custom-${Date.now()}`;
      const newCustomSections = [...(prev.customSections || []), { id: newId, title: 'Nouvelle Section', content: [] }];
      const newSectionOrder = [...(prev.sectionOrder || []), newId];
      return { ...prev, customSections: newCustomSections, sectionOrder: newSectionOrder };
    });
  };

    const addMemoSection = () => {
        setCaseStudy(prev => {
            const newId = `memo-${Date.now()}`;
            const newMemoSections = [...(prev.memoSections || []), { id: newId, title: 'Nouvelle Section Mémo', content: [] }];
            const newSectionOrder = [...(prev.sectionOrder || []), newId];
            return { ...prev, memoSections: newMemoSections, sectionOrder: newSectionOrder };
        });
    };

  const removeMainSection = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette section ?")) {
      setCaseStudy(prev => {
        const newSectionOrder = prev.sectionOrder?.filter(sectionId => sectionId !== id) || [];
        return { ...prev, sectionOrder: newSectionOrder };
      });
    }
  };

  const handleYoutubeLinkChange = (index: number, field: 'url' | 'title', value: string) => {
    setCaseStudy(prev => {
      const newYoutubeLinks = [...(prev.youtubeLinks || [])];
      newYoutubeLinks[index] = { ...newYoutubeLinks[index], [field]: value };
      return { ...prev, youtubeLinks: newYoutubeLinks };
    });
  };

  const addYoutubeLink = () => {
    setCaseStudy(prev => {
        if ((prev.youtubeLinks || []).length < 3) {
            return {
                ...prev,
                youtubeLinks: [...(prev.youtubeLinks || []), { url: '', title: '' }],
            };
        }
        return prev;
    });
  };

  const removeYoutubeLink = (index: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce lien YouTube ?")) {
      setCaseStudy(prev => {
        const newYoutubeLinks = [...(prev.youtubeLinks || [])];
        newYoutubeLinks.splice(index, 1);
        return { ...prev, youtubeLinks: newYoutubeLinks };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(caseStudy);
  };
  
  const canEditStatus = user && (user.role === UserRole.ADMIN || user.role === UserRole.FORMATEUR);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelectImage={imageCallback}
      />
      <h2 className="text-3xl font-bold text-slate-800 mb-6">{initialCaseStudy?._id ? 'Modifier la Mémofiche' : 'Créer une Nouvelle Mémofiche'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        <FormSection title="Informations Générales">
          <div>
            <Label htmlFor="type">Type de mémofiche</Label>
            <select name="type" id="type" value={caseStudy.type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                <option value="maladie">Maladie</option>
                <option value="pharmacologie">Pharmacologie</option>
                <option value="dermocosmetique">Dermocosmétique</option>
                <option value="dispositifs-medicaux">Dispositifs Médicaux</option>
                <option value="ordonnances">Ordonnances</option>
                <option value="communication">Communication</option>
                <option value="savoir">Savoir</option>
                <option value="le-medicament">Le médicament</option>
            </select>
          </div>
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input type="text" name="title" id="title" value={caseStudy.title} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="shortDescription">Description Courte</Label>
            <Textarea name="shortDescription" id="shortDescription" rows={3} value={caseStudy.shortDescription} onChange={handleChange} />
          </div>
          {canEditStatus && (
            <div>
              <Label htmlFor="status">Statut</Label>
              <select name="status" id="status" value={caseStudy.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                  {Object.values(MemoFicheStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                  ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Thème Pédagogique</Label>
              <select name="theme" id="theme" value={caseStudy.theme} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                <option value="">Sélectionner un thème</option>
                {TOPIC_CATEGORIES[0].topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {caseStudy.type !== 'communication' && (
            <div>
              <Label htmlFor="system">Système/Organe</Label>
              <Input type="text" name="system" id="system" value={caseStudy.system} onChange={handleChange} />
            </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="level">Niveau de difficulté</Label>
                <select name="level" id="level" value={caseStudy.level} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                    <option>Facile</option>
                    <option>Moyen</option>
                    <option>Difficile</option>
                </select>
            </div>
            <div className="flex items-center pt-6">
                <input type="checkbox" name="isFree" id="isFree" checked={caseStudy.isFree} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                <label htmlFor="isFree" className="ml-2 block text-sm text-gray-900">Contenu gratuit</label>
            </div>
          </div>
          <div>
            <Label htmlFor="coverImageUrl">Image de couverture</Label>
            <div className="mt-1 flex items-center gap-2">
                <Input type="text" name="coverImageUrl" id="coverImageUrl" value={getAbsoluteImageUrl(caseStudy.coverImageUrl)} onChange={handleChange} className="flex-grow" />
                <button type="button" onClick={() => openImageModal(url => setCaseStudy(prev => ({ ...prev, coverImageUrl: url })))} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                    <ImageIcon className="h-5 w-5 text-slate-600" />
                </button>
            </div>
          </div>
          {caseStudy.coverImageUrl && (
            <div>
              <Label htmlFor="coverImagePosition">Position de l\'image de couverture</Label>
              <select name="coverImagePosition" id="coverImagePosition" value={caseStudy.coverImagePosition || 'middle'} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                <option value="top">Haut</option>
                <option value="middle">Milieu</option>
                    <option value="bottom">Bas</option>
                </select>
            </div>
          )}
          <div>
            <Label>Liens Vidéo YouTube</Label>
            {caseStudy.youtubeLinks?.map((link, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                    <Input type="text" placeholder="Titre de la vidéo" value={link.title} onChange={(e) => handleYoutubeLinkChange(index, 'title', e.target.value)} />
                    <Input type="text" placeholder="URL de la vidéo" value={link.url} onChange={(e) => handleYoutubeLinkChange(index, 'url', e.target.value)} />
                    <button type="button" onClick={() => removeYoutubeLink(index)} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ))}
            {(caseStudy.youtubeLinks?.length || 0) < 3 && (
                <button type="button" onClick={addYoutubeLink} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Ajouter un lien YouTube
                </button>
            )}
          </div>
        </FormSection>

        {/* New FormSection for "Le médicament" specific media */} 
        <FormSection title="Médias et Présentations">
            <div>
                <Label htmlFor="youtubeExplainerUrl">URL Vidéo YouTube Explicative</Label>
                <Input type="text" name="youtubeExplainerUrl" id="youtubeExplainerUrl" value={caseStudy.youtubeExplainerUrl || ''} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="infographicImageUrl">URL ou Télécharger Infographie</Label>
                <div className="mt-1 flex items-center gap-2">
                    <Input type="text" name="infographicImageUrl" id="infographicImageUrl" value={getAbsoluteImageUrl(caseStudy.infographicImageUrl)} onChange={handleChange} className="flex-grow" />
                    <button type="button" onClick={() => openImageModal(url => setCaseStudy(prev => ({ ...prev, infographicImageUrl: url })))} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                        <ImageIcon className="h-5 w-5 text-slate-600" />
                    </button>
                </div>
            </div>
            <div>
                <Label htmlFor="pdfSlideshowUrl">Présentation (URL ou code d'intégration)</Label>
                <Textarea name="pdfSlideshowUrl" id="pdfSlideshowUrl" value={caseStudy.pdfSlideshowUrl || ''} onChange={handleChange} rows={3} />
                <p className="mt-1 text-xs text-slate-500">
                  Accepte les URL de PDF, les liens de partage Canva, ou le code d'intégration HTML (iframe).
                </p>
            </div>
        </FormSection>

        {displayedSections.map((sectionInfo, index) => {
            let content;

            if (sectionInfo.isCustom) {
                const customSectionIndex = caseStudy.customSections.findIndex(cs => cs.id === sectionInfo.id);
                if (customSectionIndex > -1) {
                    content = <RichContentSectionEditor section={caseStudy.customSections[customSectionIndex]} onChange={(newSection) => {
                        const newCustomSections = [...caseStudy.customSections];
                        newCustomSections[customSectionIndex] = newSection;
                        handleCustomSectionChange(newCustomSections);
                    }} onRemove={() => removeCustomSection(sectionInfo.id)} openImageModal={openImageModal} />;
                }
            } else if (sectionInfo.isMemoSection) {
                const memoSectionIndex = caseStudy.memoSections.findIndex(ms => ms.id === sectionInfo.id);
                if (memoSectionIndex > -1) {
                    content = <RichContentSectionEditor section={caseStudy.memoSections[memoSectionIndex]} onChange={(newSection) => {
                        const newMemoSections = [...caseStudy.memoSections];
                        newMemoSections[memoSectionIndex] = newSection;
                        setCaseStudy(prev => ({ ...prev, memoSections: newMemoSections }));
                    }} showTitle={true} openImageModal={openImageModal} />;
                }
            } else {
                switch (sectionInfo.id) {
                    case 'patientSituation':
                    case 'pathologyOverview':
                    case 'casComptoir':
                    case 'objectifsConseil':
                    case 'pathologiesConcernees':
                    case 'interetDispositif':
                    case 'beneficesSante':
                    case 'dispositifsAConseiller':
                    case 'reponsesObjections':
                    case 'pagesSponsorisees':
                        content = <RichContentSectionEditor section={caseStudy[sectionInfo.id]} onChange={(newSection) => setCaseStudy(prev => ({ ...prev, [sectionInfo.id]: newSection }))} showTitle={false} openImageModal={openImageModal} />;
                        break;
                    case 'keyQuestions':
                    case 'redFlags':
                    case 'referencesBibliographiquesDM':
                    case 'ordonnance':
                    case 'analyseOrdonnance':
                    case 'informationsMaladie':
                    case 'conseilsHygieneDeVie':
                    case 'conseilsAlimentaires':
                    case 'mainTreatment':
                    case 'associatedProducts':
                    case 'lifestyleAdvice':
                    case 'dietaryAdvice':
                    case 'keyPoints':
                    case 'references':
                        content = <Textarea rows={5} value={(caseStudy[sectionInfo.id] as string[] || []).join('\n')} onChange={(e) => handleArrayChange(sectionInfo.id, e.target.value)} />;
                        break;
                    case 'conseilsTraitement':
                        content = (
                            <div className="space-y-4">
                                {(caseStudy.conseilsTraitement as { medicament: string; conseils: string[] }[] || []).map((item, itemIndex) => (
                                    <div key={itemIndex} className="p-3 border rounded-md bg-slate-50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor={`medicament-${itemIndex}`}>Médicament</Label>
                                            <button type="button" onClick={() => {
                                                setCaseStudy(prev => {
                                                    const newConseils = [...(prev.conseilsTraitement as { medicament: string; conseils: string[] }[] || [])];
                                                    newConseils.splice(itemIndex, 1);
                                                    return { ...prev, conseilsTraitement: newConseils };
                                                });
                                            }} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                        <Input id={`medicament-${itemIndex}`} type="text" value={item.medicament} onChange={(e) => {
                                            setCaseStudy(prev => {
                                                const newConseils = [...(prev.conseilsTraitement as { medicament: string; conseils: string[] }[] || [])];
                                                newConseils[itemIndex] = { ...newConseils[itemIndex], medicament: e.target.value };
                                                return { ...prev, conseilsTraitement: newConseils };
                                            });
                                        }} />
                                        <Label htmlFor={`conseils-${itemIndex}`}>Conseils (une ligne par conseil)</Label>
                                        <Textarea id={`conseils-${itemIndex}`} rows={5} value={item.conseils.join('\n')} onChange={(e) => {
                                            setCaseStudy(prev => {
                                                const newConseils = [...(prev.conseilsTraitement as { medicament: string; conseils: string[] }[] || [])];
                                                newConseils[itemIndex] = { ...newConseils[itemIndex], conseils: e.target.value.split('\n').filter(c => c.trim() !== '') };
                                                return { ...prev, conseilsTraitement: newConseils };
                                            });
                                        }} />
                                    </div>
                                ))}
                                <button type="button" onClick={() => {
                                    setCaseStudy(prev => ({
                                        ...prev,
                                        conseilsTraitement: [...(prev.conseilsTraitement as { medicament: string; conseils: string[] }[] || []), { medicament: '', conseils: [] }],
                                    }));
                                }} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2">
                                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                                    Ajouter un médicament
                                </button>
                            </div>
                        );
                        break;
                    case 'ventesAdditionnelles':
                        content = (
                            <div className="space-y-4">
                                {Object.entries(caseStudy.ventesAdditionnelles || {}).map(([category, items]) => (
                                    <div key={category} className="p-3 border rounded-md bg-slate-50 space-y-2">
                                        <Label>{category}</Label>
                                        <Textarea
                                            rows={5}
                                            value={(items as string[] || []).join('\n')}
                                            onChange={(e) => {
                                                setCaseStudy(prev => ({
                                                    ...prev,
                                                    ventesAdditionnelles: {
                                                        ...(prev.ventesAdditionnelles as any),
                                                        [category]: e.target.value.split('\n').filter(item => item.trim() !== ''),
                                                    },
                                                }));
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                        break;
                }
            }


            return (
                <Section
                    key={sectionInfo.id}
                    title={sectionInfo.isMemoSection ? '' : sectionInfo.title}
                    onMoveUp={() => moveSection(index, 'up')}
                    onMoveDown={() => moveSection(index, 'down')}
                    isFirst={index === 0}
                    isLast={index === displayedSections.length - 1}
                    onRemove={() => sectionInfo.isCustom ? removeCustomSection(sectionInfo.id) : removeMainSection(sectionInfo.id)}
                >
                    {content}
                </Section>
            );
        })}

        {(caseStudy.type === 'maladie' || caseStudy.type === 'savoir' || caseStudy.type === 'pharmacologie') && (
            <button type="button" onClick={addMemoSection} className="flex items-center px-3 py-2 bg-slate-100 text-slate-800 text-sm font-semibold rounded-md hover:bg-slate-200">
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Ajouter une section Mémo
            </button>
        )}

        <button type="button" onClick={addCustomSection} className="flex items-center px-3 py-2 bg-slate-100 text-slate-800 text-sm font-semibold rounded-md hover:bg-slate-200 mt-2">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Ajouter une section personnalisée
        </button>

        <FormSection title="Flashcards">
          {caseStudy.flashcards.map((flashcard, index) => (
            <div key={index} className="p-3 border rounded-md bg-slate-50 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold">Flashcard {index + 1}</p>
                <button type="button" onClick={() => handleRemoveItem('flashcards', index)} className="text-red-500 hover:text-red-700">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              <div>
                <Label htmlFor={`flashcard-q-${index}`}>Question</Label>
                <Input id={`flashcard-q-${index}`} type="text" value={flashcard.question} onChange={(e) => handleItemChange('flashcards', index, 'question', e.target.value)} />
              </div>
              <div>
                <Label htmlFor={`flashcard-a-${index}`}>Réponse</Label>
                <Textarea id={`flashcard-a-${index}`} rows={2} value={flashcard.answer} onChange={(e) => handleItemChange('flashcards', index, 'answer', e.target.value)} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => handleAddItem('flashcards')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Ajouter une Flashcard
          </button>
        </FormSection>

        <FormSection title="Quiz">
          {caseStudy.quiz?.map((question, qIndex) => (
            <div key={qIndex} className="p-3 border rounded-md bg-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-semibold">Question {qIndex + 1}</p>
                <button type="button" onClick={() => handleRemoveItem('quiz', qIndex)} className="text-red-500 hover:text-red-700">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              <div>
                <Label htmlFor={`quiz-q-${qIndex}`}>Question</Label>
                <Input id={`quiz-q-${qIndex}`} type="text" value={question.question} onChange={(e) => handleItemChange('quiz', qIndex, 'question', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Options et bonne réponse</Label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <input
                      type="radio"
                      id={`quiz-q${qIndex}-o${oIndex}-radio`}
                      name={`quiz-correct-${qIndex}`}
                      checked={question.correctAnswerIndex === oIndex}
                      onChange={() => handleItemChange('quiz', qIndex, 'correctAnswerIndex', oIndex)}
                      className="h-5 w-5 text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                    />
                    <Input
                      id={`quiz-q${qIndex}-o${oIndex}`}
                      placeholder={`Option ${oIndex + 1}`}
                      type="text"
                      value={option}
                      onChange={(e) => handleQuizOptionChange(qIndex, oIndex, e.target.value)}
                      className="flex-grow"
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor={`quiz-exp-${qIndex}`}>Explication</Label>
                <Textarea id={`quiz-exp-${qIndex}`} rows={2} value={question.explanation} onChange={(e) => handleItemChange('quiz', qIndex, 'explanation', e.target.value)} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => handleAddItem('quiz')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2">
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Ajouter une Question
          </button>
        </FormSection>

        <div className="flex justify-between items-center">
          <div>
            {canGenerateQRCode && (
              <button type="button" onClick={() => setShowQRCode(!showQRCode)} className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ShareIcon className="h-5 w-5 mr-2" />
                Partager (QR)
              </button>
            )}
          </div>
          <div className="flex space-x-4">
            {caseStudy.type === 'le-medicament' && (
                <button type="button" onClick={() => setIsGenModalOpen(true)} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    Générer par IA
                </button>
            )}
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
            <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">Enregistrer</button>
          </div>
        </div>

        {/* AI Generation Modal */} 
        {isGenModalOpen && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Générer le contenu par IA</h3>
                    {aiGenerationError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                            <strong className="font-bold">Erreur : </strong>
                            <span className="block sm:inline">{aiGenerationError}</span>
                        </div>
                    )}
                    <textarea
                        className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        rows={5}
                        placeholder="Décrivez ce que l\'IA doit générer (ex: 'un résumé détaillé du mécanisme d\'action de l\'insuline')."
                        value={aiPromptInput}
                        onChange={(e) => setAiPromptInput(e.target.value)}
                        disabled={isGeneratingAI}
                    ></textarea>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={() => { setIsGenModalOpen(false); setAiPromptInput(''); setAiGenerationError(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={isGeneratingAI}>Annuler</button>
                        <button type="button" onClick={handleGenerateAI} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400" disabled={isGeneratingAI}>
                            {isGeneratingAI ? (
                                <>
                                    <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
                                    <span>Génération...</span>
                                </>
                            ) : (
                                <span>Générer</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showQRCode && canGenerateQRCode && (
          <div className="mt-6 flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-md border animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Partagez cette fiche avec ce QR Code</h3>
            <QRCodeSVG value={`${window.location.origin}/memofiche/${caseStudy._id}`} size={256} />
            <p className="mt-4 text-sm text-slate-600">Ce code mène vers la page publique de la mémofiche.</p>
          </div>
        )}

      </form>
    </div>
  );
};

export default MemoFicheEditor;
