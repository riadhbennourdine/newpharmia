import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content, SchemaType, ObjectSchema, ArraySchema } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager, FileState } from "@google/generative-ai/server";
import { CaseStudy, MemoFicheStatus } from "../types.js";
import fetch from 'node-fetch';

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

// --- API Key Manager for Rotation ---
class KeyManager {
    private keys: string[] = [];
    private currentIndex = 0;
    private exhaustedKeys: Map<string, number> = new Map(); // Key -> Timestamp when it will be ready

    constructor() {
        console.log("[KeyManager] Initializing...");
        if (process.env.GEMINI_API_KEY) {
            this.keys.push(process.env.GEMINI_API_KEY);
            console.log(`[KeyManager] Loaded Primary Key: ...${process.env.GEMINI_API_KEY.slice(-4)}`);
        }
        for (let i = 2; i <= 10; i++) {
            const envVarName = `GEMINI_API_KEY_${i}`;
            const key = process.env[envVarName];
            if (key && key.trim() !== "") {
                this.keys.push(key);
                console.log(`[KeyManager] Loaded ${envVarName}: ...${key.slice(-4)}`);
            }
        }
        console.log(`[KeyManager] Total keys available: ${this.keys.length}`);
    }

    getNextKey(): string {
        if (this.keys.length === 0) throw new Error("Aucune clé API Gemini configurée.");
        const now = Date.now();
        let attempts = 0;
        while (attempts < this.keys.length) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            const readyAt = this.exhaustedKeys.get(key);
            if (!readyAt || now > readyAt) return key;
            attempts++;
        }
        return this.keys[this.currentIndex];
    }

    markKeyAsExhausted(key: string) {
        this.exhaustedKeys.set(key, Date.now() + 60000);
        console.warn(`[KeyManager] Key ...${key.slice(-4)} marked as exhausted until ${new Date(Date.now() + 60000).toTimeString().split(' ')[0]}`);
    }
}

const keyManager = new KeyManager();
const getApiKey = () => keyManager.getNextKey();

interface ListModelsResponse { models: any[]; }

export const listModels = async (): Promise<any[]> => {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json() as ListModelsResponse;
  return data.models || [];
};

let cachedBestModel: string | null = null;
const getBestModel = async (): Promise<string> => {
  if (cachedBestModel) return cachedBestModel;
  const candidates = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
  try {
    const models = await listModels();
    const modelNames = models.map(m => m.name.replace('models/', ''));
    for (const candidate of candidates) {
        if (modelNames.includes(candidate)) {
            cachedBestModel = candidate;
            return cachedBestModel;
        }
    }
    return 'gemini-1.5-flash';
  } catch (error) {
    return 'gemini-1.5-flash';
  }
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const apiKey = getApiKey();
  const modelName = await getBestModel();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ]});

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
          properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } },
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
          properties: { medicament: { type: SchemaType.STRING }, conseils: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } },
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
          properties: { title: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } },
          required: ['title', 'content'],
        },
      },
    },
    required: [],
  };

  let fullPrompt = `${prompt}\nLa réponse doit être un objet JSON valide. Structure: ${JSON.stringify(jsonStructure)}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: jsonStructure },
  });
  
  return { ...JSON.parse(result.response.text()), status: MemoFicheStatus.DRAFT };
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
    const apiKey = getApiKey();
    const modelName = await getBestModel();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const context = `Titre: ${memoContent.title}\nSituation: ${memoContent.patientSituation}\nPathologie: ${memoContent.pathologyOverview}`;
    const result = await model.generateContent(`Génère des outils pédagogiques JSON pour: ${context}`);
    return JSON.parse(result.response.text().trim());
};

import { searchMemoFiches, extractTextFromMemoFiche } from "./algoliaService.js";
import clientPromise from "./mongo.js";
import { ObjectId } from "mongodb";

async function getRAGContext(query: string): Promise<string> {
    if (!query) return "";
    try {
        const algoliaResults = await searchMemoFiches(query);
        if (!algoliaResults || algoliaResults.length === 0) return "";
        const ficheObjectIDs = algoliaResults.map((hit: any) => new ObjectId(hit.objectID));
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const fullFiches = await memofichesCollection.find({ _id: { $in: ficheObjectIDs } }).toArray();
        return fullFiches.map(fiche => `Titre: ${fiche.title}\nContenu: ${extractTextFromMemoFiche(fiche).substring(0, 2000)}\n`).join('\n---\n');
    } catch (e) { return ""; }
}

export const getCoachResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        let lastUsedKey = "";
        while (attempts < 5) {
            try {
                lastUsedKey = getApiKey();
                const genAI = new GoogleGenerativeAI(lastUsedKey);
                const bestModel = await getBestModel();
                const model = genAI.getGenerativeModel({ model: bestModel });
                
                const coachPrompt = `Tu es "Coach PharmIA", un mentor expert et direct. 
INTERDICTION : Ne fais pas de phrases d'introduction, de politesse ou de proverbes.
MISSION : Valider l'apprenant en 4 étapes : 1.Interrogatoire(PHARMA) 2.Pathologie 3.Traitement 4.Conseils.

RÉFÉRENCE MÉTHODE P.H.A.R.M.A. (POUR ÉVALUATION) :
- P : Patient (Qui ? Âge, Sexe, État)
- H : Histoire (Début, Évolution)
- A : Analyse (Premiers symptômes, Autres symptômes associés)
- R : Récurrence (Est-ce que ça se répète ?)
- M : Médicaments (Pris, Allergies) & Maladies (Concomitantes)
- A : Antécédents (Personnels, Familiaux)

RÈGLE DE DÉMARRAGE (1er message uniquement) :
Cas comptoir : [Description situation avec prénom Foulen ou Foulena]
Citation patient : "[Le propos du patient]"
Quelle est votre attitude devant ce cas comptoir, quelles questions vous allez lui poser ?

RÈGLES DE SUITE :
- Analyse la réponse selon la méthode P.H.A.R.M.A ci-dessus.
- Cite les manques brièvement (ex: "Tu as oublié la Récurrence").
- Passe IMMÉDIATEMENT à l'étape suivante. Ne boucle jamais.
- Si l'étape 4 est finie, conclus par : "Simulation terminée ! Cliquez sur 'Terminer & Évaluer' pour votre score."

TEXTE BRUT, PAS DE MARKDOWN.
Contexte : ${context}
Message : ${userMessage}`;

                const safeHistory = chatHistory.slice(-6).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(coachPrompt);
                return result.response.text().trim();
            } catch (error: any) {
                console.error(`[Coach] Attempt ${attempts + 1} failed with key ...${lastUsedKey.slice(-4)}:`, error.message);
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(lastUsedKey);
                attempts++;
                if (attempts >= 5) throw new Error(`Saturation API (...${lastUsedKey.slice(-4)}). Réessayez.`);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        return "Erreur service.";
    });
};

export const getPatientResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        let lastUsedKey = "";
        while (attempts < 5) {
            try {
                lastUsedKey = getApiKey();
                const genAI = new GoogleGenerativeAI(lastUsedKey);
                const bestModel = await getBestModel();
                const model = genAI.getGenerativeModel({ model: bestModel });
                const patientPrompt = `Tu es un patient simulé (Foulen ou Foulena). Sois simple et ignorant en médecine. Maladie: ${context}. Msg: ${userMessage}`;
                const safeHistory = chatHistory.slice(-6).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(patientPrompt);
                return result.response.text().trim();
            } catch (error: any) {
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(lastUsedKey);
                attempts++;
                if (attempts >= 5) throw new Error("Service Patient saturé.");
                await new Promise(r => setTimeout(r, 500));
            }
        }
        return "Erreur service.";
    });
};

export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
    return globalQueue.add(async () => {
        let attempts = 0;
        let lastUsedKey = "";
        while (attempts < 5) {
            try {
                lastUsedKey = getApiKey();
                const genAI = new GoogleGenerativeAI(lastUsedKey);
                const bestModel = await getBestModel();
                const model = genAI.getGenerativeModel({ model: bestModel });
                const history = chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(`Tu es PharmIA assistant. Réponds en texte brut. Contexte: ${context}. Question: ${question}`);
                return result.response.text().trim();
            } catch (error: any) {
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(lastUsedKey);
                attempts++;
                if (attempts >= 5) throw new Error("Chat saturé.");
                await new Promise(r => setTimeout(r, 500));
            }
        }
        return "Erreur service.";
    });
};

let currentCacheName: string | null = null;
export const isCacheReady = () => !!currentCacheName;
export const refreshKnowledgeBaseCache = async (filePath: string) => { return null; };

export const evaluateSimulation = async (chatHistory: {role: string, text: string}[], topic: string): Promise<any> => {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const safeHistory = chatHistory.slice(-15);
    const prompt = `Tu es un expert évaluateur. Sujet: ${topic}. Histoire: ${JSON.stringify(safeHistory)}. Donne score (0-100), feedback court, et 3 mots-clés en JSON {score, feedback, searchKeywords}.`;
    try {
        const result = await model.generateContent(prompt);
        const evaluation = JSON.parse(result.response.text());
        return { ...evaluation, recommendedFiches: [] };
    } catch (error) { return { score: 0, feedback: "Évaluation indisponible.", recommendedFiches: [] }; }
};
