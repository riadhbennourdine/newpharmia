import { GoogleGenAI, Type } from "@google/genai";
import { CaseStudy } from "../types";

// This file uses an older syntax for the Google GenAI SDK that is compatible with the project's dependencies.
// The main class is GoogleGenAI and content is generated via ai.models.generateContent(...)

export const generateCaseStudyDraft = async (prompt: string): Promise<Partial<CaseStudy>> => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide avec la structure suivante :
    {
      "title": "string",
      "patientSituation": "string",
      "keyQuestions": ["string"],
      "pathologyOverview": "string",
      "redFlags": ["string"],
      "recommendations": {
        "mainTreatment": ["string"],
        "associatedProducts": ["string"],
        "lifestyleAdvice": ["string"],
        "dietaryAdvice": ["string"]
      },
      "references": ["string"]
    }
  `;
    
  console.log("Prompt envoyé à Gemini :", fullPrompt);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });
  
  const responseText = response.text.trim();
  const jsonText = responseText.startsWith('```json')
    ? responseText.substring(7, responseText.length - 3)
    : responseText;
  const generatedData = JSON.parse(jsonText);

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
            description: "Crée un glossaire de 3 à 5 termes techniques importants mentionnés dans la mémofiche."
        },
        quiz: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionType: {
                        type: Type.STRING,
                        enum: ['QCM', 'VRAI_FAUX'],
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

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      // The config property seems to be the way to pass the schema in this older version
      config: { responseMimeType: "application/json", responseSchema: learningToolsSchema },
    });
  
    return JSON.parse(response.text.trim());
};

export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const system_prompt = `Tu es PharmIA, un assistant IA expert pour les professionnels de la pharmacie.
Ton rôle est de répondre aux questions UNIQUEMENT sur la base du contexte de la mémofiche fournie.
Ne réponds pas aux questions qui sortent de ce contexte. Sois concis et précis.

Dans tes réponses, mets en évidence les mots-clés les plus importants en les entourant de doubles astérisques (par exemple, **mot-clé**). Cela les affichera en gras et en couleur.

Si l'utilisateur te dit simplement "Bonjour" ou une salutation similaire, réponds EXACTEMENT :
"Bonjour! Je suis PharmIA, votre Assistant, Expert pour un conseil de Qualité à l'officine. Ici je peux vous conseiller sur **${title}**."
Ne rajoute rien d'autre à cette réponse de salutation.

Pour toutes les autres questions, base tes réponses sur le contexte de la mémofiche.`;

    const contents = [
        { role: "user", parts: [{ text: system_prompt }] },
        { role: "model", parts: [{ text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :

**${title}**

Comment puis-je vous aider aujourd'hui ?` }] },
        ...chatHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
        { role: "user", parts: [{ text: `CONTEXTE DE LA MEMOFICHE: ${context}\n\nQUESTION: ${question}` }] }
    ];

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
    });
  
    return response.text.trim();
};