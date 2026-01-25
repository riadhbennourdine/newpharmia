export const WEBINAR_PRICE = 80.0; // Price in TND for standard CROP Tunis webinars (TTC)
export const PHARMIA_WEBINAR_PRICE_HT = 39.9; // Price in TND for PharmIA webinars (HT)
export const MASTER_CLASS_PRICE = 285.6; // Price in TND for 1 Master Class (240 HT + 19% TVA)

export const TAX_RATES = {
  TVA: 0.19,
  TIMBRE: 1.0,
};

export const MASTER_CLASS_PACKS = [
  {
    id: 'MC_UNIT',
    name: 'Master Class Unitaire',
    description: 'Accès à 1 Master Class au choix.',
    credits: 3, // 1 MC = 3 credits (sessions)
    priceHT: 240.0,
    discountPercentage: 0, // Base price, no discount
  },
  {
    id: 'MC_PACK_3',
    name: 'Pack 3 MC',
    description: 'Choisissez 3 thèmes majeurs (-15% de remise).',
    credits: 9, // 3 MCs
    priceHT: 612.0, // 3 * 240 * (1 - 0.15) = 720 * 0.85
    discountPercentage: 15,
  },
  {
    id: 'MC_PACK_5',
    name: 'Pack 5 MC',
    description: '5 thèmes pour approfondir vos compétences (-30% de remise).',
    credits: 15, // 5 MCs
    priceHT: 840.0, // 5 * 240 * (1 - 0.30) = 1200 * 0.70
    discountPercentage: 30,
  },
  {
    id: 'MC_FULL',
    name: 'Pack Intégral (10)',
    description: 'TOUTES les Master Class 2026 (-50% de remise).',
    credits: 30, // 10 MCs
    priceHT: 1200.0, // 10 * 240 * (1 - 0.50) = 2400 * 0.5
    discountPercentage: 50,
  },
];

export const PHARMIA_CREDIT_PACKS = [
  {
    id: 'PIA_PACK_4',
    name: 'Pack 4 Crédits',
    description: '4 Crédits pour les wébinaires PharmIA (-20%).',
    credits: 4,
    priceHT: 127.68, // 4 * 39.900 * 0.80
    discountPercentage: 20,
  },
  {
    id: 'PIA_PACK_12',
    name: 'Pack 12 Crédits',
    description: '12 Crédits pour les wébinaires PharmIA (-30%).',
    credits: 12,
    priceHT: 335.16, // 12 * 39.900 * 0.70
    discountPercentage: 30,
  },
  {
    id: 'PIA_PACK_24',
    name: 'Pack 24 Crédits',
    description: '24 Crédits pour les wébinaires PharmIA (-50%).',
    credits: 24,
    priceHT: 478.8, // 24 * 39.900 * 0.50
    discountPercentage: 50,
  },
];

export const TOPIC_CATEGORIES = [
  {
    category: 'Thèmes Pédagogiques',
    topics: [
      'Maladies courantes',
      'Ordonnances',
      'Micronutrition',
      'Dermocosmétique',
      'Dispositifs médicaux',
      'Pharmacie vétérinaire',
      'Pharmacologie',
      'Communication',
    ],
  },
  {
    category: 'Systèmes et Organes',
    topics: [
      'Cardiovasculaire',
      'ORL & Respiration',
      'Digestion',
      'Bucco-dentaire',
      'Endocrinien',
      'Nerveux',
      'Santé Féminine',
      'Ostéo-articulaire',
      'Santé cutanée',
      'Pédiatrie',
    ],
  },
];

// Placeholder for MEMOFICHES to fix build error
export const MEMOFICHES = [
  {
    _id: 'preview-1',
    id: 'preview-1',
    title: 'Exemple de Mémofiche',
    shortDescription:
      "Ceci est un aperçu du contenu d'une mémofiche interactive.",
    theme: 'Dermocosmétique',
    system: 'Peau',
    creationDate: new Date().toISOString(),
    status: 'Published',
    isLocked: true,
    patientSituation: {
      title: 'Situation du Patient',
      content: [
        {
          type: 'text',
          value:
            'Un patient se présente avec une peau sèche et des démangeaisons.',
        },
      ],
    },
    keyQuestions: [],
    pathologyOverview: {
      title: 'Aperçu',
      content: [{ type: 'text', value: 'Informations sur la pathologie.' }],
    },
    redFlags: [],
    keyPoints: [],
    glossary: [],
    flashcards: [],
    references: [],
  },
];

export const CROPT_BANK_DETAILS = {
  holder: 'CROPT',
  rib: '07309007510558138471',
  bank: 'AMEN BANK',
  branch: 'Alain Savary',
  imageUrl: 'https://pharmaconseilbmb.com/photos/rib-cropt.jpg',
};

export const SKILL_SEED_BANK_DETAILS = {
  holder: 'SKILL SEED TEAM',
  rib: '32024788116183970167',
  bank: 'alBaraka',
  branch: 'Hammam Lif',
  imageUrl: '/api/ftp/view?filePath=%2Frib-skill-seed.pdf',
};

export const PHARMACONSEIL_BANK_DETAILS = {
  holder: 'PHARMACONSEIL BMB',
  rib: '03 027 1570115004362 83',
  bank: 'Banque Nationale Agricole (BNA)',
  branch: 'BOUMHEL ELBASSATINE',
  imageUrl: 'https://pharmaconseilbmb.com/photos/site/rib-bna.png',
};
