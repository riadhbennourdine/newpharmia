import { GoogleGenAI, Type } from "@google/genai";
import { CaseStudy } from "../types.js";

// This file uses an older syntax for the Google GenAI SDK that is compatible with the project's dependencies.
// The main class is GoogleGenAI and content is generated via ai.models.generateContent(...)

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let jsonStructure: any = {
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
  } else if (memoFicheType === 'dispositifs-medicaux') {
    jsonStructure = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        casComptoir: { type: Type.STRING },
        objectifsConseil: { type: Type.STRING },
        pathologiesConcernees: { type: Type.STRING },
        interetDispositif: { type: Type.STRING },
        beneficesSante: { type: Type.STRING },
        dispositifsAConseiller: { type: Type.STRING },
        reponsesObjections: { type: Type.STRING },
        pagesSponsorisees: { type: Type.STRING },
        references: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'title',
        'casComptoir',
        'objectifsConseil',
        'pathologiesConcernees',
        'interetDispositif',
        'beneficesSante',
        'dispositifsAConseiller',
        'reponsesObjections',
        'pagesSponsorisees',
        'references',
      ],
    };
  }

  const fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, pas de \`\`\`json). Respectez impérativement la structure suivante.`;
    
  console.log("Prompt envoyé à Gemini :", fullPrompt);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    config: { responseMimeType: "application/json", responseSchema: jsonStructure },
  });
  
  const responseText = response.text.trim();
  const jsonText = responseText.startsWith('```json')
    ? responseText.substring(7, responseText.length - 3)
    : responseText;
  const generatedData = JSON.parse(jsonText);
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