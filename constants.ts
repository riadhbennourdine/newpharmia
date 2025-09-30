import { User, UserRole, CaseStudy, Taxonomy } from './types';

export const TAXONOMIES: Taxonomy = {
  pedagogical: ['Maladies courantes', 'Ordonnances', 'Micronutrition', 'Dermocosmétique', 'Pharmacologie'],
  clinical: ['ORL & Respiration', 'Digestion', 'Santé cutanée', 'Muscles & Articulations', 'Cardio & Circulation']
};

export const MEMOFICHES: CaseStudy[] = [
  {
    _id: 'mf-001',
    id: 'mf-001',
    title: 'Prise en charge du Reflux Gastro-Œsophagien (RGO)',
    shortDescription: 'Conseils pour la gestion du RGO au comptoir, incluant les signaux d\'alerte et les traitements de première intention.',
    theme: 'Maladies courantes',
    system: 'Digestion',
    creationDate: '2023-10-26T10:00:00Z',
    isLocked: false,
    coverImageUrl: 'https://images.unsplash.com/photo-1601599872192-23bf4de7131b?q=80&w=2070&auto=format&fit=crop',
    youtubeUrl: 'https://www.youtube.com/watch?v=sR3C9j3Tcqo',
    patientSituation: 'Un patient de 45 ans se plaint de brûlures d\'estomac remontant dans la gorge, surtout après les repas et en position allongée.',
    keyQuestions: [
        'Depuis quand ?',
        'Fréquence ?',
        'Douleurs associées ?',
        'Signes de gravité (difficulté à avaler, perte de poids) ?'
    ],
    pathologyOverview: 'Le RGO est la remontée d\'une partie du contenu de l\'estomac dans l\'œsophage, causant une inflammation.',
    redFlags: ['Douleur thoracique', 'Vomissements de sang', 'Perte de poids inexpliquée', 'Anémie. Consultation médicale impérative.'],
    recommendations: {
        mainTreatment: ['Inhibiteurs de la pompe à protons (IPP) en cure courte (ex: Oméprazole 20mg).', 'Antiacides d\'action locale pour soulager rapidement.'],
        associatedProducts: ['Alginates (forment un gel protecteur)', 'probiotiques pour l\'équilibre digestif.'],
        lifestyleAdvice: ['Surélever la tête du lit', 'éviter de se coucher juste après le repas', 'perdre du poids si nécessaire.'],
        dietaryAdvice: ['Éviter les aliments gras, acides (agrumes, tomates), épicés, ainsi que le café, l\'alcool et les boissons gazeuses.']
    },
    references: ['Recommandations de la HAS sur la prise en charge du RGO.'],
    keyPoints: ['Identifier les signaux d\'alerte', 'Conseiller les mesures hygiéno-diététiques', 'Expliquer le rôle des IPP et des antiacides.'],
    glossary: [{ term: 'IPP', definition: 'Inhibiteur de la pompe à protons, une classe de médicaments réduisant la production d\'acide gastrique.' }],
    flashcards: [{ question: 'Quel est le principal type de médicament utilisé en cure courte pour le RGO ?', answer: 'Les Inhibiteurs de la Pompe à Protons (IPP).' }],
    quiz: [
      { 
        question: 'Quel est le signal d\'alerte principal nécessitant une consultation médicale immédiate pour un RGO ?', 
        options: ['Brûlures d\'estomac', 'Régurgitations acides', 'Perte de poids inexpliquée', 'Ballonnements'], 
        correctAnswerIndex: 2,
        explanation: 'Une perte de poids inexpliquée peut être le signe d\'une complication plus grave du RGO ou d\'une autre pathologie sous-jacente, et nécessite une investigation médicale.'
      },
      { 
        question: 'Quel type de médicament forme un gel protecteur sur le contenu de l\'estomac ?', 
        options: ['IPP', 'Antiacide', 'Alginate', 'Probiotique'], 
        correctAnswerIndex: 2,
        explanation: 'Les alginates réagissent avec l\'acide gastrique pour former une barrière visqueuse (un "radeau") qui flotte sur le contenu de l\'estomac, empêchant physiquement le reflux.'
      }
    ]
  },
  {
    _id: 'mf-002',
    id: 'mf-002',
    title: 'Gestion de l\'Acné légère à modérée',
    shortDescription: 'Protocole de conseil en dermocosmétique pour l\'acné, de l\'hygiène aux traitements locaux.',
    theme: 'Dermocosmétique',
    system: 'Santé cutanée',
    creationDate: '2023-10-25T11:00:00Z',
    isLocked: true,
    coverImageUrl: 'https://images.unsplash.com/photo-1556228724-43b5e1a4b9c5?q=80&w=1964&auto=format&fit=crop',
    patientSituation: 'Une adolescente de 16 ans est gênée par des comédons et quelques boutons rouges sur le visage.',
    keyQuestions: ['Routine de soin actuelle ?', 'Utilisation de maquillage ?', 'Facteurs aggravants (stress, alimentation) ?', 'Traitements déjà essayés ?'],
    pathologyOverview: 'L\'acné est une maladie du follicule pilo-sébacé, associant hyperséborrhée, rétention sébacée et inflammation.',
    redFlags: ['Acné sévère, nodulaire ou kystique', 'cicatrices importantes', 'impact psychologique majeur. Orientation vers un dermatologue.'],
    recommendations: {
        mainTreatment: ['Nettoyant doux adapté aux peaux acnéiques.', 'Crème traitante à base de peroxyde de benzoyle ou d\'acide salicylique.'],
        associatedProducts: ['Soin hydratant non comédogène', 'protection solaire specifique', 'masques purifiants.'],
        lifestyleAdvice: ['Nettoyer le visage matin et soir', 'ne pas percer les boutons', 'utiliser du maquillage non comédogène.'],
        dietaryAdvice: ['Limiter les aliments à index glycémique élevé (sucres rapides, produits laitiers en excès).']
    },
    references: ['Société Française de Dermatologie - Fiches d\'information.'],
    keyPoints: ['Importance d\'une routine de soin adaptée', 'Ne pas utiliser de produits agressifs', 'Conseiller la patience et la régularité.'],
    glossary: [{ term: 'Comédogène', definition: 'Se dit d\'un produit cosmétique qui a tendance à obstruer les pores de la peau et à favoriser l\'apparition de comédons (points noirs).'}],
    flashcards: [{ question: 'Quel ingrédient est souvent recommandé pour le traitement local de l\'acné légère ?', answer: 'Le peroxyde de benzoyle ou l\'acide salicylique.' }],
    quiz: [],
  },
  {
    _id: 'mf-003',
    id: 'mf-003',
    title: 'Conseil en Micronutrition pour le Sportif d\'Endurance',
    shortDescription: 'Optimiser la performance et la récupération chez le sportif d\'endurance grâce à la micronutrition.',
    theme: 'Micronutrition',
    system: 'Muscles & Articulations',
    creationDate: '2023-10-24T12:00:00Z',
    isLocked: false,
    coverImageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2070&auto=format&fit=crop',
    patientSituation: 'Un coureur amateur préparant un marathon demande des conseils pour éviter les crampes et améliorer son énergie.',
    keyQuestions: ['Quel est votre volume d\'entraînement ?', 'Quelle est votre alimentation type ?', 'Souffrez-vous de troubles digestifs à l\'effort ?'],
    pathologyOverview: 'Les besoins en micronutriments (vitamines, minéraux) sont accrus chez le sportif d\'endurance en raison du stress oxydatif et des pertes sudorales.',
    redFlags: ['Fatigue chronique', 'blessures à répétition', 'anémie. Bilan sanguin et avis médical recommandés.'],
    recommendations: {
        mainTreatment: ['Magnésium (bisglycinate de préférence) pour la fonction musculaire.', 'Vitamines du groupe B pour le métabolisme énergétique.', 'BCAA pour limiter le catabolisme musculaire.'],
        associatedProducts: ['Boissons de l\'effort isotoniques', 'barres énergétiques, gels', 'protéines de lactosérum (whey) pour la récupération.'],
        lifestyleAdvice: ['Sommeil de qualité', 'hydratation régulière tout au long de la journée', 'échauffements et étirements adaptés.'],
        dietaryAdvice: ['Privilégier les glucides complexes (pâtes complètes, riz, quinoa)', 'les protéines maigres et les bonnes graisses (oméga-3).', 'Timing des repas important autour de l\'effort.']
    },
    references: ['Consensus de l\'International Society of Sports Nutrition (ISSN).'],
    keyPoints: ['L\'hydratation est cruciale', 'Le magnésium aide à prévenir les crampes', 'Les protéines sont essentielles pour la récupération.'],
    glossary: [{ term: 'BCAA', definition: 'Branched-Chain Amino Acids (Acides Aminés à Chaîne Ramifiée) : Leucine, Isoleucine et Valine, essentiels pour la récupération musculaire.'}],
    flashcards: [{ question: 'Quel minéral est particulièrement important pour prévenir les crampes chez le sportif ?', answer: 'Le magnésium.' }],
    quiz: [],
  }
];

export const TOPIC_CATEGORIES = [
  {
    category: 'Thèmes Pédagogiques',
    topics: [
      'Maladies courantes',
      'Ordonnances',
      'Micronutrition',
      'Dermocosmétique',
      'Dispositifs Médicaux',
      'Pharmacie vétérinaire',
      'Pharmacologie',
      'Communication',
    ]
  },
  {
    category: 'Systèmes et Organes',
    topics: [
        'ORL & Respiration', 
        'Digestion', 
        'Santé cutanée', 
        'Muscles & Articulations', 
        'Cardio & Circulation',
        'Santé Féminine',
        'Pédiatrie',
        'Sommeil & Stress'
    ]
  }
];