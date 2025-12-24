import React, { useState } from 'react';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, BeakerIcon } from '../../components/Icons'; // Assuming generic icons or reusing existing
import { useNavigate } from 'react-router-dom';

type Step = 'SELECTION' | 'TRIAGE' | 'RESULT_OK' | 'RESULT_REFER';

interface Pathologie {
  id: string;
  name: string;
  icon: string;
  redFlags: string[]; // "A" - Alerte
  questions: {
    P: string[]; // Profil
    H: string[]; // Histoire
    A_analyse: string[]; // Analyse symptômes
    R: string[]; // Récurrence
    M: string[]; // Médicaments/Maladies
    A_alerte: string[]; // Autres / Alerte
  };
  protocol: {
    hygiene: string[];
    traitement: string[];
    soin: string[];
  };
}

const pathologies: Pathologie[] = [
  {
    id: 'acne',
    name: 'Acné',
    icon: '🧖‍♀️',
    redFlags: ['Fièvre associée', 'Signes de virilisation brutale', 'Enfant < 12 ans (hors acné néonatale)'],
    questions: {
      P: ['Âge du patient ?', 'Grossesse / Projet de grossesse ? (Attention aux rétinoïdes/cyclines)'],
      H: ['Depuis quand ?', 'Facteur déclenchant (stress, cycle, soleil) ?'],
      A_analyse: ['Localisation (Visage, Dos, Thorax) ?', 'Type : Comédons (points noirs) ou Inflammatoire (rouge/blanc) ?'],
      R: ['Déjà traité ?', 'Echec de traitements précédents ?'],
      M: ['Prise de corticoïdes, lithium, vitamine B12 ?', 'Contraception hormonale ?'],
      A_alerte: ['Impact psychologique sévère ?', 'Cicatrices importantes ?']
    },
    protocol: {
      hygiene: ['Gel nettoyant doux sans savon', 'Eau micellaire purifiante'],
      traitement: ['Peroxyde de benzoyle (si indiqué)', 'Crème kératolytique (AHA/BHA)'],
      soin: ['Hydratant compensateur (si peau desséchée)', 'Protection solaire fluide non comédogène']
    }
  },
  {
    id: 'eczema',
    name: 'Eczéma / Dermatite',
    icon: '🌵',
    redFlags: ['Surinfection (croûtes jaunes, pus)', 'Fièvre', 'Extension rapide sur tout le corps (Erythrodermie)'],
    questions: {
      P: ['Âge ?', 'Terrain atopique familial (asthme, rhume des foins) ?'],
      H: ['Poussée actuelle ou fond chronique ?', 'Contact avec allergène potentiel ?'],
      A_analyse: ['Sécheresse (Xérose) ?', 'Rougeurs ?', 'Démangeaisons (Prurit) ?'],
      R: ['Saisonnier ?', 'Fréquence des crises ?'],
      M: ['Traitement en cours ?', 'Immunosuppresseurs ?'],
      A_alerte: ['Altération de l\'état général ?', 'Douleur intense ?']
    },
    protocol: {
      hygiene: ['Huile lavante relipidante', 'Syndet surgras'],
      traitement: ['Crème émolliente (phase calme)', 'Hydrocortisone (conseil max 3j si pas de médecin)'],
      soin: ['Eau thermale pour apaiser', 'Spray anti-grattage']
    }
  },
  {
    id: 'mycose',
    name: 'Mycose Cutanée',
    icon: '🍄',
    redFlags: ['Diabète déséquilibré', 'Immunodépression', 'Atteinte des ongles (Onychomycose) étendue'],
    questions: {
      P: ['Sportif (pied d\'athlète) ?', 'Profession (contact eau) ?'],
      H: ['Evolution centrifuge (s\'étend par les bords) ?'],
      A_analyse: ['Forme arrondie ?', 'Bordure active rouge ?', 'Squames ?', 'Maceration (plis) ?'],
      R: ['Récidivant ?'],
      M: ['Prise d\'antibiotiques récente ?', 'Corticoïdes locaux ?'],
      A_alerte: ['Surinfection bactérienne ?']
    },
    protocol: {
      hygiene: ['Savon alcalin ou neutre', 'Bien sécher les plis'],
      traitement: ['Crème antifongique (Imidazolés)', 'Poudre (si chaussures fermées)'],
      soin: ['Laver vêtements à 60°C']
    }
  }
];

const DermoGuideApp: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('SELECTION');
  const [selectedPathologie, setSelectedPathologie] = useState<Pathologie | null>(null);
  const [hasRedFlag, setHasRedFlag] = useState(false);

  const handleSelectPathologie = (patho: Pathologie) => {
    setSelectedPathologie(patho);
    setStep('TRIAGE');
    setHasRedFlag(false);
  };

  const handleValidation = (redFlagFound: boolean) => {
    if (redFlagFound) {
      setStep('RESULT_REFER');
    } else {
      setStep('RESULT_OK');
    }
  };

  const reset = () => {
    setStep('SELECTION');
    setSelectedPathologie(null);
    setHasRedFlag(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => step === 'SELECTION' ? navigate('/apps') : reset()} className="mr-4 text-gray-500 hover:text-teal-600 transition-colors">
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 font-poppins flex items-center">
              <span className="text-2xl mr-2">🧴</span> DermoGuide <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline-block">Approche PHARMA</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* STEP 1: SELECTION */}
        {step === 'SELECTION' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Quel est le motif de la consultation ?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {pathologies.map((patho) => (
                <button
                  key={patho.id}
                  onClick={() => handleSelectPathologie(patho)}
                  className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm hover:shadow-lg border-2 border-transparent hover:border-teal-500 transition-all duration-200 group"
                >
                  <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">{patho.icon}</span>
                  <span className="text-lg font-semibold text-slate-700 group-hover:text-teal-700">{patho.name}</span>
                </button>
              ))}
              {/* Placeholder for more */}
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <span className="text-3xl mb-2">+</span>
                <span className="text-sm font-medium">Autres (Bientôt)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: TRIAGE PHARMA */}
        {step === 'TRIAGE' && selectedPathologie && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                 <span className="text-3xl mr-3">{selectedPathologie.icon}</span> 
                 Analyse PHARMA : {selectedPathologie.name}
               </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* P - Profil */}
              <PharmaCard letter="P" title="Profil du Patient" color="bg-blue-50 border-blue-200 text-blue-800">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectedPathologie.questions.P.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </PharmaCard>

              {/* H - Histoire */}
              <PharmaCard letter="H" title="Histoire de la Maladie" color="bg-indigo-50 border-indigo-200 text-indigo-800">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectedPathologie.questions.H.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </PharmaCard>

              {/* A - Analyse */}
              <PharmaCard letter="A" title="Analyse des Symptômes" color="bg-teal-50 border-teal-200 text-teal-800">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectedPathologie.questions.A_analyse.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </PharmaCard>

              {/* R - Récurrence */}
              <PharmaCard letter="R" title="Récurrence" color="bg-purple-50 border-purple-200 text-purple-800">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectedPathologie.questions.R.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </PharmaCard>

              {/* M - Médicaments */}
              <PharmaCard letter="M" title="Médicaments & Maladies" color="bg-orange-50 border-orange-200 text-orange-800">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectedPathologie.questions.M.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </PharmaCard>

              {/* A - Alerte (Red Flags) */}
              <PharmaCard letter="A" title="Alertes (Drapeaux Rouges)" color="bg-red-50 border-red-200 text-red-800">
                <p className="text-xs font-bold text-red-600 mb-2 uppercase">Si présence d'un de ces signes : Orientation Médecin</p>
                <ul className="space-y-2">
                  {selectedPathologie.redFlags.concat(selectedPathologie.questions.A_alerte).map((flag, i) => (
                    <li key={i} className="flex items-start">
                      <input 
                        type="checkbox" 
                        id={`flag-${i}`} 
                        className="mt-1 mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        onChange={(e) => setHasRedFlag(prev => e.target.checked ? true : prev)} // Simplification: once checked, stays flagged visually for now
                      />
                      <label htmlFor={`flag-${i}`} className="text-sm text-slate-800 font-medium cursor-pointer select-none">{flag}</label>
                    </li>
                  ))}
                </ul>
              </PharmaCard>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => handleValidation(true)}
                className="px-6 py-3 bg-white border-2 border-red-500 text-red-600 font-bold rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors"
              >
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                Orienter vers le Médecin
              </button>
              <button 
                onClick={() => handleValidation(false)}
                className="px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
              >
                <CheckCircleIcon className="h-6 w-6 mr-2" />
                Valider le Conseil Officinal
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT - REFER */}
        {step === 'RESULT_REFER' && (
          <div className="animate-fade-in max-w-2xl mx-auto text-center p-8 bg-white rounded-2xl shadow-lg border-t-4 border-red-500">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Consultation Médicale Requise</h2>
            <p className="text-lg text-gray-600 mb-8">
              L'analyse PHARMA a révélé des signes d'alerte (Drapeaux Rouges) ou une situation dépassant le conseil officinal.
            </p>
            <div className="bg-red-50 p-6 rounded-lg text-left mb-8">
              <h3 className="font-bold text-red-800 mb-2">Conduite à tenir :</h3>
              <ul className="list-disc list-inside text-red-700 space-y-2">
                <li>Expliquer au patient les raisons de l'orientation sans l'alarmer.</li>
                <li>Ne pas appliquer de traitement actif qui pourrait masquer les lésions.</li>
                <li>Proposer éventuellement un soin d'hygiène neutre en attendant le RDV.</li>
              </ul>
            </div>
            <button onClick={reset} className="text-teal-600 font-medium hover:underline">
              Retour à l'accueil
            </button>
          </div>
        )}

        {/* STEP 3: RESULT - OK */}
        {step === 'RESULT_OK' && selectedPathologie && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Protocole Conseil PharmIA</h2>
              <p className="text-gray-500 mt-2">Protocole recommandé pour : <strong>{selectedPathologie.name}</strong></p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Etape 1: Hygiène */}
              <ProtocolCard step={1} title="Nettoyer & Préparer" icon="🧼" items={selectedPathologie.protocol.hygiene} />
              
              {/* Etape 2: Traitement */}
              <ProtocolCard step={2} title="Traiter" icon="💊" items={selectedPathologie.protocol.traitement} highlight />
              
              {/* Etape 3: Soin */}
              <ProtocolCard step={3} title="Hydrater & Protéger" icon="🛡️" items={selectedPathologie.protocol.soin} />
            </div>

            <div className="mt-12 text-center">
              <button onClick={reset} className="px-6 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 font-medium">
                Nouvelle consultation
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

const PharmaCard: React.FC<{ letter: string; title: string; color: string; children: React.ReactNode }> = ({ letter, title, color, children }) => (
  <div className={`p-4 rounded-xl border ${color} bg-opacity-60`}>
    <div className="flex items-center mb-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white font-bold text-lg shadow-sm mr-3">
        {letter}
      </span>
      <h3 className="font-bold text-base uppercase tracking-wide">{title}</h3>
    </div>
    {children}
  </div>
);

const ProtocolCard: React.FC<{ step: number; title: string; icon: string; items: string[]; highlight?: boolean }> = ({ step, title, icon, items, highlight }) => (
  <div className={`bg-white rounded-xl shadow-md overflow-hidden border-t-4 ${highlight ? 'border-teal-500 ring-4 ring-teal-50' : 'border-gray-300'}`}>
    <div className="p-6">
      <div className="text-center mb-4">
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Étape {step}</span>
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-2 w-2 rounded-full bg-teal-500"></div>
            </div>
            <p className="ml-3 text-sm text-gray-700 font-medium">{item}</p>
          </div>
        ))}
      </div>
    </div>
    {highlight && (
      <div className="bg-teal-50 p-3 text-center text-xs font-bold text-teal-700 uppercase tracking-wide">
        Cœur du traitement
      </div>
    )}
  </div>
);

export default DermoGuideApp;

