import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { generateCaseStudyDraft, generateLearningTools } from '../services/geminiService';
import { CaseStudy } from '../types';
import { SparklesIcon, ChevronLeftIcon, Spinner, TrashIcon, PlusCircleIcon, ImageIcon } from '../components/Icons';
import ImageUploadModal from '../components/ImageUploadModal';
import { DetailedMemoFicheView } from './MemoFicheView';
import { TOPIC_CATEGORIES } from '../constants';
import { buildAIPrompt } from '../utils/aiPromptBuilder';

const GeneratorView: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState<{ url: string; title: string; }[]>([{ url: '', title: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTools, setIsGeneratingTools] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<CaseStudy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoFicheType, setMemoFicheType] = useState<'maladie' | 'pharmacologie' | 'dermocosmetique' | 'dispositifs-medicaux' | 'ordonnances' | 'communication' | 'micronutrition' | 'savoir' | 'le-medicament'>('maladie');
  const [step, setStep] = useState(1); // 1: select type, 2: fill details
  const [pharmaTheme, setPharmaTheme] = useState('');
  const [pharmaPathology, setPharmaPathology] = useState('');
  const [youtubeExplainerUrl, setYoutubeExplainerUrl] = useState(''); // New state
  const [infographicImageUrl, setInfographicImageUrl] = useState(''); // New state
  const [pdfSlideshowUrl, setPdfSlideshowUrl] = useState(''); // New state
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const navigate = useNavigate();
  const { saveCaseStudy } = useData();

  const handleYoutubeLinkChange = (index: number, field: 'url' | 'title', value: string) => {
    const newYoutubeLinks = [...youtubeLinks];
    newYoutubeLinks[index] = { ...newYoutubeLinks[index], [field]: value };
    setYoutubeLinks(newYoutubeLinks);
  };

  const addYoutubeLink = () => {
    if (youtubeLinks.length < 3) {
      setYoutubeLinks([...youtubeLinks, { url: '', title: '' }]);
    }
  };

  const removeYoutubeLink = (index: number) => {
    const newYoutubeLinks = [...youtubeLinks];
    newYoutubeLinks.splice(index, 1);
    setYoutubeLinks(newYoutubeLinks);
  };

  const handleGenerate = async () => {
    // Basic validation for other types
    if (memoFicheType === 'maladie' && (!sourceText.trim() || !selectedTheme || !selectedSystem)) return;
    if ((memoFicheType === 'pharmacologie' || memoFicheType === 'dispositifs-medicaux') && (!sourceText.trim() || !pharmaTheme.trim() || !pharmaPathology.trim())) return;
    if (memoFicheType === 'dermocosmetique' && (!sourceText.trim() || !selectedTheme || !selectedSystem)) return;
    if (memoFicheType === 'micronutrition' && (!sourceText.trim() || !selectedTheme || !selectedSystem)) return;
    if (memoFicheType === 'savoir' && !sourceText.trim()) return;
    if (memoFicheType === 'ordonnances' && !sourceText.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedCase(null);

    // --- Special handling for 'le-medicament' type ---
    if (memoFicheType === 'le-medicament') {
        try {
            if (!sourceText.trim()) {
                setError("Le sujet détaillé (titre du médicament) est requis pour la création manuelle.");
                setIsLoading(false);
                return;
            }
            const newMemoFiche: CaseStudy = {
                _id: '', // MongoDB will generate this
                id: '', // Will be set by the database
                title: sourceText.substring(0, 50) + (sourceText.length > 50 ? '...' : ''), // Use first part of sourceText as title
                shortDescription: sourceText.substring(0, 100) + (sourceText.length > 100 ? '...' : ''),
                type: memoFicheType,
                theme: selectedTheme || pharmaTheme || 'Général',
                system: selectedSystem || pharmaPathology || 'Général',
                creationDate: new Date().toISOString(),
                status: MemoFicheStatus.DRAFT, // Always start as draft
                patientSituation: '', // Manual generation starts empty for main content
                keyQuestions: [],
                pathologyOverview: '',
                redFlags: [],
                mainTreatment: [],
                associatedProducts: [],
                lifestyleAdvice: [],
                dietaryAdvice: [],
                references: [],
                keyPoints: [],
                glossary: [],
                flashcards: [],
                quiz: [],
                coverImageUrl: coverImageUrl.trim() || undefined,
                youtubeLinks: youtubeLinks.filter(link => link.url.trim() !== ''),
                youtubeExplainerUrl: youtubeExplainerUrl.trim() || undefined,
                infographicImageUrl: infographicImageUrl.trim() || undefined,
                pdfSlideshowUrl: pdfSlideshowUrl.trim() || undefined,
                sourceText: sourceText, // Store the original text for potential AI generation later
                memoSections: [],
                customSections: [],
            };

            const savedCase = await saveCaseStudy(newMemoFiche);
            alert('Mémofiche créée manuellement avec succès ! Vous pouvez maintenant la modifier et utiliser l\'IA pour générer du contenu.');
            navigate(`/edit-memofiche/${savedCase._id}`); // Navigate directly to edit page
        } catch (err: any) {
            console.error('Error creating manual memo fiche:', err);
            setError(err.message || "La création de la mémofiche manuelle a échoué.");
        } finally {
            setIsLoading(false);
        }
        return; // Exit handleGenerate
    }

    // --- AI generation logic for other types (existing code) ---
    const prompt = buildAIPrompt(memoFicheType, sourceText, selectedTheme, selectedSystem, pharmaTheme, pharmaPathology);

    try {
      const draft = await generateCaseStudyDraft(prompt, memoFicheType);

      // The backend now returns a well-structured object. We just add form metadata.
      const finalMemoFiche: CaseStudy = {
        ...draft,
        _id: '', // Will be set by the database
        id: '', // Will be set by the database
        type: memoFicheType,
        theme: selectedTheme || pharmaTheme,
        system: selectedSystem || pharmaPathology,
        creationDate: new Date().toISOString(),
        // Ensure arrays are not undefined
        keyPoints: draft.keyPoints || [],
        glossary: draft.glossary || [],
        flashcards: draft.flashcards || [],
        quiz: draft.quiz || [],
        taxonomies: {
            pedagogical: selectedTheme || pharmaTheme,
            clinical: selectedSystem || pharmaPathology,
        },
        coverImageUrl: coverImageUrl.trim() || undefined,
        youtubeLinks: youtubeLinks.filter(link => link.url.trim() !== ''),
        youtubeExplainerUrl: youtubeExplainerUrl.trim() || undefined,
        infographicImageUrl: infographicImageUrl.trim() || undefined,
        pdfSlideshowUrl: pdfSlideshowUrl.trim() || undefined,
        // Ordonnances
        ordonnance: draft.ordonnance || [],
        analyseOrdonnance: draft.analyseOrdonnance || [],
        conseilsTraitement: draft.conseilsTraitement || [],
        informationsMaladie: draft.informationsMaladie || [],
        conseilsHygieneDeVie: draft.conseilsHygieneDeVie || [],
        conseilsAlimentaires: draft.conseilsAlimentaires || [],
        ventesAdditionnelles: draft.ventesAdditionnelles || {},
      } as CaseStudy;

      setGeneratedCase(finalMemoFiche);
    } catch (err: any) {
      setError(err.message || "La génération de la mémofiche a échoué. Vérifiez les données d'entrée et réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateAndGenerateTools = async () => {
    if (!generatedCase) return;

    setIsGeneratingTools(true);
    setError(null);
    try {
      const learningTools = await generateLearningTools(generatedCase);
      
      const completeCaseStudy = {
        ...generatedCase,
        flashcards: learningTools.flashcards || [],
        glossary: learningTools.glossary || [],
        quiz: learningTools.quiz || [],
      };

      const savedCase = await saveCaseStudy(completeCaseStudy);

      if (savedCase && savedCase._id) {
        // Navigate to the EDIT page
        navigate(`/edit-memofiche/${savedCase._id}`);
      } else {
        // The server did not return the ID, so we can't navigate to the editor.
        // Navigate to the dashboard instead to prevent creating a duplicate empty fiche.
        alert('Mémofiche générée et sauvegardée avec succès ! Vous la trouverez dans votre tableau de bord.');
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message || "La génération des outils pédagogiques a échoué.");
      setIsGeneratingTools(false);
    }
  };
  
  const handleSaveManually = async () => {
    if (!sourceText.trim()) {
      setError("Le sujet détaillé de la mémofiche est requis pour la sauvegarde manuelle.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newMemoFiche: CaseStudy = {
        _id: '', // MongoDB will generate this
        id: '', // Will be set by the database
        title: sourceText.substring(0, 50) + (sourceText.length > 50 ? '...' : ''), // Use first part of sourceText as title
        shortDescription: sourceText.substring(0, 100) + (sourceText.length > 100 ? '...' : ''),
        theme: selectedTheme || pharmaTheme || 'Général',
        system: selectedSystem || pharmaPathology || 'Général',
        creationDate: new Date().toISOString(),
        patientSituation: sourceText,
        keyQuestions: [],
        pathologyOverview: '',
        redFlags: [],
        mainTreatment: [],
        associatedProducts: [],
        lifestyleAdvice: [],
        dietaryAdvice: [],
        references: [],
        keyPoints: [],
        glossary: [],
        flashcards: [],
        quiz: [],
        coverImageUrl: coverImageUrl.trim() || undefined,
        youtubeLinks: youtubeLinks.filter(link => link.url.trim() !== ''),
        youtubeExplainerUrl: youtubeExplainerUrl.trim() || undefined,
        infographicImageUrl: infographicImageUrl.trim() || undefined,
        pdfSlideshowUrl: pdfSlideshowUrl.trim() || undefined,
        sourceText: sourceText,
        memoSections: [],
        customSections: [],
      };

      const savedCase = await saveCaseStudy(newMemoFiche);
      alert('Mémofiche sauvegardée manuellement avec succès !');
      navigate(`/memofiche/${savedCase._id}`);
    } catch (err: any) {
      setError(err.message || "La sauvegarde manuelle de la mémofiche a échoué.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
      setGeneratedCase(null);
      setSourceText('');
      setSelectedTheme('');
      setSelectedSystem('');
      setCoverImageUrl('');
      setYoutubeLinks([{ url: '', title: '' }]);
      setYoutubeExplainerUrl(''); // Clear new state
      setInfographicImageUrl(''); // Clear new state
      setPdfSlideshowUrl(''); // Clear new state
      setError(null);
  }
  
  if (generatedCase) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Aperçu du Mémo</h2>
         {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6 max-w-4xl mx-auto" role="alert">
                <strong className="font-bold">Erreur : </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        <DetailedMemoFicheView caseStudy={generatedCase} onBack={handleReset} isPreview />
        <div className="text-center mt-8 flex justify-center items-center space-x-4">
            <button 
                onClick={handleReset} 
                className="text-lg bg-slate-200 text-slate-800 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-slate-300 transition-all duration-300"
                disabled={isGeneratingTools}
            >
              Retour
            </button>
            <button 
                onClick={handleValidateAndGenerateTools} 
                className="text-lg bg-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-teal-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:bg-slate-400"
                disabled={isGeneratingTools}
            >
              {isGeneratingTools ? (
                <>
                  <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
                  <span>Génération en cours...</span>
                </>
              ) : "Valider et Générer la Fiche Complète"}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-4 md:p-8">
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelectImage={(url) => {
            if (memoFicheType === 'le-medicament') {
                setInfographicImageUrl(url);
            } else {
                setCoverImageUrl(url);
            }
            setImageModalOpen(false);
        }}
      />
      <button onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)} className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 mb-6 transition-colors">
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        {step === 1 ? 'Retour au tableau de bord' : 'Retour au choix du type'}
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Générateur de Mémofiches IA</h2>
        <p className="text-lg text-slate-600">
          {step === 1 ? 'Choisissez un type de mémofiche pour commencer.' : 'Remplissez les détails pour générer votre mémofiche.'}
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
            <strong className="font-bold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
        </div>
      )}

      {step === 1 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="mb-6">
              <label htmlFor="memofiche-type-select" className="block text-lg font-medium text-slate-700 mb-2">
              Type de Mémofiche
              </label>
              <select
              id="memofiche-type-select"
              value={memoFicheType}
              onChange={(e) => {
                const newMemoFicheType = e.target.value as any;
                setMemoFicheType(newMemoFicheType);
                if (newMemoFicheType === 'dispositifs-medicaux') {
                  setPharmaTheme('Dispositifs médicaux');
                  setSelectedTheme(''); // Clear generic theme
                } else if (newMemoFicheType === 'le-medicament') {
                  setSelectedTheme('Pharmacologie'); // Set default theme
                  setPharmaTheme(''); // Clear pharma theme
                } else {
                  setPharmaTheme(''); // Clear if not 'dispositifs-medicaux' or 'le-medicament'
                  setSelectedTheme(''); // Clear generic theme
                }
              }}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
              disabled={isLoading}
              >
              <option value="maladie">Maladie courante</option>
              <option value="pharmacologie">Pharmacologie</option>
              <option value="dermocosmetique">Dermocosmétique</option>
              <option value="dispositifs-medicaux">Dispositifs médicaux</option>
              <option value="ordonnances">Ordonnances</option>
              <option value="communication">Communication</option>
              <option value="micronutrition">Micronutrition</option>
              <option value="savoir">Savoir</option>
              <option value="le-medicament">Le médicament</option>
              </select>
          </div>
          <button onClick={() => setStep(2)} className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-bold rounded-lg shadow-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300">
            Suivant
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          {(memoFicheType === 'maladie' || memoFicheType === 'dermocosmetique' || memoFicheType === 'ordonnances' || memoFicheType === 'communication' || memoFicheType === 'micronutrition' || memoFicheType === 'savoir') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                      <label htmlFor="theme-select" className="block text-lg font-medium text-slate-700 mb-2">
                      Thème Pédagogique
                      </label>
                      <select
                      id="theme-select"
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                      disabled={isLoading}
                      >
                      <option value="">Sélectionnez un thème</option>
                      {TOPIC_CATEGORIES[0].topics.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                      ))}
                      </select>
                  </div>
                  {memoFicheType !== 'communication' && (
                  <div>
                      <label htmlFor="system-select" className="block text-lg font-medium text-slate-700 mb-2">
                      Système/Organe
                      </label>
                      <select
                      id="system-select"
                      value={selectedSystem}
                      onChange={(e) => setSelectedSystem(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                      disabled={isLoading}
                      >
                      <option value="">Sélectionnez un système/organe</option>
                      {TOPIC_CATEGORIES[1].topics.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                      ))}
                      </select>
                  </div>
                  )}
              </div>
          )}

          {(memoFicheType === 'pharmacologie' || memoFicheType === 'dispositifs-medicaux') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                      <label htmlFor="pharma-theme-input" className="block text-lg font-medium text-slate-700 mb-2">
                      Thème
                      </label>
                      <select
                      id="pharma-theme-select"
                      value={pharmaTheme}
                      onChange={(e) => setPharmaTheme(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                      disabled={isLoading}
                      >
                      <option value="">Sélectionnez un thème</option>
                      {TOPIC_CATEGORIES[0].topics.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                      ))}
                      </select>
                  </div>
                  <div>
                      <label htmlFor="pharma-pathology-select" className="block text-lg font-medium text-slate-700 mb-2">
                      Indication principale
                      </label>
                      <select
                      id="pharma-pathology-select"
                      value={pharmaPathology}
                      onChange={(e) => setPharmaPathology(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                      disabled={isLoading}
                      >
                      <option value="">Sélectionnez une indication</option>
                      {TOPIC_CATEGORIES[1].topics.map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                      ))}
                      </select>
                  </div>
              </div>
          )}

          <div className="mb-6">
              <label htmlFor="source-text" className="block text-lg font-medium text-slate-700 mb-2">
              Sujet détaillé de la mémofiche
              </label>
              <textarea
              id="source-text"
              rows={10}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Décrivez en détail la mémofiche à générer..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
              disabled={isLoading}
              />
          </div>
          
          {(memoFicheType === 'le-medicament') && (
            <div className="space-y-6 mb-6 p-4 border border-slate-200 rounded-md bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">Options pour "Le médicament"</h3>
                <div>
                    <label htmlFor="theme-select-le-medicament" className="block text-lg font-medium text-slate-700 mb-2">
                    Thème Pédagogique
                    </label>
                    <select
                        id="theme-select-le-medicament"
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                        disabled={isLoading}
                    >
                        <option value="">Sélectionnez un thème</option>
                        {TOPIC_CATEGORIES[0].topics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                        ))}
                    </select>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Contenu additionnel pour "Le médicament"</h3>
                <div>
                    <label htmlFor="youtube-explainer-url" className="block text-lg font-medium text-slate-700 mb-2">
                    URL Vidéo YouTube Explicative (Optionnel)
                    </label>
                    <input
                        id="youtube-explainer-url"
                        type="text"
                        value={youtubeExplainerUrl}
                        onChange={(e) => setYoutubeExplainerUrl(e.target.value)}
                        placeholder="URL de la vidéo explicative YouTube"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="infographic-image-url" className="block text-lg font-medium text-slate-700 mb-2">
                    URL ou Télécharger Infographie (Optionnel)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            id="infographic-image-url"
                            type="text"
                            value={infographicImageUrl}
                            onChange={(e) => setInfographicImageUrl(e.target.value)}
                            placeholder="URL de l'image infographique"
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                            disabled={isLoading}
                        />
                        <button type="button" onClick={() => setImageModalOpen(true)} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="pdf-slideshow-url" className="block text-lg font-medium text-slate-700 mb-2">
                    URL Fichier PDF pour Diaporama (Optionnel)
                    </label>
                    <input
                        id="pdf-slideshow-url"
                        type="text"
                        value={pdfSlideshowUrl}
                        onChange={(e) => setPdfSlideshowUrl(e.target.value)}
                        placeholder="URL du fichier PDF public"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                        disabled={isLoading}
                    />
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <label htmlFor="cover-image-url" className="block text-lg font-medium text-slate-700 mb-2">
                  Image de couverture (Optionnel)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                    id="cover-image-url"
                    type="text"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                    disabled={isLoading}
                    />
                    <button type="button" onClick={() => setImageModalOpen(true)} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                        <ImageIcon className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>
              </div>
              <div>
                  <label className="block text-lg font-medium text-slate-700 mb-2">
                  Liens Vidéo YouTube (Optionnel)
                  </label>
                  {youtubeLinks.map((link, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                          <input
                          type="text"
                          placeholder="Titre de la vidéo"
                          value={link.title}
                          onChange={(e) => handleYoutubeLinkChange(index, 'title', e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                          disabled={isLoading}
                          />
                          <input
                          type="text"
                          placeholder="URL de la vidéo"
                          value={link.url}
                          onChange={(e) => handleYoutubeLinkChange(index, 'url', e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                          disabled={isLoading}
                          />
                          {youtubeLinks.length > 1 && (
                              <button type="button" onClick={() => removeYoutubeLink(index)} className="text-red-500 hover:text-red-700" disabled={isLoading}>
                                  <TrashIcon className="h-5 w-5" />
                              </button>
                          )}
                      </div>
                  ))}
                  {youtubeLinks.length < 3 && (
                      <button type="button" onClick={addYoutubeLink} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2" disabled={isLoading}>
                          <PlusCircleIcon className="h-5 w-5 mr-2" />
                          Ajouter un lien YouTube
                      </button>
                  )}
              </div>
          </div>

          <div className="mt-6 text-center">
            {/* Determine if the generate button should be disabled */}
            {(() => {
                let isDisabled = isLoading || !sourceText.trim();
                if (memoFicheType === 'maladie' || memoFicheType === 'dermocosmetique' || memoFicheType === 'micronutrition' || memoFicheType === 'savoir' || memoFicheType === 'ordonnances') {
                    isDisabled = isDisabled || !selectedTheme || !selectedSystem;
                } else if (memoFicheType === 'pharmacologie' || memoFicheType === 'dispositifs-medicaux') {
                    isDisabled = isDisabled || !pharmaTheme.trim() || !pharmaPathology.trim();
                }
                // For 'le-medicament', only sourceText.trim() is required for initial manual creation
                // The current isDisabled already includes !sourceText.trim(), so no further conditions needed here.
                return (
                    <button
                        onClick={handleGenerate}
                        disabled={isDisabled}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-bold rounded-lg shadow-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300"
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
                                <span>Génération en cours...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="-ml-1 mr-3 h-5 w-5" />
                                <span>Générer l'ébauche</span>
                            </>
                        )}
                    </button>
                );
            })()}
            {!isLoading && !generatedCase && (
                <button
                    onClick={handleSaveManually}
                    className="ml-4 inline-flex items-center px-6 py-3 border border-transparent text-lg font-bold rounded-lg shadow-md text-teal-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300"
                >
                    Sauvegarder manuellement
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorView;
