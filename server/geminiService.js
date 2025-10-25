// Force recompile
import { GoogleGenAI, Type } from "@google/genai";
// This file uses an older syntax for the Google GenAI SDK that is compatible with the project's dependencies.
// The main class is GoogleGenAI and content is generated via ai.models.generateContent(...)
export const generateCaseStudyDraft = async (prompt, memoFicheType) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY)
        throw new Error("La clé API de Gemini n'est pas configurée.");
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    let jsonStructure = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            patientSituation: { type: Type.STRING },
            keyQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            pathologyOverview: { type: Type.STRING },
            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: {
                type: Type.OBJECT,
                properties: {
                    mainTreatment: { type: Type.ARRAY, items: { type: Type.STRING } },
                    associatedProducts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    lifestyleAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
                    dietaryAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice'],
            },
            references: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags', 'recommendations', 'references'],
    };
    if (memoFicheType === 'pharmacologie') {
        jsonStructure = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                patientSituation: { type: Type.STRING },
                keyQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                customSections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                        },
                        required: ['title', 'content'],
                    },
                },
            },
            required: ['title', 'patientSituation', 'keyQuestions', 'customSections'],
        };
    }
    else if (memoFicheType === 'dispositifs-medicaux') {
        jsonStructure = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                patientSituation: { type: Type.STRING },
                circonstancesConseil: { type: Type.STRING },
                pathologiesConcernees: { type: Type.STRING },
                argumentationInteret: { type: Type.STRING },
                beneficesSante: { type: Type.STRING },
                exemplesArticles: { type: Type.STRING },
                reponsesObjections: { type: Type.STRING },
                pagesSponsorisees: { type: Type.STRING },
                references: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
                'title',
                'patientSituation',
                'circonstancesConseil',
                'pathologiesConcernees',
                'argumentationInteret',
                'beneficesSante',
                'exemplesArticles',
                'reponsesObjections',
                'pagesSponsorisees',
                'references',
            ],
        };
    }
    else if (memoFicheType === 'micronutrition') {
        jsonStructure = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Titre de la mémofiche, par exemple 'Mémofiche Micronutrition : L'Arthrose au Comptoir'" },
                shortDescription: { type: Type.STRING, description: "Courte introduction ou description de la mémofiche." },
                theme: { type: Type.STRING, description: "Thème principal, par exemple 'Micronutrition'" },
                system: { type: Type.STRING, description: "Système ou organe concerné, par exemple 'Articulations'" },
                customSections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Titre de la section (ex: '1. Initier le Conseil : Le Déclic au Comptoir')" },
                            content: { type: Type.STRING, description: "Contenu détaillé de la section." },
                        },
                        required: ['title', 'content'],
                    },
                    description: "Sections structurées de la mémofiche, incluant l'initiation au conseil, l'explication de la maladie, l'approche conventionnelle, l'approche micronutritionnelle et les conseils complémentaires."
                },
                references: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Références bibliographiques ou sources." },
            },
            required: ['title', 'shortDescription', 'theme', 'system', 'customSections', 'references'],
        };
    }
    const fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, pas de 

). Respectez impérativement la structure suivante.
  `;
    const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: jsonStructure,
        },
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
    });
    const response = result.response;
    let responseText = response.text().trim();
    if (responseText.startsWith('```json')) {
        responseText = responseText.substring(7, responseText.length - 3);
    }
    const generatedData = JSON.parse(responseText);
    console.log("Données générées brutes de Gemini :", JSON.stringify(generatedData, null, 2));
    return generatedData;
};
const learningToolsSchema = {
    type: Type.OBJECT,
    properties: {
        flashcards: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                },
                required: ['question', 'answer'],
            },
            description: "Crée exactement 10 flashcards pertinentes pour aider à mémoriser les points clés de la mémofiche."
        },
        glossary: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                },
                required: ['term', 'definition'],
            },
            description: "Crée un glossaire d'exactement 10 termes techniques importants mentionnés dans la mémofiche."
        },
        quiz: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionType: {
                        type: Type.STRING,
                        description: "Le type de question : QCM (Question à Choix Multiples) ou VRAI_FAUX."
                    },
                    question: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Pour un QCM, 4 options. Pour une question VRAI_FAUX, les options doivent être ['Vrai', 'Faux']."
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                },
                required: ['questionType', 'question', 'options', 'correctAnswerIndex', 'explanation']
            },
            description: "Crée un quiz d'exactement 10 questions : 6 questions à choix multiples (QCM) avec 4 options, et 4 questions de type Vrai/Faux. Fournis une explication pour chaque bonne réponse."
        }
    },
    required: ['flashcards', 'glossary', 'quiz']
};
export const generateLearningTools = async (memoContent) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY)
        throw new Error("La clé API de Gemini n'est pas configurée.");
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const context = `
        Titre: ${memoContent.title}
        Situation: ${memoContent.patientSituation}
        Pathologie: ${memoContent.pathologyOverview}
        Points clés: ${(memoContent.keyPoints ?? []).join(', ')}
        Traitements: ${(memoContent.recommendations?.mainTreatment ?? []).join(', ')}
        Signaux d'alerte: ${(memoContent.redFlags ?? []).join(', ')}
    `;
    const fullPrompt = `À partir du contenu de la mémofiche suivant, génère des outils pédagogiques pour un professionnel de la pharmacie. Réponds en JSON en respectant le schéma détaillé qui demande explicitement 10 flashcards et un quiz de 10 questions (6 QCM et 4 Vrai/Faux). Le contenu de la mémofiche est : "${context}".`;
    const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: learningToolsSchema,
        },
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
    });
    const response = result.response;
    const responseText = response.text();
    return JSON.parse(responseText);
};
export const getChatResponse = async (chatHistory, context, question, title) => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY)
        throw new Error("La clé API de Gemini n'est pas configurée.");
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const system_prompt = `Tu es PharmIA, un assistant IA expert pour les professionnels de la pharmacie.\nTon rôle est de répondre aux questions UNIQUEMENT sur la base du contexte de la mémofiche fournie.\nNe réponds pas aux questions qui sortent de ce contexte. Sois concis et précis.\n\nDans tes réponses, mets en évidence les mots-clés les plus importants en les entourant de doubles astérisques (par exemple, **mot-clé**). Cela les affichera en gras et en couleur.\n\nSi l'utilisateur te dit simplement "Bonjour" ou une salutation similaire, réponds EXACTEMENT :\n"Bonjour! Je suis PharmIA, votre Assistant, Expert pour un conseil de Qualité à l'officine. Ici je peux vous conseiller sur **${title}**."\nNe rajoute rien d'autre à cette réponse de salutation.\n\nPour toutes les autres questions, base tes réponses sur le contexte de la mémofiche.\n`;
    const contents = [
        { role: "user", parts: [{ text: system_prompt }] },
        { role: "model", parts: [{ text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :\n\n**${title}**\n\nComment puis-je vous aider aujourd'hui ?` }] },
        ...chatHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
        { role: "user", parts: [{ text: `CONTEXTE DE LA MEMOFICHE: ${context}\n\nQUESTION: ${question}` }] }
    ];
    const result = await ai.models.generateContent({ model: "gemini-1.5-flash", contents });
    const response = result.response;
    return response.text().trim();
};


