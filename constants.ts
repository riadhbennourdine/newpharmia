
export const WEBINAR_PRICE = 80.000; // Price in TND for standard CROP Tunis webinars
export const MASTER_CLASS_PRICE = 48.481; // Price in TND for Master Class Unit (39.9 HT + 19% TVA + 1 DT)

// This is a dummy comment to force rebuild of this file.
export const TAX_RATES = {
    TVA: 0.19,
    TIMBRE: 1.000
};

export const MASTER_CLASS_PACKS = [
    {
        id: 'MC_UNIT',
        name: 'Ticket Unitaire',
        description: 'Accès à 1 Master Class',
        credits: 1,
        priceHT: 39.900,
        badge: 'Standard'
    },
    {
        id: 'MC10',
        name: 'Pack Découverte (10)',
        description: 'Idéal pour découvrir le format. 10 Master Class.',
        credits: 10,
        priceHT: 350.000, 
        badge: 'Populaire'
    },
    {
        id: 'MC25',
        name: 'Pack Engagé (25)',
        description: 'Pour une formation régulière. 25 Master Class.',
        credits: 25,
        priceHT: 750.000, 
        badge: 'Meilleure Valeur'
    },
    {
        id: 'MC50',
        name: 'Pack Expert (50)',
        description: 'Devenez une référence. 50 Master Class.',
        credits: 50,
        priceHT: 1250.000, 
        badge: '-37% de remise'
    },
    {
        id: 'MC100',
        name: 'Pack Institution (100)',
        description: 'Formation continue complète. 100 Master Class.',
        credits: 100,
        priceHT: 1999.000, 
        badge: 'Prix Choc (-50%)'
    }
];

export const TOPIC_CATEGORIES = [
    {
        category: "Thèmes Pédagogiques",
        topics: [
            "Maladies courantes",
            "Ordonnances",
            "Micronutrition",
            "Dermocosmétique",
            "Dispositifs médicaux",
            "Pharmacie vétérinaire",
            "Pharmacologie",
            "Communication",
        ]
    },
    {
        category: "Systèmes et Organes",
        topics: [
            "Cardiovasculaire",
            "ORL & Respiration",
            "Digestion",
            "Endocrinien",
            "Nerveux",
            "Santé Féminine",
            "Ostéo-articulaire",
            "Santé cutanée",
            "Pédiatrie",
        ]
    }
];

// Placeholder for MEMOFICHES to fix build error
export const MEMOFICHES = [
    {
        _id: 'preview-1',
        id: 'preview-1',
        title: 'Exemple de Mémofiche',
        shortDescription: 'Ceci est un aperçu du contenu d\'une mémofiche interactive.',
        theme: 'Dermocosmétique',
        system: 'Peau',
        creationDate: new Date().toISOString(),
        status: 'Published',
        isLocked: true,
        patientSituation: {
            title: 'Situation du Patient',
            content: [{ type: 'text', value: 'Un patient se présente avec une peau sèche et des démangeaisons.' }]
        },
        keyQuestions: [],
        pathologyOverview: {
            title: 'Aperçu',
            content: [{ type: 'text', value: 'Informations sur la pathologie.' }]
        },
        redFlags: [],
        keyPoints: [],
        glossary: [],
        flashcards: [],
        references: [],
    }
];

export const CROPT_BANK_DETAILS = {
    holder: 'CROPT',
    rib: '07309007510558138471',
    bank: 'AMEN BANK',
    branch: 'Alain Savary',
    imageUrl: 'https://pharmaconseilbmb.com/photos/rib-cropt.jpg'
};

export const SKILL_SEED_BANK_DETAILS = {
    holder: 'SKILL SEED TEAM',
    rib: '32024788116183970167',
    bank: 'alBaraka',
    branch: 'Hammam Lif',
    imageUrl: '/api/ftp/view?filePath=%2Frib-skill-seed.pdf'
};
