import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { generateCaseStudyDraft, generateLearningTools } from '../services/geminiService';
import { CaseStudy } from '../types';
import { SparklesIcon, ChevronLeftIcon, Spinner } from '../components/Icons';
import { DetailedMemoFicheView } from './MemoFicheView';
import { TOPIC_CATEGORIES } from '../constants';

const GeneratorView: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTools, setIsGeneratingTools] = useState(false);
  const [generatedCase, setGeneratedCase] = useState<CaseStudy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memoFicheType, setMemoFicheType] = useState<'maladie' | 'pharmacologie' | 'dermocosmetique' | 'exhaustive'>('maladie');
  const [pharmaTheme, setPharmaTheme] = useState('');
  const [pharmaPathology, setPharmaPathology] = useState('');
  const navigate = useNavigate();
  const { saveCaseStudy } = useData();

  const handleGenerate = async () => {
    if (memoFicheType === 'maladie' && (!sourceText.trim() || !selectedTheme || !selectedSystem)) return;
    if (memoFicheType === 'pharmacologie' && (!sourceText.trim() || !pharmaTheme.trim() || !pharmaPathology.trim())) return;
    if (memoFicheType === 'dermocosmetique' && (!sourceText.trim() || !selectedTheme || !selectedSystem)) return;
    if (memoFicheType === 'exhaustive' && !sourceText.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedCase(null);
    
    const formattingInstructions = `

Instructions de formatage impératives pour chaque section :
- Le contenu doit être concis, pertinent et facile à lire pour un professionnel de la pharmacie.
- Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).

Instructions spécifiques par section :
- **Questions clés à poser**: Chaque ligne doit être une question pertinente commençant par un mot-clé en évidence (ex: **Antécédents**).
- **Aperçu pathologie**: Doit être une liste à puces (commençant par "- "). Ne pas dépasser 10 points. Chaque point doit commencer par un mot-clé en évidence. Simplifier le contenu pour qu'il soit très direct.
- **Signaux d'alerte**: Doit être une liste à puces (commençant par "- "). Chaque point doit être un signal d'alerte commençant par un mot-clé en évidence (ex: - **Fièvre élevée**).
- **Produits associés**: Doit être une liste à puces (commençant par "- "). Ne pas dépasser 12 points. Chaque point doit concerner un produit ou une classe de produits et commencer par le nom en évidence (ex: **Paracétamol**).
- **Cas comptoir**: Décrire la situation ou la demande du patient se présentant au comptoir.
- **Etat et besoin de la peau**: Analyser les informations collectées pour définir le besoin principal.
- **Conseiller une consultation dermatologique**: Identifier les signaux d'alerte nécessitant un avis médical.
- **Produit principal**: Proposer un ou deux produits principaux répondant directement au besoin identifié.
- **Hygiène de vie**: Conseils généraux pour soutenir la santé globale.
- **Conseils alimentaires**: Conseiller sur les régimes alimentaires spécifiques.
- Pour toutes les autres sections, appliquer le formatage général d'une liste à puces avec des mots-clés en évidence au début de chaque ligne.
`;

    const pharmaFormattingInstructions = `

Instructions de formatage impératives :
- Le contenu doit être concis, pertinent et facile à lire pour un professionnel de la pharmacie.
- Vous devez générer UNIQUEMENT les sections personnalisées.
- NE PAS utiliser les sections suivantes : "Questions clés à poser", "Aperçu pathologie", "Signaux d'alerte", "Produits associés", "Cas comptoir", "Etat et besoin de la peau", "Conseiller une consultation dermatologique", "Produit principal", "Hygiène de vie", "Conseils alimentaires".

Instructions spécifiques pour les sections personnalisées :
- Vous devez générer un tableau de sections personnalisées dans le champ "customSections".
- Chaque section doit avoir un "title" et un "content".
- Les titres des sections doivent être pertinents pour le sujet de la pharmacologie.
- Le contenu de chaque section doit être une liste à puces, où chaque ligne commence par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).
`;

    let prompt = '';
    if (memoFicheType === 'maladie') {
        prompt = `Génère une mémofiche pour des professionnels de la pharmacie sur le sujet : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".${formattingInstructions}`;
    } else if (memoFicheType === 'pharmacologie') {
        prompt = `Génère une mémofiche de pharmacologie sur le principe actif ou la classe : "${sourceText}". Le thème de la mémofiche est "${pharmaTheme}" et la pathologie cible est "${pharmaPathology}".${pharmaFormattingInstructions}`;
    } else if (memoFicheType === 'dermocosmetique') {
        prompt = `Vous devez impérativement utiliser le modèle de mémofiche de dermocosmétique. Ne pas utiliser le modèle de maladies courantes. Génère une mémofiche de dermocosmétique sur le sujet : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".${formattingInstructions}`;
    } else { // exhaustive
        prompt = `Génère une mémofiche de synthèse exhaustive et très détaillée sur le sujet suivant : "${sourceText}".${formattingInstructions}`;
    }

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
        youtubeUrl: youtubeUrl.trim() || undefined,
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
        recommendations: {
          mainTreatment: [],
          associatedProducts: [],
          lifestyleAdvice: [],
          dietaryAdvice: [],
        },
        references: [],
        keyPoints: [],
        glossary: [],
        flashcards: [],
        quiz: [],
        coverImageUrl: coverImageUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
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
      setYoutubeUrl('');
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
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 mb-6 transition-colors">
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        Retour au tableau de bord
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Générateur de Mémofiches IA</h2>
        <p className="text-lg text-slate-600">Choisissez un contexte, décrivez un sujet, et générez une mémofiche structurée.</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
            <strong className="font-bold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
            <label htmlFor="memofiche-type-select" className="block text-lg font-medium text-slate-700 mb-2">
            Type de Mémofiche
            </label>
            <select
            id="memofiche-type-select"
            value={memoFicheType}
            onChange={(e) => setMemoFicheType(e.target.value as any)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
            disabled={isLoading}
            >
            <option value="maladie">Maladie courante</option>
            <option value="pharmacologie">Pharmacologie</option>
            <option value="dermocosmetique">Dermocosmétique</option>
            <option value="exhaustive">Synthèse exhaustive</option>
            </select>
        </div>

        {memoFicheType === 'maladie' && (
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
            </div>
        )}

        {memoFicheType === 'pharmacologie' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label htmlFor="pharma-theme-input" className="block text-lg font-medium text-slate-700 mb-2">
                    Thème de la mémofiche
                    </label>
                    <input
                    id="pharma-theme-input"
                    type="text"
                    value={pharmaTheme}
                    onChange={(e) => setPharmaTheme(e.target.value)}
                    placeholder="Ex: Les antiulcéreux"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                    disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="pharma-pathology-input" className="block text-lg font-medium text-slate-700 mb-2">
                    Pathologie cible
                    </label>
                    <input
                    id="pharma-pathology-input"
                    type="text"
                    value={pharmaPathology}
                    onChange={(e) => setPharmaPathology(e.target.value)}
                    placeholder="Ex: Le reflux gastro-œsophagien"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                    disabled={isLoading}
                    />
                </div>
            </div>
        )}

        {memoFicheType === 'dermocosmetique' && (
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <label htmlFor="cover-image-url" className="block text-lg font-medium text-slate-700 mb-2">
                URL de l'image de couverture (Optionnel)
                </label>
                <input
                id="cover-image-url"
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://exemple.com/image.jpg"
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="youtube-url" className="block text-lg font-medium text-slate-700 mb-2">
                URL de la vidéo YouTube (Optionnel)
                </label>
                <input
                id="youtube-url"
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                disabled={isLoading}
                />
            </div>
        </div>

      </div>

      <div className="mt-6 text-center">
        <button
          onClick={handleGenerate}
          disabled={isLoading || !sourceText.trim() || (memoFicheType === 'maladie' && (!selectedTheme || !selectedSystem)) || (memoFicheType === 'pharmacologie' && (!pharmaTheme.trim() || !pharmaPathology.trim())) || (memoFicheType === 'dermocosmetique' && (!selectedTheme || !selectedSystem))}
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
  );
};

export default GeneratorView;