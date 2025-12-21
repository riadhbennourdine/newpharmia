import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content, SchemaType, ObjectSchema, ArraySchema } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager, FileState } from "@google/generative-ai/server";
import { CaseStudy, MemoFicheStatus } from "../types.js";
import fetch from 'node-fetch';

// NOTE: This file has been refactored to use the new '@google/generative-ai' SDK.


// --- API Key Manager for Rotation ---
class KeyManager {
    private keys: string[] = [];
    private currentIndex = 0;
    private exhaustedKeys: Map<string, number> = new Map(); // Key -> Timestamp when it will be ready

    constructor() {
        // Load primary key
        if (process.env.GEMINI_API_KEY) this.keys.push(process.env.GEMINI_API_KEY);
        
        // Load additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`];
            if (key) this.keys.push(key);
        }
        
        if (this.keys.length === 0) {
            console.error("CRITICAL: No GEMINI_API_KEY found in environment variables.");
        } else {
            console.log(`[KeyManager] Loaded ${this.keys.length} API keys.`);
        }
    }

    getNextKey(): string {
        if (this.keys.length === 0) throw new Error("Aucune clé API Gemini configurée.");

        const now = Date.now();
        let attempts = 0;

        // Try to find a non-exhausted key
        while (attempts < this.keys.length) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            const readyAt = this.exhaustedKeys.get(key);
            if (!readyAt || now > readyAt) {
                return key;
            }
            attempts++;
        }

        // If all keys are exhausted, return the one that expires soonest (or just the next one and hope)
        console.warn("[KeyManager] All keys are currently marked as exhausted. Using next available.");
        return this.keys[this.currentIndex];
    }

    markKeyAsExhausted(key: string) {
        // Mark key as exhausted for 60 seconds
        this.exhaustedKeys.set(key, Date.now() + 60000);
        console.warn(`[KeyManager] Key ...${key.slice(-4)} marked as exhausted for 60s.`);
    }
}

const keyManager = new KeyManager();

const getApiKey = () => {
  return keyManager.getNextKey();
};

interface ListModelsResponse {
  models: any[];
}

export const listModels = async (): Promise<any[]> => {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json() as ListModelsResponse;
  return data.models || [];
};

// --- Dynamic Model Selection ---
let cachedBestModel: string | null = null;

const getBestModel = async (): Promise<string> => {
  if (cachedBestModel) return cachedBestModel;
  // Hardcode priority for stability on free tier: prefer 2.0 Flash then 1.5 Flash
  const candidates = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  
  try {
    const models = await listModels();
    const modelNames = models.map(m => m.name.replace('models/', ''));
    
    for (const candidate of candidates) {
        if (modelNames.includes(candidate)) {
            cachedBestModel = candidate;
            console.log(`[Gemini] Selected model: ${cachedBestModel}`);
            return cachedBestModel;
        }
    }
    return 'gemini-1.5-flash';
  } catch (error) {
    return 'gemini-1.5-flash';
  }
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const modelName = await getBestModel();
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ], });


  let jsonStructure: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      patientSituation: { type: SchemaType.STRING },
      keyQuestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      pathologyOverview: { type: SchemaType.STRING },
      redFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      mainTreatment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      associatedProducts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      lifestyleAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      dietaryAdvice: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      references: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      shortDescription: { type: SchemaType.STRING },
      memoSections: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            content: { type: SchemaType.STRING },
          },
          required: ['title', 'content'],
        },
      },
      casComptoir: { type: SchemaType.STRING },
      objectifsConseil: { type: SchemaType.STRING },
      pathologiesConcernees: { type: SchemaType.STRING },
      interetDispositif: { type: SchemaType.STRING },
      beneficesSante: { type: SchemaType.STRING },
      exemplesArticles: { type: SchemaType.STRING },
      reponsesObjections: { type: SchemaType.STRING },
      pagesSponsorisees: { type: SchemaType.STRING },
      ordonnance: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      analyseOrdonnance: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      conseilsTraitement: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            medicament: { type: SchemaType.STRING },
            conseils: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['medicament', 'conseils'],
        },
      },
      informationsMaladie: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      conseilsHygieneDeVie: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      conseilsAlimentaires: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      ventesAdditionnelles: {
        type: SchemaType.OBJECT,
        properties: {
          complementsAlimentaires: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          accessoires: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          dispositifs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          cosmetiques: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
      introduction: { type: SchemaType.STRING },
      customSections: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            content: { type: SchemaType.STRING },
          },
          required: ['title', 'content'],
        },
      },
    },
    required: [],
  };

  let fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Respectez impérativement la structure JSON suivante:
    ${JSON.stringify(jsonStructure)}
    Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace.`;

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    jsonStructure.required = ['title', 'shortDescription', 'memoSections'];
  } else if (memoFicheType === 'dispositifs-medicaux') {
    jsonStructure.required = [
      'title',
      'casComptoir',
      'objectifsConseil',
      'pathologiesConcernees',
      'interetDispositif',
      'beneficesSante',
      'exemplesArticles',
      'reponsesObjections',
      'pagesSponsorisees',
      'references',
    ];
  } else if (memoFicheType === 'ordonnances') {
    jsonStructure.required = ['title', 'ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles', 'references'];
  } else if (memoFicheType === 'communication') {
    jsonStructure.required = ['title', 'shortDescription', 'introduction', 'patientSituation', 'customSections'];
    fullPrompt = `En tant qu'expert en communication pharmaceutique, analyse le texte suivant et génère une mémofiche de type 'communication'. La mémofiche doit inclure un titre pertinent, une courte description, un résumé d'introduction, une section 'cas comptoir' (patientSituation) et plusieurs sections personnalisées (customSections) qui décomposent le sujet de manière logique et facile à comprendre pour un professionnel de la pharmacie. Le contenu de chaque section doit être détaillé, professionnel et rédigé dans un style clair et concis. Chaque section doit avoir un titre et un contenu. Le contenu de chaque section doit être une liste à puces. Chaque point de la liste doit commencer par un point (•) suivi d'un espace, et être sur une nouvelle ligne (en utilisant '\n'). Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**). La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Respectez impérativement la structure JSON suivante:
    ${JSON.stringify(jsonStructure)}
    Le texte à analyser est :
${prompt}`;
  } else {
    jsonStructure.required = ['title', 'patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags', 'mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'references'];
  }
    
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jsonStructure,
    },
  });
  
  const response = result.response;
  const responseText = response.text().trim();
  
  const jsonText = responseText.startsWith('```json')
    ? responseText.substring(7, responseText.length - 3)
    : responseText;
  const generatedData = JSON.parse(jsonText);

  return { ...generatedData, status: MemoFicheStatus.DRAFT };
};

const learningToolsSchema: ObjectSchema = {
    type: SchemaType.OBJECT,
    properties: {
        flashcards: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    question: { type: SchemaType.STRING },
                    answer: { type: SchemaType.STRING },
                },
                required: ['question', 'answer'],
            },
            description: "Crée exactement 10 flashcards pertinentes pour aider à mémoriser les points clés de la mémofiche."
        },
        glossary: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    term: { type: SchemaType.STRING },
                    definition: { type: SchemaType.STRING },
                },
                required: ['term', 'definition'],
            },
            description: "Crée un glossaire d'exactement 10 termes techniques importants mentionnés dans la mémofiche."
        },
        quiz: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    questionType: {
                        type: SchemaType.STRING,
                        format: 'enum',
                        enum: ['QCM', 'VRAI_FAUX'],
                        description: "Le type de question : QCM (Question à Choix Multiples) ou VRAI_FAUX."
                    },
                    question: { type: SchemaType.STRING },
                    options: {
                        type: SchemaType.ARRAY, 
                        items: { type: SchemaType.STRING },
                        description: "Pour un QCM, 4 options. Pour une question VRAI_FAUX, les options doivent être ['Vrai', 'Faux']."
                    },
                    correctAnswerIndex: { type: SchemaType.INTEGER },
                    explanation: { type: SchemaType.STRING }
                },
                required: ['questionType', 'question', 'options', 'correctAnswerIndex', 'explanation']
            },
            description: "Crée un quiz d'exactement 10 questions : 6 questions à choix multiples (QCM) avec 4 options, et 4 questions de type Vrai/Faux. Fournis une explication pour chaque bonne réponse."
        }
    },
    required: ['flashcards', 'glossary', 'quiz']
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
    const modelName = await getBestModel();
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ model: modelName });

    const context = `
        Titre: ${memoContent.title}
        Situation: ${memoContent.patientSituation}
        Pathologie: ${memoContent.pathologyOverview}
        Points clés: ${(memoContent.keyPoints ?? []).join(', ')}
        Traitements: ${(memoContent.mainTreatment ?? []).join(', ')}
        Signaux d'alerte: ${(memoContent.redFlags ?? []).join(', ')}
    `;

    const fullPrompt = `À partir du contenu de la mémofiche suivant, génère des outils pédagogiques pour un professionnel de la pharmacie. Réponds en JSON en respectant le schéma JSON suivant :
${JSON.stringify(learningToolsSchema)}
Le contenu de la mémofiche est : "${context}".`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: learningToolsSchema,
      },
    });
    
    const response = result.response;
    return JSON.parse(response.text().trim());
};

// --- Specialized Agent Personas ---

import { searchMemoFiches, extractTextFromMemoFiche } from "./algoliaService.js";
import clientPromise from "./mongo.js";
import { ObjectId } from "mongodb";

async function getRAGContext(query: string): Promise<string> {
    if (!query) return "";
    try {
        const algoliaResults = await searchMemoFiches(query);
        if (!algoliaResults || algoliaResults.length === 0) return "";

        const ficheObjectIDs = algoliaResults.map((hit: any) => new ObjectId(hit.objectID));
        if (ficheObjectIDs.length === 0) return "";

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const fullFiches = await memofichesCollection.find({ _id: { $in: ficheObjectIDs } }).toArray();

        // Limit context size to reduce token usage
        return fullFiches.map(fiche => {
            const content = extractTextFromMemoFiche(fiche);
            return `Titre: ${fiche.title}\nContenu: ${content.substring(0, 3000)}...\n`;
        }).join('\n---\n');
    } catch (e) {
        console.error("Error getting RAG context:", e);
        return "";
    }
}

// --- Rate Limiting Queue ---
class GeminiQueue {
    private queue: (() => Promise<void>)[] = [];
    private processing = false;
    private lastRequestTime = 0;
    private minDelay = 2000; // 2 seconds between requests minimum

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
            
            if (timeSinceLast < this.minDelay) {
                await new Promise(r => setTimeout(r, this.minDelay - timeSinceLast));
            }

            const task = this.queue.shift();
            if (task) {
                try {
                    await task();
                } catch (e) {
                    console.error("Queue task error", e);
                }
                this.lastRequestTime = Date.now();
            }
        }
        this.processing = false;
    }
}

const globalQueue = new GeminiQueue();

// ... (keep generateCaseStudyDraft and other functions)

export const getCoachResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        while (attempts < 3) {
            try {
                console.log(`[Coach] Processing request (Attempt ${attempts + 1})...`);
                const apiKey = getApiKey();
                const genAI = new GoogleGenerativeAI(apiKey);
                const bestModel = await getBestModel();
                
                const model = genAI.getGenerativeModel({ 
                    model: bestModel,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                });

                const coachPrompt = `Tu es "Coach PharmIA", expert officinal.
Objectif: Valider l'apprenant en 4 étapes: 1.Interrogatoire(PHARMA) 2.Pathologie 3.Traitement 4.Conseil.

RÈGLES:
1. DÉBUT: Si 1er message, utilise UNIQUEMENT:
   Cas comptoir : [Situation avec Prénom Arabe]
   Citation patient : "[Citation]"
   Quelle est votre attitude devant ce cas comptoir, quelles questions vous allez lui poser ?
2. SUITE: Evalue la réponse. Si incomplet (selon PHARMA), cite les manques.
3. AVANCE TOUJOURS à l'étape suivante. Ne boucle jamais.
4. Si demande réponse -> Donne la et avance.
5. FORMAT: Texte brut, concis, pas de markdown, pas de bla-bla.

CONTEXTE: ${context || "Officine"}
DERNIER MESSAGE: ${userMessage}`;

                const safeHistory = chatHistory.slice(-6).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }));

                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(coachPrompt);
                
                if (!result.response) throw new Error("Réponse vide de l'API Gemini.");
                
                return result.response.text().trim();

            } catch (error: any) {
                console.error(`[Coach] Attempt ${attempts + 1} failed:`, error);
                attempts++;
                if (attempts >= 3) {
                    const errorMsg = error.message?.includes('429') 
                        ? "Quota API dépassé (Trop de requêtes). Réessayez dans 60 secondes." 
                        : (error.message || "Erreur inconnue de l'IA.");
                    throw new Error(errorMsg);
                }
                await new Promise(resolve => setTimeout(resolve, 1500 * attempts));
            }
        }
        return "Erreur critique du service IA.";
    });
};

export const getPatientResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        try {
            console.log(`[Patient] Starting request for subject: ${context || 'General'}`);
            const genAI = new GoogleGenerativeAI(getApiKey());
            const bestModel = await getBestModel();
            
            const supportsCache = !!bestModel.match(/(1\.5|2\.0|flash-latest|flash-lite-latest)/);
            let modelInput: any = { 
                model: bestModel,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            };
            
            if (supportsCache && currentCacheName) {
                console.log(`[Patient] Using cache: ${currentCacheName}`);
                modelInput.cachedContent = currentCacheName;
            } else if (context) {
                console.log(`[Patient] Using RAG context for: ${context}`);
                const ragContext = await getRAGContext(context);
                if (ragContext) {
                    context = `CAS CLINIQUE RÉEL (Simule un patient ayant ces symptômes):\n${ragContext}`;
                }
            }

            const model = genAI.getGenerativeModel(modelInput);

            const patientPrompt = `Tu es un "Patient Simulé" au comptoir d'une pharmacie.
        
    INSTRUCTIONS:
    1. Tu ne connais RIEN à la médecine. Tu utilises des mots simples, vagues ("j'ai mal au ventre", "ça pique").
    2. Tu as un problème correspondant à la pathologie décrite dans le CONTEXTE DU CAS ci-dessous.
    3. L'utilisateur (le pharmacien) doit te questionner pour trouver ce que tu as.
    4. Si le pharmacien pose une bonne question (Red Flag, traitement actuel), réponds hononêtement en t'inspirant de la fiche.
    5. Si le pharmacien te donne un bon conseil, remercie-le et dis que tu vas essayer.
    6. Reste dans ton personnage de patient. Ne donne jamais de conseils médicaux.

    CONTEXTE DU CAS (C'est ta "maladie", invisible pour le pharmacien):
    ---
    ${context || "Choisis une pathologie courante (ex: Rhume, Angine) si aucun contexte n'est fourni."}
    ---

    PHARMACIEN: ${userMessage}`;

            let validHistory = chatHistory.slice(-6);
            if (validHistory.length > 0 && validHistory[0].role !== 'user') {
                validHistory = validHistory.slice(1);
            }

            const recentHistory = validHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

            console.log(`[Patient] Sending message with ${recentHistory.length} turns of history...`);
            const chat = model.startChat({ history: recentHistory });
            const result = await chat.sendMessage(patientPrompt);
            
            if (!result.response) {
                console.error('[Patient] No response from model.');
                throw new Error("Pas de réponse du modèle.");
            }
            
            const text = result.response.text().trim();
            console.log(`[Patient] Successfully received response (${text.length} chars).`);
            return text;
        } catch (error: any) {
            console.error('[Patient] Error details:', error);
            if (error.message?.includes('429')) {
                cachedBestModel = null;
            }
            throw new Error(error.message || "Erreur lors de la communication avec le patient.");
        }
    });
};
export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
    return globalQueue.add(async () => {
        const genAI = new GoogleGenerativeAI(getApiKey());
        
        const bestModel = await getBestModel();
        // Cache is supported on 1.5, 2.x, 3.x
        const supportsCache = !!bestModel.match(/(1\.5|2\.|3\.)/);
        
        let modelInput: any = { model: bestModel };
        
        if (supportsCache && currentCacheName) {
            console.log(`[Chat] Using cached context: ${currentCacheName} with model ${bestModel}`);
            modelInput.cachedContent = currentCacheName;
        } else if (currentCacheName) {
            console.warn(`[Chat] Cache is available but model ${bestModel} does not support it. Falling back to standard context injection.`);
        }

        const model = genAI.getGenerativeModel(modelInput);

        let finalPrompt = "";

            if (supportsCache && currentCacheName) {
                // With cache: The model knows the content. We just give persona + local context + question.
                finalPrompt = `Tu es PharmIA, l'assistant intelligent, bienveillant et expert dédié aux professionnels de la pharmacie.
        
        INSTRUCTIONS DE PERSONNALITÉ ET DE TON :
        1. **Humain et Conversationnel** : Adopte un ton naturel, fluide et empathique. Évite le style robotique ou trop télégraphique. Tu es un collègue de confiance qui échange avec un autre professionnel.
        2. **Pédagogique et Clair** : Tes réponses doivent être structurées mais rédigées avec des phrases complètes et agréables à lire.
        3. **Engagement** : Montre de l'intérêt pour la demande. N'hésite pas à encourager l'utilisateur ou à proposer une ouverture pertinente à la fin de ta réponse.
        4. **Formatage** : Utilise des puces (•) pour lister les points importants et du gras (**gras**) pour les mots-clés, afin de faciliter la lecture rapide sans perdre en fluidité.
        
        CONSIGNES DE CONTENU :
        1. Utilise le CONTEXTE SUPPLÉMENTAIRE pour fournir une réponse précise et contextualisée.
        2. Réponds chaleureusement aux salutations et aux questions informelles.
        3. Ne mentionne jamais le "cache" ou les mécanismes techniques internes.
        
        CONTEXTE SUPPLÉMENTAIRE (Page courante):
        ---
        ${context || "Aucun contexte spécifique supplémentaire."}
        ---
        
        QUESTION: ${question}`;
        
                } else {
                    // Without cache: Legacy behavior (RAG or context injection)
                    finalPrompt = `Tu es PharmIA, l'assistant intelligent, bienveillant et expert dédié aux professionnels de la pharmacie.
            
            INSTRUCTIONS DE PERSONNALITÉ ET DE TON :
            1. **Humain et Conversationnel** : Adopte un ton naturel, fluide et empathique. Évite le style robotique ou trop télégraphique. Tu es un collègue de confiance.
            2. **Pédagogique et Clair** : Tes réponses doivent être structurées mais rédigées avec des phrases complètes et agréables à lire.
            3. **Engagement** : Montre de l'intérêt pour la demande.
            4. **Formatage** : Utilise des puces (•) pour lister les points importants et du gras (**gras**) pour les mots-clés.
            
            CONSIGNES DE CONTENU :
            1. Base ta réponse sur le CONTEXTE fourni ci-dessous si pertinent.
            2. Si le contexte ne contient pas la réponse, utilise tes connaissances générales en le précisant poliment.
            3. Ne mentionne pas explicitement "le contexte fourni" ou "la base de données".
            
            CONTEXTE:
            ---
            ${context || "Aucune fiche spécifique trouvée pour cette recherche."}
            ---
            
            QUESTION: ${question}`;
                }
        const history: Content[] = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        
        const chat = model.startChat({
            history: history,
            generationConfig: {
            maxOutputTokens: 1500,
            },
        });

        const result = await chat.sendMessage(finalPrompt);
        const response = result.response;
        return response.text().trim();
    });
};
// --- Context Caching Implementation ---

let currentCacheName: string | null = null;

export const isCacheReady = () => !!currentCacheName;

export const refreshKnowledgeBaseCache = async (filePath: string) => {
    // Temporary disable cache creation to avoid 429 errors on free tier models (2.5-flash limit=0)
    console.warn("[Cache] Cache creation disabled to prevent 429 errors on free tier.");
    return null;

  try {
    const bestModel = await getBestModel();
    // Support caching on 1.5, 2.0, 2.5, 3.0+ models
    if (!bestModel.match(/(1\.5|2\.|3\.)/)) {
        console.warn(`[Cache] Skipping cache creation because selected model ${bestModel} might not support caching.`);
        return null;
    }
    
    const apiKey = getApiKey();
    const fileManager = new GoogleAIFileManager(apiKey);
    const cacheManager = new GoogleAICacheManager(apiKey);

    console.log(`[Cache] Uploading file ${filePath} to Gemini...`);
    
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: "text/markdown",
      displayName: "PharmIA Knowledge Base",
    });

    const fileUri = uploadResult.file.uri;
    console.log(`[Cache] File uploaded: ${fileUri}`);

    // Wait for processing to complete
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === FileState.PROCESSING) {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(uploadResult.file.name);
    }
    console.log(`\n[Cache] File processing complete: ${file.state}`);

    if (file.state === FileState.FAILED) {
      throw new Error("File processing failed.");
    }

    console.log(`[Cache] Creating cache...`);
    
    // Create a cache with a 24-hour TTL (matching our Cron job)
    const cacheResult = await cacheManager.create({
        model: 'models/gemini-2.5-flash',
        displayName: 'PharmIA Full Knowledge Base',
        contents: [
            {
                role: 'user',
                parts: [{ fileData: { mimeType: file.mimeType, fileUri: file.uri } }]
            }
        ],
        ttlSeconds: 60 * 60 * 24, // 24 hours
    });

    currentCacheName = cacheResult.name;
    console.log(`[Cache] Cache created successfully: ${currentCacheName}`);
    console.log(`[Cache] Expires at: ${cacheResult.expireTime}`);

    return currentCacheName;

  } catch (error) {
    console.error("[Cache] Error refreshing cache:", error);
    throw error;
  }
};

export const evaluateSimulation = async (chatHistory: {role: string, text: string}[], topic: string): Promise<any> => {
    const genAI = new GoogleGenerativeAI(getApiKey());
    // Using flash model which is faster and cheaper for evaluation
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    // Safety: Limit history to last 15 turns to avoid token overflow
    const safeHistory = chatHistory.length > 15 ? chatHistory.slice(-15) : chatHistory;

    const prompt = `
    Tu es un expert évaluateur en pharmacie. Tu viens d'observer une simulation d'entretien.
    Le sujet était : "${topic}".

    TA MISSION :
    1. Analyser les réponses de l'apprenant.
    2. Attribuer une note sur 100.
    3. Rédiger un feedback constructif.
    4. Suggérer 3 mots-clés pour des lectures.

    FORMAT JSON :
    {
      "score": number,
      "feedback": string,
      "searchKeywords": string[]
    }

    HISTORIQUE (Derniers échanges) :
    ${JSON.stringify(safeHistory)}
    `;

    try {
        const result = await model.generateContent(prompt);
        const evaluation = JSON.parse(result.response.text());

        // Find recommended fiches using Algolia
        let recommendedFiches: any[] = [];
        if (evaluation.searchKeywords && Array.isArray(evaluation.searchKeywords) && evaluation.searchKeywords.length > 0) {
             try {
                 const searchPromises = evaluation.searchKeywords.map((keyword: string) => searchMemoFiches(keyword));
                 const searchResults = await Promise.all(searchPromises);
                 
                 const allHits = searchResults.flat();
                 const seenIds = new Set();
                 recommendedFiches = [];
                 
                 for (const hit of allHits) {
                     if (!seenIds.has(hit.objectID)) {
                         seenIds.add(hit.objectID);
                         recommendedFiches.push({
                             _id: hit.objectID,
                             title: hit.title
                         });
                     }
                     if (recommendedFiches.length >= 3) break;
                 }
             } catch (err) {
                 console.warn("Algolia search failed during evaluation:", err);
             }
        }
        
        return {
            ...evaluation,
            recommendedFiches
        };

    } catch (error) {
        console.error("Error evaluating simulation:", error);
        // Graceful fallback instead of crashing
        return {
            score: 0,
            feedback: "L'évaluation n'a pas pu être générée en raison d'une surcharge momentanée. Continuez à vous entraîner !",
            searchKeywords: [],
            recommendedFiches: []
        };
    }
};