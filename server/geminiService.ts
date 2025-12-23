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
    return executeGeminiCall(async (model) => {
        const result = await model.generateContent(prompt);
        const cleanText = cleanJson(result.response.text());
        try {
            return { ...JSON.parse(cleanText), status: MemoFicheStatus.DRAFT };
        } catch (error) {
            console.error("JSON Parsing Failed for Case Study Draft.");
            console.error("Text Length:", cleanText.length);
            throw error;
        }
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

    const prompt = `Based on the following memo fiche content, generate educational tools in JSON format.
    
    Content:
    ${context}

    Output Requirements:
    1. "flashcards": Array of objects with "question" and "answer". Max 10 cards. Focus on key knowledge.
    2. "quiz": Array of objects (max 5 questions) with:
       - "question" (string)
       - "options" (array of 4 strings)
       - "correctAnswerIndex" (number, 0-3)
       - "explanation" (string, explaining why the answer is correct)
    3. "glossary": Array of objects with "term" and "definition" for difficult medical terms found in the content.

    Ensure the output is valid JSON. Language: French.`;

    return executeGeminiCall(async (model) => {
        const result = await model.generateContent(prompt);
        const cleanText = cleanJson(result.response.text());
        return JSON.parse(cleanText);
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
                // Ensure we have a valid model name first
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
                
                // Gemini API restriction: History must start with a 'user' role.
                // If the first message is 'model' (our initial greeting), prepend a synthetic user prompt.
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
        const cleanText = cleanJson(result.response.text());
        return { ...JSON.parse(cleanText), recommendedFiches: [] };
    } catch (error) { return { score: 0, feedback: "Évaluation indisponible.", recommendedFiches: [] }; }
};

export const listModels = async (): Promise<any[]> => { return [{ name: "auto-discovered" }]; };