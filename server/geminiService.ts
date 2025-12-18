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
    
    // Priority list: Flash 2.5/2.0 (Fast & Cheap) > Pro 2.5 (Smart) > Flash Latest
    const candidates = [
      'models/gemini-2.5-flash',
      'models/gemini-2.0-flash',
      'models/gemini-2.5-pro',
      'models/gemini-3-flash-preview',
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
    console.warn('[Gemini] Could not auto-select model, falling back to gemini-2.5-flash');
    return 'gemini-2.5-flash';

  } catch (error) {
    console.error('[Gemini] Error auto-selecting model:', error);
    return 'gemini-2.5-flash';
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
        finalPrompt = `Tu es PharmIA, l'assistant intelligent expert pour les professionnels de la pharmacie. Ta mission est de fournir des réponses précises, structurées et professionnelles.

INSTRUCTIONS:
1. Réponds chaleureusement aux salutations et aux messages de courtoisie.
2. Utilise prioritairement la base de connaissances complète fournie dans le cache pour répondre aux questions techniques.
3. Si une information spécifique est fournie dans le CONTEXTE SUPPLÉMENTAIRE ci-dessous, utilise-la pour enrichir ta réponse (elle correspond à la page que l'utilisateur consulte).
4. Ne mentionne jamais explicitement "le cache", "le contexte" ou "les fiches". Agis comme un expert omniscient.
5. Si une question technique ne trouve vraiment aucune réponse dans tes connaissances, indique-le avec tact et suggère de consulter une source officielle.
6. Utilise un formatage Markdown clair (titres, listes à puces).

CONTEXTE SUPPLÉMENTAIRE (Page courante):
---
${context || "Aucun contexte spécifique supplémentaire."} 
---

QUESTION: ${question}`;

    } else {
        // Without cache: Legacy behavior (RAG or context injection)
        finalPrompt = `Tu es PharmIA, un assistant expert pour les professionnels de la pharmacie. Ta mission est de répondre de manière claire, concise et structurée.

INSTRUCTIONS:
1. Réponds de manière polie aux salutations (Bonjour, etc.).
2. Pour les questions techniques ou médicales, base ta réponse **prioritairement** sur les informations fournies dans le CONTEXTE ci-dessous.
3. Si les informations ne sont pas du tout dans le contexte pour une question technique, indique-le poliment mais essaie d'apporter une réponse générale basée sur tes connaissances d'expert si approprié, tout en précisant que cela ne remplace pas une fiche officielle.
4. Structure ta réponse avec des titres et des listes à puces.
5. Ne mentionne pas explicitement "le contexte fourni" ou "les fiches".

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
