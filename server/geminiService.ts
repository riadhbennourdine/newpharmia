import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content, SchemaType, ObjectSchema, ArraySchema } from "@google/generative-ai";
import { CaseStudy, MemoFicheStatus } from "../types.js";
import fetch from 'node-fetch';

// NOTE: This file has been refactored to use the new '@google/generative-ai' SDK.


const getApiKey = () => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  return API_KEY;
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", safetySettings: [
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
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const system_prompt = `Tu es PharmIA, un assistant IA expert pour les professionnels de la pharmacie.
Ton rôle est de répondre aux questions UNIQUEMENT sur la base du contexte de la mémofiche fournie.
Ne réponds pas aux questions qui sortent de ce contexte. Sois concis et précis.

Dans tes réponses, mets en évidence les mots-clés les plus importants en les entourant de doubles astérisques (par exemple, **mot-clé**). Cela les affichera en gras et en couleur.

Si l'utilisateur te dit simplement "Bonjour" ou une salutation similaire, réponds EXACTEMENT :
"Bonjour! Je suis PharmIA, votre Assistant, Expert pour un conseil de Qualité à l'officine. Ici je peux vous conseiller sur **${title}**."
Ne rajoute rien d'autre à cette réponse de salutation.

Pour toutes les autres questions, base tes réponses sur le contexte de la mémofiche.
`;

    const history: Content[] = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Ensure history starts with a user message if it's not empty
    if (history.length > 0 && history[0].role !== 'user') {
        // Find the first user message and start from there
        const firstUserIndex = history.findIndex(h => h.role === 'user');
        if (firstUserIndex > -1) {
            history.splice(0, firstUserIndex);
        } else {
            // If no user message, the history is invalid for starting a chat
            history.length = 0;
        }
    }
    
    const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

        const result = await chat.sendMessage(`${system_prompt}\n\nCONTEXTE DE LA MEMOFICHE: ${context}\n\nQUESTION: ${question}`);

        const response = result.response;

        return response.text().trim();

    };

    interface ListModelsResponse {
  models: any[];
}

export const listModels = async (): Promise<any[]> => {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json() as ListModelsResponse;
  return data.models;
};