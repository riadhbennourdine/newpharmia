export const WEBINAR_PRICE = 80.000; // Price in TND for standard CROP Tunis webinars (TTC)
export const PHARMIA_WEBINAR_PRICE_HT = 39.900; // Price in TND for PharmIA webinars (HT)
export const MASTER_CLASS_PRICE = 475.810; // Price in TND for 1 Master Class TTC (399.000 HT + 19% TVA + 1 DT)

export const TAX_RATES = {
    TVA: 0.19,
    TIMBRE: 1.000
};

export const MASTER_CLASS_PACKS = [
    {
        id: 'MC_UNIT',
        name: '1 Master Class',
        description: 'Accès au cycle complet de 3 sessions sur un thème.',
        credits: 3,
        priceHT: 399.000,
        badge: 'Standard'
    },
    {
        id: 'MC_PACK_3',
        name: 'Pack 3 MC',
        description: 'Choisissez 3 thèmes majeurs (-16% de remise).',
        credits: 9,
        priceHT: 999.000, 
        badge: 'Populaire'
    },
    {
        id: 'MC_PACK_6',
        name: 'Pack 6 MC',
        description: 'Un semestre de formation complet (-33% de remise).',
        credits: 18,
        priceHT: 1599.000, 
        badge: 'Avancé'
    },
    {
        id: 'MC_FULL',
        name: 'Pack Intégral (10)',
        description: 'TOUTES les Master Class 2026 (-50% de remise).',
        credits: 30,
        priceHT: 1995.000, 
        badge: 'Meilleure Offre'
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
            "Bucco-dentaire",
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

export const PHARMACONSEIL_BANK_DETAILS = {
    holder: 'PHARMACONSEIL BMB',
    rib: '03 027 1570115004362 83',
    bank: 'Banque Nationale Agricole (BNA)',
    branch: 'BOUMHEL ELBASSATINE',
    imageUrl: 'https://pharmaconseilbmb.com/photos/site/rib-bna.png'
};