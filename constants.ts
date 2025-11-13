
export const WEBINAR_PRICE = 80.000; // Price in TND

export const TOPIC_CATEGORIES = [
    {
        category: "Thèmes Pédagogiques",
        topics: [
            "Dermocosmétique",
            "Dispositifs Médicaux",
            "Ordonnances",
            "Pathologies",
            "Pharmacologie",
            "Communication",
            "Savoir-faire",
            "Gestion",
        ]
    },
    {
        category: "Systèmes et Organes",
        topics: [
            "Cardiovasculaire",
            "Respiratoire",
            "Digestif",
            "Endocrinien",
            "Nerveux",
            "Urinaire",
            "Reproducteur",
            "Ostéo-articulaire",
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

export const BANK_DETAILS = {
    holder: 'CROPT',
    rib: '07309007510558138471',
    bank: 'AMEN BANK',
    branch: 'Alain Savary',
    imageUrl: 'https://newpharmia-production.up.railway.app/uploads/imageFile-1762760235176-829953438.jpg'
};
