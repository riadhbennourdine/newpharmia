import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content, SchemaType, ObjectSchema, ArraySchema } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager, FileState } from "@google/generative-ai/server";
import { CaseStudy, MemoFicheStatus } from "../types.js";
import fetch from 'node-fetch';

// --- Rate Limiting Queue ---
class GeminiQueue {
    private queue: (() => Promise<void>)[] = [];
    private processing = false;
    private lastRequestTime = 0;
    private minDelay = 1000;

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            this.process();
        });
    }

    private async process() {
        if (this.processing) return;
        this.processing = true;
        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLast = now - this.lastRequestTime;
            if (timeSinceLast < this.minDelay) await new Promise(r => setTimeout(r, this.minDelay - timeSinceLast));
            const task = this.queue.shift();
            if (task) {
                try { await task(); } catch (e) {}
                this.lastRequestTime = Date.now();
            }
        }
        this.processing = false;
    }
}

const globalQueue = new GeminiQueue();

// --- API Key Manager ---
class KeyManager {
    private keys: string[] = [];
    private currentIndex = 0;
    private exhaustedKeys: Map<string, number> = new Map();

    constructor() {
        if (process.env.GEMINI_API_KEY) this.keys.push(process.env.GEMINI_API_KEY);
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`];
            if (key) this.keys.push(key);
        }
    }

    getNextKey(): string {
        const now = Date.now();
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            const readyAt = this.exhaustedKeys.get(key);
            if (!readyAt || now > readyAt) return key;
        }
        return this.keys[0]; // Fallback to first key
    }

    markKeyAsExhausted(key: string) {
        this.exhaustedKeys.set(key, Date.now() + 60000);
    }
}

const keyManager = new KeyManager();
const getApiKey = () => keyManager.getNextKey();

// --- Dynamic Model Discovery ---
let cachedValidModel: string | null = null;

const getValidModel = async (apiKey: string): Promise<string> => {
    if (cachedValidModel) return cachedValidModel;

    try {
        console.log("[Gemini] Discovering available models...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { models: { name: string, supportedGenerationMethods: string[] }[] };
        
        // Find ANY model that supports 'generateContent'
        const validModel = data.models.find(m => 
            m.supportedGenerationMethods.includes("generateContent") &&
            (m.name.includes("flash") || m.name.includes("pro"))
        );

        if (validModel) {
            // Remove 'models/' prefix if present
            const cleanName = validModel.name.replace('models/', '');
            console.log(`[Gemini] Found valid model: ${cleanName}`);
            cachedValidModel = cleanName;
            return cleanName;
        }

        throw new Error("No compatible Gemini model found for this API key.");
    } catch (error) {
        console.error("[Gemini] Model discovery failed:", error);
        // Fallback to absolute safe default
        return "gemini-1.5-flash"; 
    }
};

// Helper to clean JSON string
const cleanJson = (text: string): string => {
    let clean = text.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith('```json')) {
        clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
        clean = clean.substring(3);
    }
    if (clean.endsWith('```')) {
        clean = clean.substring(0, clean.length - 3);
    }
    return clean.trim();
};

// Helper for executing Gemini calls with retry logic
const executeGeminiCall = async <T>(task: (model: any) => Promise<T>): Promise<T> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        const maxAttempts = 5;
        let lastError: any;

        while (attempts < maxAttempts) {
            const key = getApiKey();
            try {
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                });
                
                return await task(model);
            } catch (error: any) {
                lastError = error;
                console.warn(`[Gemini] Attempt ${attempts + 1} failed: ${error.message}`);

                // Handle specific error codes
                if (error.message?.includes('404')) cachedValidModel = null;
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                
                // Check for 503 Service Unavailable (Overloaded)
                if (error.message?.includes('503')) {
                    console.warn(`[Gemini] Model overloaded (503). Waiting longer...`);
                    await new Promise(r => setTimeout(r, 2000 * (attempts + 1))); // Longer backoff for 503
                } else {
                    await new Promise(r => setTimeout(r, 1000 * (attempts + 1))); // Standard exponential backoff
                }

                attempts++;
            }
        }
        
        throw new Error(`Gemini generation failed after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
    });
};

// --- Case Study Generation ---
export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
    const caseStudySchema: ObjectSchema = {
        type: SchemaType.OBJECT,
        properties: {
            title: { type: SchemaType.STRING, description: "Titre clair et professionnel de la mémofiche." },
            shortDescription: { type: SchemaType.STRING, description: "Résumé en une phrase de l'objectif de la fiche." },
            theme: { type: SchemaType.STRING, description: "Thème principal (ex: Antalgiques, Diabète)." },
            system: { type: SchemaType.STRING, description: "Système physiologique concerné (ex: Cardiovasculaire, Digestif)." },
            patientSituation: { type: SchemaType.STRING, description: "Description de la situation typique au comptoir." },
            keyQuestions: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Liste des questions essentielles à poser au patient (P.H.A.R.M.A)."
            },
            pathologyOverview: { type: SchemaType.STRING, description: "Bref rappel physiopathologique simple." },
            redFlags: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Signaux d'alerte nécessitant une redirection médicale immédiate."
            },
            mainTreatment: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Traitement de première intention recommandé."
            },
            associatedProducts: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Produits de conseil associés (compléments, hygiène)."
            },
            lifestyleAdvice: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Conseils d'hygiène de vie essentiels."
            },
            dietaryAdvice: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Conseils alimentaires spécifiques."
            },
            keyPoints: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Points clés à mémoriser (Résumé)."
            },
            references: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Sources ou bases légales."
            },
        },
        required: ['title', 'shortDescription', 'theme', 'system', 'patientSituation', 'keyQuestions', 'redFlags', 'keyPoints'],
    };

    return globalQueue.add(async () => {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            const key = getApiKey();
            try {
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { 
                        responseMimeType: "application/json",
                        responseSchema: caseStudySchema 
                    }
                });
                
                const result = await model.generateContent(prompt);
                const cleanText = result.response.text();
                return { ...JSON.parse(cleanText), status: MemoFicheStatus.DRAFT };
            } catch (error: any) {
                console.warn(`[Gemini] Case Study Draft Attempt ${attempts + 1} failed: ${error.message}`);
                if (error.message?.includes('404')) cachedValidModel = null;
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                attempts++;
                await new Promise(r => setTimeout(r, 1000 * attempts));
            }
        }
        throw new Error("Failed to generate Case Study Draft after multiple attempts.");
    });
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
    // Construct a context string from the memo content
    const context = `
    Titre: ${memoContent.title}
    Sujet/Description: ${memoContent.sourceText || memoContent.shortDescription}
    Situation Patient: ${typeof memoContent.patientSituation === 'string' ? memoContent.patientSituation : ''}
    Questions Clés: ${(memoContent.keyQuestions || []).join('\n')}
    Aperçu Pathologie: ${typeof memoContent.pathologyOverview === 'string' ? memoContent.pathologyOverview : ''}
    Signaux d'alerte: ${(memoContent.redFlags || []).join('\n')}
    Traitement: ${(memoContent.mainTreatment || []).join('\n')}
    Conseils: ${(memoContent.lifestyleAdvice || []).join('\n')}
    `;

    const prompt = `À partir du contenu de la mémofiche suivant, génère des outils pédagogiques. La langue de sortie doit être le français.

    Contenu:
    ${context}
    `;
    
    const learningToolsSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        flashcards: {
          type: SchemaType.ARRAY,
          description: "Liste de 10 flashcards (question/réponse) axées sur les connaissances clés.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question: { type: SchemaType.STRING, description: "La question de la flashcard." },
              answer: { type: SchemaType.STRING, description: "La réponse à la question." },
            },
            required: ['question', 'answer'],
          },
        },
        quiz: {
          type: SchemaType.ARRAY,
          description: "Quiz de 5 questions pour tester la compréhension.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question: { type: SchemaType.STRING, description: "La question du quiz." },
              options: {
                type: SchemaType.ARRAY,
                description: "Un tableau de 4 chaînes de caractères représentant les options de réponse.",
                items: { type: SchemaType.STRING },
              },
              correctAnswerIndex: { type: SchemaType.NUMBER, description: "L'index (0-3) de la bonne réponse dans le tableau d'options." },
              explanation: { type: SchemaType.STRING, description: "Une brève explication de la raison pour laquelle la réponse est correcte." },
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
          },
        },
        glossary: {
          type: SchemaType.ARRAY,
          description: "Un glossaire des termes médicaux difficiles trouvés dans le contenu.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              term: { type: SchemaType.STRING, description: "Le terme médical." },
              definition: { type: SchemaType.STRING, description: "La définition du terme." },
            },
            required: ['term', 'definition'],
          },
        },
      },
      required: ['flashcards', 'quiz', 'glossary'],
    };

    return globalQueue.add(async () => {
        let attempts = 0;
        const maxAttempts = 5;
        let lastError: any;

        while (attempts < maxAttempts) {
            const key = getApiKey();
            try {
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: learningToolsSchema,
                    },
                });

                const result = await model.generateContent(prompt);
                const jsonText = result.response.text();
                if (jsonText) return JSON.parse(jsonText);
                throw new Error("Empty response from Gemini API.");
            } catch (error: any) {
                lastError = error;
                console.warn(`[Gemini] Attempt ${attempts + 1} (generateLearningTools) failed: ${error.message}`);
                if (error.message?.includes('404')) cachedValidModel = null;
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                const delay = error.message?.includes('503') ? 2000 * (attempts + 1) : 1000 * (attempts + 1);
                await new Promise(r => setTimeout(r, delay));
                attempts++;
            }
        }
        throw new Error(`Gemini generation failed for Learning Tools after ${maxAttempts} attempts. Last error: ${lastError?.message}`);
    });
};

// --- Specialized Agent Personas ---
import { searchMemoFiches, extractTextFromMemoFiche } from "./algoliaService.js";
import clientPromise from "./mongo.js";
import { ObjectId } from "mongodb";

export const getCoachResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        while (attempts < 5) {
            const key = getApiKey();
            try {
                // Optimization: Use dynamic model selection
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const coachPrompt = `Tu es "Coach PharmIA", un mentor expert en pharmacie.
TON : Dynamique, bienveillant, et surtout **FLUIDE**.

MISSION :
Tu aides l'apprenant à s'entraîner sur les 4 étapes : Questionnement (PHARMA) -> Maladie -> Traitement -> Conseils.

RÈGLE D'OR : LA FLUIDITÉ AVANT TOUT.
1. **GESTION DES ERREURS (Règle de l'Indice Unique)** :
   - Si l'apprenant oublie une question importante du P.H.A.R.M.A, donne-lui **UN SEUL indice court**.
   - S'il ne trouve pas ou ignore l'indice, **NE BLOQUE PAS**. Considère que c'est une erreur qui sera pénalisée dans l'évaluation finale, et **PASSE IMMÉDIATEMENT À L'ÉTAPE SUIVANTE** (Maladie ou Traitement).
   - Ne pose jamais de questions en boucle.

2. **AVANCÉE RAPIDE** :
   - Une fois le problème identifié, incite l'apprenant à proposer le TRAITEMENT et les CONSEILS.
   - Si l'apprenant propose une solution, valide-la (même si l'interrogatoire était imparfait) et complète si nécessaire.

3. **CLÔTURE** :
   - Si l'apprenant dit "Au revoir" ou "Merci", **ACCEPTE LA FIN IMMÉDIATEMENT**.
   - Dis juste : "Très bien, simulation terminée ! Cliquez sur 'Terminer & Évaluer'."

TEXTE BRUT.
Sujet : ${context || "Général"}
Message de l'apprenant : ${userMessage}`;

                let safeHistory = chatHistory.slice(-10).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                
                if (safeHistory.length > 0 && safeHistory[0].role === 'model') {
                    safeHistory = [
                        { role: 'user', parts: [{ text: `Je souhaite démarrer une simulation de comptoir sur le sujet : ${context}` }] },
                        ...safeHistory
                    ];
                }

                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(coachPrompt);
                return result.response.text().trim();
            } catch (error: any) {
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                attempts++;
                if (attempts >= 5) throw new Error(`Échec critique Google API : ${error.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return "Erreur service.";
    });
};



export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        while (attempts < 5) {
            const key = getApiKey();
            try {
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                const history = chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(`Tu es PharmIA assistant. Réponds en texte brut. Contexte: ${context}. Question: ${question}`);
                return result.response.text().trim();
            } catch (error: any) {
                if (error.message?.includes('404')) cachedValidModel = null;
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                attempts++;
                if (attempts >= 5) throw new Error(`Échec critique Google API : ${error.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return "Erreur service.";
    });
};

let currentCacheName: string | null = null;
export const isCacheReady = () => !!currentCacheName;
export const refreshKnowledgeBaseCache = async (filePath: string) => { return null; };

export const evaluateSimulation = async (chatHistory: {role: string, text: string}[], topic: string): Promise<any> => {
    const evaluationSchema: ObjectSchema = {
        type: SchemaType.OBJECT,
        properties: {
            score: { type: SchemaType.NUMBER, description: "Score de 0 à 100 basé sur la pertinence du conseil." },
            feedback: { type: SchemaType.STRING, description: "Feedback constructif et court pour l'apprenant." },
            searchKeywords: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "3 mots-clés pour recommander des fiches pertinentes."
            }
        },
        required: ['score', 'feedback', 'searchKeywords']
    };

    const key = getApiKey();
    const modelName = await getValidModel(key);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ 
        model: modelName, 
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: evaluationSchema
        } 
    });
    
    const prompt = `Tu es un expert évaluateur en pharmacie. Analyse la simulation suivante sur le sujet : ${topic}.
    Histoire de la conversation : ${JSON.stringify(chatHistory.slice(-15))}.
    Évalue la qualité du questionnement, la justesse du traitement et la pertinence des conseils.`;

    try {
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text();
        return { ...JSON.parse(jsonText), recommendedFiches: [] };
    } catch (error) { 
        console.error("[Gemini] Evaluation failed:", error);
        return { score: 0, feedback: "Évaluation indisponible momentanément.", recommendedFiches: [] }; 
    }
};

export const generateDermoFicheJSON = async (pathologyName: string, rawText: string): Promise<Partial<CaseStudy>> => {
    return globalQueue.add(async () => {
        const key = getApiKey();
        const modelName = await getValidModel(key);
        const genAI = new GoogleGenerativeAI(key);
        
        // Define a strict schema that maps to CaseStudy but enforces Dermo content
        const dermoSchema: ObjectSchema = {
            type: SchemaType.OBJECT,
            properties: {
                title: { type: SchemaType.STRING, description: "Titre: [Nom Pathologie] - DermoGuide" },
                shortDescription: { type: SchemaType.STRING, description: "Définition courte et percutante." },
                theme: { type: SchemaType.STRING, enum: ["Dermatologie"], format: "enum" },
                system: { type: SchemaType.STRING, description: "Groupe DermoGuide (ex: Groupe A - Ça gratte)" },
                patientSituation: { 
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "Toujours 'Cas Comptoir'" },
                        content: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    type: { type: SchemaType.STRING, enum: ["text", "image"], format: "enum" },
                                    value: { type: SchemaType.STRING, description: "Le texte du cas ou un prompt pour l'image" }
                                }
                            }
                        }
                    },
                    required: ["title", "content"]
                },
                keyQuestions: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "Questions PHARMA (Profil, Histoire, Analyse...)" 
                },
                pathologyOverview: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "Toujours 'Analyse Sémiologique'" },
                        content: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    type: { type: SchemaType.STRING, enum: ["text"], format: "enum" },
                                    value: { type: SchemaType.STRING, description: "Détail des lésions élémentaires (Macule, Papule...)" }
                                }
                            }
                        }
                    },
                    required: ["title", "content"]
                },
                redFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                recommendations: {
                    type: SchemaType.OBJECT,
                    properties: {
                        mainTreatment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        associatedProducts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        lifestyleAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        dietaryAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                    },
                    required: ["mainTreatment", "associatedProducts", "lifestyleAdvice"]
                },
                keyPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                references: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["title", "shortDescription", "theme", "system", "patientSituation", "keyQuestions", "pathologyOverview", "redFlags", "recommendations"]
        };

        const model = genAI.getGenerativeModel({ 
            model: modelName, 
            generationConfig: { 
                responseMimeType: "application/json",
                responseSchema: dermoSchema
            } 
        });

        const prompt = `Tu es Expert DermoGuide.
        Génère une mémofiche structurée pour la pathologie : "${pathologyName}".
        
        SOURCE (Si vide, utilise tes connaissances) :
        "${rawText || "N/A"}"

        CONSIGNES SPÉCIFIQUES :
        1. **System** : Choisis le Groupe DermoGuide (A: Ça gratte, B: Boutons Visage, C: Plaques, D: Mains/Pieds).
        2. **PatientSituation** : Crée un scénario réaliste "Cas Comptoir".
           - **IMAGE OBLIGATOIRE** : Ajoute un objet dans le tableau 'content' avec { "type": "image", "value": "Description très précise et visuelle de la lésion pour le photographe (ex: Zoom sur plaque squameuse...)" }.
        3. **KeyQuestions (PHARMA)** : 
           - Structure les questions par P.H.A.R.M.A (Profil, Histoire, Analyse, Récurrence, Médicaments, Alerte).
        4. **PathologyOverview (Analyse)** : 
           - Décris précisément les lésions élémentaires (Macule, Papule, Squame...). C'est le cœur du diagnostic.
        5. **RedFlags** : Signes d'urgence absolue.
        6. **Recommendations** : Protocole Hygiène + Traitement + Soin.

        Langue : Français.`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());
            
            // Post-processing to match the exact CaseStudy interface shape if needed
            return {
                ...data,
                status: MemoFicheStatus.PUBLISHED,
                // Flatten recommendations to match CaseStudy root properties if the schema nested them
                mainTreatment: data.recommendations.mainTreatment,
                associatedProducts: data.recommendations.associatedProducts,
                lifestyleAdvice: data.recommendations.lifestyleAdvice,
                dietaryAdvice: data.recommendations.dietaryAdvice
            };
        } catch (error: any) {
            console.error("[Gemini] Dermo Generation failed:", error);
            throw error;
        }
    });
};

export const getDermoPatientResponse = async (chatHistory: {role: string, text: string}[], fiche: CaseStudy, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        while (attempts < 5) {
            const key = getApiKey();
            try {
                const modelName = await getValidModel(key);
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const patientPrompt = `Tu es un PATIENT qui vient à la pharmacie pour un problème de peau.
TON : Un peu inquiet, utilise des mots simples, ne connais pas le vocabulaire médical de pointe.

TON CAS (Basé sur cette fiche) :
TITRE : ${fiche.title}
ANALYSE : ${JSON.stringify(fiche.pathologyOverview)}
QUESTIONS CLÉS (PHARMA) : ${JSON.stringify(fiche.keyQuestions)}
RED FLAGS : ${JSON.stringify(fiche.redFlags)}

CONSIGNES :
1. RESTE DANS TON RÔLE DE PATIENT. Ne sors JAMAIS du personnage.
2. Ne donne JAMAIS de conseils médicaux ou de diagnostic toi-même.
3. Réponds aux questions du pharmacien en te basant sur les informations de ta fiche.
4. Si le pharmacien te demande de décrire ce qu'il voit (Analyse), utilise des termes de patient : "c'est rouge", "ça gratte beaucoup", "y'a des croûtes", "c'est tout sec", "y'a des petites bulles".
5. Si une information n'est pas explicitement dans la fiche, invente un détail réaliste pour un patient (ex: "je travaille dehors", "j'ai changé de lessive hier").

Message du pharmacien : ${userMessage}`;

                let safeHistory = chatHistory.slice(-10).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                
                if (safeHistory.length > 0 && safeHistory[0].role === 'model') {
                    safeHistory = [
                        { role: 'user', parts: [{ text: `Je suis au comptoir et je reçois un patient.` }] },
                        ...safeHistory
                    ];
                }

                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(patientPrompt);
                return result.response.text().trim();
            } catch (error: any) {
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                attempts++;
                if (attempts >= 5) throw new Error(`Échec critique Google API : ${error.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return "Erreur service simulation.";
    });
};

export const listModels = async (): Promise<any[]> => { return [{ name: "auto-discovered" }]; };