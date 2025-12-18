import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content, SchemaType, ObjectSchema, ArraySchema } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager, FileState } from "@google/generative-ai/server";
import { CaseStudy, MemoFicheStatus } from "../types.js";
import fetch from 'node-fetch';

// NOTE: This file has been refactored to use the new '@google/generative-ai' SDK.


const getApiKey = () => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  return API_KEY;
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

  try {
    const models = await listModels();
    const modelNames = models.map(m => m.name);
    
    // Priority list: Flash Lite (Separate Quota?) > Flash Stable > Flash 2.0
    const candidates = [
      'models/gemini-flash-lite-latest',
      'models/gemini-2.0-flash-lite-preview-02-05',
      'models/gemini-2.0-flash-lite',
      'models/gemini-flash-latest'
    ];

    for (const candidate of candidates) {
        if (modelNames.some(name => name.includes(candidate) || name === candidate)) {
            // Strip 'models/' prefix if the SDK expects just the name (though it handles both)
            cachedBestModel = candidate.replace('models/', '');
            console.log(`[Gemini] Auto-selected model: ${cachedBestModel}`);
            return cachedBestModel;
        }
    }

    // Fallback if listModels fails or returns weird data
    console.warn('[Gemini] Could not auto-select model, falling back to gemini-flash-lite-latest');
    return 'gemini-flash-lite-latest';

  } catch (error) {
    console.error('[Gemini] Error auto-selecting model:', error);
    return 'gemini-flash-lite-latest';
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

        return fullFiches.map(fiche => {
            return `Titre: ${fiche.title}\nContenu: ${extractTextFromMemoFiche(fiche)}\n`;
        }).join('\n---\n');
    } catch (e) {
        console.error("Error getting RAG context:", e);
        return "";
    }
}

export const getCoachResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const bestModel = await getBestModel();
    let modelInput: any = { model: bestModel };
    
    // Fallback RAG if cache is not available (which is the case for Flash Lite free tier)
    let finalContext = context;
    if (!currentCacheName && context) {
        // If we have a topic but no global cache, fetch relevant fiches
        const ragContext = await getRAGContext(context); // context here is the topic (e.g. "Angine")
        if (ragContext) {
            finalContext = `FICHES PERTINENTES TROUVÉES:\n${ragContext}`;
        }
    } else if (currentCacheName) {
        modelInput.cachedContent = currentCacheName;
    }

    const model = genAI.getGenerativeModel(modelInput);
    
    const coachPrompt = `Tu es le "Coach PharmIA", un mentor pédagogique pour pharmaciens et préparateurs.
    
INSTRUCTIONS:
1. Ton but est de TESTER et STIMULER l'apprenant, pas juste de donner la réponse.
2. Si l'utilisateur pose une question de cours, retourne-lui la question : "Qu'en penses-tu d'abord ?" ou propose un quiz.
3. Si l'utilisateur se trompe, corrige-le avec bienveillance et explique pourquoi.
4. Utilise un ton encourageant, dynamique et tutoyant (si approprié).
5. Sois BREF. Pose une seule question à la fois.

CONTEXTE MÉDICAL:
---
${finalContext || "Utilise tes connaissances générales si le contexte est absent."}
---

DERNIER MESSAGE DE L'APPRENANT: ${userMessage}`;

    const history: Content[] = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(coachPrompt);
    return result.response.text().trim();
};

export const getPatientResponse = async (chatHistory: {role: string, text: string}[], context: string, userMessage: string): Promise<string> => {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const bestModel = await getBestModel();
    let modelInput: any = { model: bestModel };
    
    // Fallback RAG logic
    let finalContext = context;
    if (!currentCacheName && context) {
        const ragContext = await getRAGContext(context);
        if (ragContext) {
            finalContext = `CAS CLINIQUE RÉEL (Simule un patient ayant ces symptômes):\n${ragContext}`;
        }
    } else if (currentCacheName) {
        modelInput.cachedContent = currentCacheName;
    }

    const model = genAI.getGenerativeModel(modelInput);

    const patientPrompt = `Tu es un "Patient Simulé" au comptoir d'une pharmacie.
    
INSTRUCTIONS:
1. Tu ne connais RIEN à la médecine. Tu utilises des mots simples, vagues ("j'ai mal au ventre", "ça pique").
2. Tu as un problème correspondant à la pathologie décrite dans le CONTEXTE DU CAS ci-dessous.
3. L'utilisateur (le pharmacien) doit te questionner pour trouver ce que tu as.
4. Si le pharmacien pose une bonne question (Red Flag, traitement actuel), réponds honnêtement en t'inspirant de la fiche.
5. Si le pharmacien te donne un bon conseil, remercie-le et dis que tu vas essayer.
6. Reste dans ton personnage de patient. Ne donne jamais de conseils médicaux.

CONTEXTE DU CAS (C'est ta "maladie", invisible pour le pharmacien):
---
${finalContext || "Choisis une pathologie courante (ex: Rhume, Angine) si aucun contexte n'est fourni."}
---

PHARMACIEN: ${userMessage}`;

    const history: Content[] = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(patientPrompt);
    return result.response.text().trim();
};

export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
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
        finalPrompt = `Tu es PharmIA, l'assistant intelligent expert pour les professionnels de la pharmacie.

INSTRUCTIONS:
1. **SOIS CONCIS ET SYNTHÉTIQUE** : La réponse doit être courte, dense et lisible rapidement sur un chat. Allez droit au but.
2. Utilise des puces (point •) pour structurer l'information.
3. Ne pas abuser des titres (###). Utilise du gras pour mettre en valeur les sections importantes.
4. Réponds chaleureusement aux salutations, mais reste très bref sur les politesses.
5. Si une information spécifique est dans le CONTEXTE SUPPLÉMENTAIRE, utilise-la.
6. Ne mentionne jamais le "cache" ou les "fiches".

CONTEXTE SUPPLÉMENTAIRE (Page courante):
---
${context || "Aucun contexte spécifique supplémentaire."} 
---

QUESTION: ${question}`;

    } else {
        // Without cache: Legacy behavior (RAG or context injection)
        finalPrompt = `Tu es PharmIA, un assistant expert pour les professionnels de la pharmacie.

INSTRUCTIONS:
1. **SOIS CONCIS ET SYNTHÉTIQUE** : La réponse doit être courte, dense et lisible rapidement sur un chat. Allez droit au but.
2. Utilise des puces (point •) pour structurer l'information.
3. Ne pas abuser des titres (###). Utilise du gras pour mettre en valeur les sections importantes.
4. Réponds chaleureusement aux salutations, mais reste très bref.
5. Ne mentionne pas explicitement "le contexte fourni".

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
