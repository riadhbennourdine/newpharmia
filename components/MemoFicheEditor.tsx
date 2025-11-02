import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CaseStudy, QuizQuestion, Flashcard, GlossaryTerm, MemoFicheSection, MemoFicheSectionContent, MemoFicheStatus, UserRole } from '../types';
import { ensureArray } from '../utils/array';
import { TrashIcon, PlusCircleIcon, ChevronUpIcon, ChevronDownIcon, ShareIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';

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

  return {
    _id: caseStudy?._id || '',
    id: caseStudy?.id || '',
    type: caseStudy?.type || 'maladie',
    title: caseStudy?.title || '',
    shortDescription: caseStudy?.shortDescription || '',
    theme: caseStudy?.theme || '',
    system: caseStudy?.system || '',
    level: caseStudy?.level || 'Facile',
    isFree: caseStudy?.isFree || false,
    coverImageUrl: caseStudy?.coverImageUrl || '',
    youtubeLinks: ensureArray(caseStudy?.youtubeLinks),
    kahootUrl: caseStudy?.kahootUrl || '',
    patientSituation: convertToSection(caseStudy?.patientSituation, 'Cas comptoir'),
    keyQuestions: ensureArray(caseStudy?.keyQuestions),
    pathologyOverview: convertToSection(caseStudy?.pathologyOverview, 'Aperçu pathologie'),
    redFlags: ensureArray(caseStudy?.redFlags),
    mainTreatment: ensureArray(caseStudy?.mainTreatment),
    associatedProducts: ensureArray(caseStudy?.associatedProducts),
    lifestyleAdvice: ensureArray(caseStudy?.lifestyleAdvice),
    dietaryAdvice: ensureArray(caseStudy?.dietaryAdvice),
    keyPoints: ensureArray(caseStudy?.keyPoints),
    references: ensureArray(caseStudy?.references),
    flashcards: ensureArray(caseStudy?.flashcards),
    glossary: ensureArray(caseStudy?.glossary),
    quiz: ensureArray(caseStudy?.quiz),
    customSections: safeCustomSections,
    status: caseStudy?.status || MemoFicheStatus.DRAFT, // Initialize status

    // Dispositifs médicaux
    casComptoir: convertToSection(caseStudy?.casComptoir, 'Cas comptoir'),
    objectifsConseil: convertToSection(caseStudy?.objectifsConseil, 'Objectifs de conseil'),
    pathologiesConcernees: convertToSection(caseStudy?.pathologiesConcernees, 'Pathologies concernées'),
    interetDispositif: convertToSection(caseStudy?.interetDispositif, 'Intérêt du dispositif'),
    beneficesSante: convertToSection(caseStudy?.beneficesSante, 'Bénéfices pour la santé'),
    dispositifsAConseiller: convertToSection(caseStudy?.dispositifsAConseiller, 'Dispositifs à conseiller ou à dispenser'),
    reponsesObjections: convertToSection(caseStudy?.reponsesObjections, 'Réponses aux objections des clients'),
    pagesSponsorisees: convertToSection(caseStudy?.pagesSponsorisees, 'Pages sponsorisées'),
    referencesBibliographiquesDM: ensureArray(caseStudy?.referencesBibliographiquesDM),

    // Ordonnances
    ordonnance: ensureArray(caseStudy?.ordonnance),
    analyseOrdonnance: ensureArray(caseStudy?.analyseOrdonnance),
    conseilsTraitement: caseStudy?.conseilsTraitement || [],
    informationsMaladie: ensureArray(caseStudy?.informationsMaladie),
    conseilsHygieneDeVie: ensureArray(caseStudy?.conseilsHygieneDeVie),
    conseilsAlimentaires: ensureArray(caseStudy?.conseilsAlimentaires),
    ventesAdditionnelles: caseStudy?.ventesAdditionnelles || {},
    sectionOrder: ensureArray(caseStudy?.sectionOrder),
  };
};

type ListName = 'quiz' | 'flashcards' | 'glossary';

const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="border p-4 rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
);

const Label: React.FC<{htmlFor: string, children: React.ReactNode}> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{children}</label>
);

const Input: React.FC<any> = (props) => (
  <input {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

const Textarea: React.FC<any> = (props) => (
  <textarea {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

interface RichContentSectionEditorProps {
  section: MemoFicheSection;
  onChange: (section: MemoFicheSection) => void;
  showTitle?: boolean;
  onRemove?: () => void;
}

const RichContentSectionEditor: React.FC<RichContentSectionEditorProps> = ({ section, onChange, showTitle = true, onRemove }) => {

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
            <label htmlFor={`custom_title_${section.title}`}>Titre de la section</label>
            <Input type="text" id={`custom_title_${section.title}`} value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} />
          </div>
          {onRemove && <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>}
        </div>
      )}
      <div className="space-y-2">
        {(section.content || []).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.type === 'text' && <Textarea value={item.value} onChange={e => handleContentChange(index, e.target.value)} rows={3} className="flex-grow" />}
            {item.type === 'image' && <Input type="text" value={item.value} onChange={e => handleContentChange(index, e.target.value)} placeholder="URL de l'image" className="flex-grow" />}
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

  useEffect(() => {
    setCaseStudy(createSafeCaseStudy(initialCaseStudy));
  }, [initialCaseStudy]);

  useEffect(() => {
    const buildSections = () => {
        const sections: any[] = [];

        if (caseStudy.type === 'maladie') {
            sections.push({ id: 'patientSituation', title: 'Cas comptoir' });
            sections.push({ id: 'keyQuestions', title: 'Questions clés à poser' });
            sections.push({ id: 'pathologyOverview', title: 'Aperçu pathologie' });
            sections.push({ id: 'redFlags', title: 'Signaux d\'alerte' });
        } else if (caseStudy.type === 'dispositifs-medicaux') {
            sections.push({ id: 'casComptoir', title: 'Cas comptoir' });
            sections.push({ id: 'objectifsConseil', title: 'Objectifs de conseil' });
            sections.push({ id: 'pathologiesConcernees', title: 'Pathologies concernées' });
            sections.push({ id: 'interetDispositif', title: 'Intérêt du dispositif' });
            sections.push({ id: 'beneficesSante', title: 'Bénéfices pour la santé' });
            sections.push({ id: 'dispositifsAConseiller', title: 'Dispositifs à conseiller ou à dispenser' });
            sections.push({ id: 'reponsesObjections', title: 'Réponses aux objections des clients' });
            sections.push({ id: 'pagesSponsorisees', title: 'Pages sponsorisées' });
            sections.push({ id: 'referencesBibliographiquesDM', title: 'Références bibliographiques' });
        } else if (caseStudy.type === 'ordonnances') {
            sections.push({ id: 'ordonnance', title: 'Ordonnance' });
            sections.push({ id: 'analyseOrdonnance', title: 'Analyse de l\'ordonnance' });
            sections.push({ id: 'conseilsTraitement', title: 'Conseils sur le traitement médicamenteux' });
            sections.push({ id: 'informationsMaladie', title: 'Informations sur la maladie' });
            sections.push({ id: 'conseilsHygieneDeVie', title: 'Conseils hygiène de vie' });
            sections.push({ id: 'conseilsAlimentaires', title: 'Conseils alimentaires' });
            sections.push({ id: 'ventesAdditionnelles', title: 'Ventes additionnelles' });
        }

        if (caseStudy.type !== 'dispositifs-medicaux' && caseStudy.type !== 'dermocosmetique' && caseStudy.type !== 'ordonnances') {
            sections.push({ id: 'mainTreatment', title: 'Traitement Principal' });
            sections.push({ id: 'associatedProducts', title: 'Produits Associés' });
            sections.push({ id: 'lifestyleAdvice', title: 'Conseils Hygiène de vie' });
            sections.push({ id: 'dietaryAdvice', title: 'Conseils alimentaires' });
            sections.push({ id: 'keyPoints', title: 'Points Clés & Références' });
        }

        const customSections = caseStudy.customSections?.map((section) => ({ id: section.id, title: section.title, isCustom: true })) || [];
        
        const allSections = [...sections, ...customSections];

        const orderedSections = caseStudy.sectionOrder && caseStudy.sectionOrder.length > 0
            ? caseStudy.sectionOrder.map(id => allSections.find(s => s.id === id)).filter(Boolean)
            : allSections;
        
        const newSections = allSections.filter(s => !orderedSections.find(os => os.id === s.id));
        
        setDisplayedSections([...orderedSections, ...newSections]);
    };

    buildSections();
  }, [caseStudy.type, caseStudy.customSections, caseStudy.sectionOrder]);

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
    console.log("addCustomSection called");
    setCaseStudy(prev => {
      const newId = `custom-${Date.now()}`;
      const newCustomSections = [...(prev.customSections || []), { id: newId, title: 'Nouvelle Section', content: [] }];
      const newSectionOrder = [...(prev.sectionOrder || []), newId];
      console.log("newCustomSections", newCustomSections);
      console.log("newSectionOrder", newSectionOrder);
      return { ...prev, customSections: newCustomSections, sectionOrder: newSectionOrder };
    });
  };

  const removeCustomSection = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette section personnalisée ?")) {
      setCaseStudy(prev => {
        const newCustomSections = prev.customSections?.filter(section => section.id !== id) || [];
        const newSectionOrder = prev.sectionOrder?.filter(sectionId => sectionId !== id) || [];
        return { ...prev, customSections: newCustomSections, sectionOrder: newSectionOrder };
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
                <option value="exhaustive">Exhaustive</option>
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
            <Label htmlFor="coverImageUrl">URL de l\'image de couverture</Label>
            <Input type="text" name="coverImageUrl" id="coverImageUrl" value={caseStudy.coverImageUrl} onChange={handleChange} />
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

        {displayedSections.map((sectionInfo, index) => {
            let content;
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
                    content = <RichContentSectionEditor section={caseStudy[sectionInfo.id]} onChange={(newSection) => setCaseStudy(prev => ({ ...prev, [sectionInfo.id]: newSection }))} showTitle={false} />;
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
                    content = <Textarea rows={5} value={(caseStudy[sectionInfo.id] as string[] || []).join('\n')} onChange={(e) => handleArrayChange(sectionInfo.id, e.target.value)} />;
                    break;
                case 'keyPoints':
                     content = (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="keyPoints">Points Clés</Label>
                                <Textarea name="keyPoints" id="keyPoints" rows={5} value={caseStudy.keyPoints.join('\n')} onChange={(e) => handleArrayChange('keyPoints', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="references">Références</Label>
                                <Textarea name="references" id="references" rows={3} value={caseStudy.references.join('\n')} onChange={(e) => handleArrayChange('references', e.target.value)} />
                            </div>
                        </div>
                    );
                    break;
                default:
                    if (sectionInfo.isCustom) {
                        const customSectionIndex = caseStudy.customSections.findIndex(cs => cs.id === sectionInfo.id);
                        if (customSectionIndex > -1) {
                            content = <RichContentSectionEditor section={caseStudy.customSections[customSectionIndex]} onChange={(newSection) => {
                                const newCustomSections = [...caseStudy.customSections];
                                newCustomSections[customSectionIndex] = newSection;
                                handleCustomSectionChange(newCustomSections);
                            }} onRemove={() => removeCustomSection(sectionInfo.id)} />;
                        }
                    }
                    break;
            }

            return (
                <Section
                    key={sectionInfo.id}
                    title={sectionInfo.title}
                    onMoveUp={() => moveSection(index, 'up')}
                    onMoveDown={() => moveSection(index, 'down')}
                    isFirst={index === 0}
                    isLast={index === displayedSections.length - 1}
                >
                    {content}
                </Section>
            );
        })}

        <button type="button" onClick={addCustomSection} className="flex items-center px-3 py-2 bg-slate-100 text-slate-800 text-sm font-semibold rounded-md hover:bg-slate-200">
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
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option, oIndex) => (
                  <div key={oIndex}>
                    <Label htmlFor={`quiz-q${qIndex}-o${oIndex}`}>Option {oIndex + 1}</Label>
                    <Input id={`quiz-q${qIndex}-o${oIndex}`} type="text" value={option} onChange={(e) => handleQuizOptionChange(qIndex, oIndex, e.target.value)} />
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor={`quiz-a-${qIndex}`}>Index de la bonne réponse (0-3)</Label>
                <Input id={`quiz-a-${qIndex}`} type="number" min="0" max="3" value={question.correctAnswerIndex} onChange={(e) => handleItemChange('quiz', qIndex, 'correctAnswerIndex', parseInt(e.target.value, 10))} />
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
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Annuler</button>
            <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">Enregistrer</button>
          </div>
        </div>

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