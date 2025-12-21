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

// --- Case Study Generation ---
export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const apiKey = getApiKey();
  const modelName = await getValidModel(apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return { ...JSON.parse(result.response.text()), status: MemoFicheStatus.DRAFT };
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
    const apiKey = getApiKey();
    const modelName = await getValidModel(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(`Génère des outils pédagogiques JSON pour: ${memoContent.title}`);
    return JSON.parse(result.response.text());
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
                // Ensure we have a valid model name first
                const modelName = await getValidModel(key);
                
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const coachPrompt = `Tu es "Coach PharmIA", un mentor expert en pharmacie.
TON : Professionnel, fluide, pédagogique mais pas scolaire.

MISSION : Accompagner l'apprenant dans une simulation de comptoir. 
Le dialogue se déroule EXCLUSIVEMENT entre TOI (le Coach) et l'APPRENANT.

RÈGLES :
1. **Ne joue PAS le rôle du patient**. Le patient n'intervient pas directement dans le chat.
2. **Décris les faits** : Si l'apprenant pose une question au patient ou effectue une action, réponds en tant que Coach en décrivant la réaction du patient ou les informations qu'il donne. 
   Exemple : "Le patient vous répond qu'il a des douleurs depuis hier..." ou "Vous remarquez que le patient semble inquiet."
3. **Guide la démarche** : Utilise la méthode P.H.A.R.M.A. Guide l'apprenant à travers les étapes (1.Interrogatoire -> 2.Pathologie -> 3.Traitement -> 4.Conseils).
4. **Subtilité** : Si l'apprenant oublie un point important, suggère-le avec bienveillance (ex: "N'oubliez pas de vérifier si le patient a d'autres traitements en cours").
5. **Avance** : Pose toujours une question pour l'étape suivante ou demande à l'apprenant ce qu'il décide de faire.

FIN : Quand la simulation est complète et que tous les conseils ont été donnés, dis : "Simulation terminée ! Cliquez sur 'Terminer & Évaluer' pour voir votre bilan."

TEXTE BRUT.
Sujet de la simulation : ${context || "Attente du sujet"}
Dernier message de l'apprenant : ${userMessage}`;

                const safeHistory = chatHistory.slice(-10).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
                const chat = model.startChat({ history: safeHistory });
                const result = await chat.sendMessage(coachPrompt);
                return result.response.text().trim();
            } catch (error: any) {
                // Force reset model cache if 404 occurs to re-discover valid model
                if (error.message?.includes('404')) cachedValidModel = null;
                
                if (error.message?.includes('429')) keyManager.markKeyAsExhausted(key);
                attempts++;
                
                if (attempts >= 5) {
                    const errorMsg = error.message?.includes('404') 
                        ? `Erreur technique : Aucun modèle IA compatible trouvé (404). Vérifiez l'accès API.`
                        : `Échec critique Google API : ${error.message}`;
                    throw new Error(errorMsg);
                }
                
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
    const key = getApiKey();
    const modelName = await getValidModel(key);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
    const prompt = `Expert évaluateur. Sujet: ${topic}. Histoire: ${JSON.stringify(chatHistory.slice(-15))}. Donne score(0-100), feedback court, 3 mots-clés en JSON {score, feedback, searchKeywords}.`;
    try {
        const result = await model.generateContent(prompt);
        return { ...JSON.parse(result.response.text()), recommendedFiches: [] };
    } catch (error) { return { score: 0, feedback: "Évaluation indisponible.", recommendedFiches: [] }; }
};

export const listModels = async (): Promise<any[]> => { return [{ name: "auto-discovered" }]; };