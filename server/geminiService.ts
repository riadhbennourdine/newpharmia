import { GoogleGenAI, Type } from "@google/genai";
import { CaseStudy, MemoFicheStatus } from "../types.js";

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
      mainTreatment: { type: Type.ARRAY, items: { type: Type.STRING } },
      associatedProducts: { type: Type.ARRAY, items: { type: Type.STRING } },
      lifestyleAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
      dietaryAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
      references: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['title', 'patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags', 'mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'references'],
  };

  let fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, pas de 
```json
). Respectez impérativement la structure suivante. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace.`;

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    jsonStructure = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        shortDescription: { type: Type.STRING },
        memoSections: {
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
      required: ['title', 'shortDescription', 'memoSections'],
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
  } else if (memoFicheType === 'ordonnances') {
    jsonStructure = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        ordonnance: { type: Type.ARRAY, items: { type: Type.STRING } },
        analyseOrdonnance: { type: Type.ARRAY, items: { type: Type.STRING } },
        conseilsTraitement: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              medicament: { type: Type.STRING },
              conseils: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['medicament', 'conseils'],
          },
        },
        informationsMaladie: { type: Type.ARRAY, items: { type: Type.STRING } },
        conseilsHygieneDeVie: { type: Type.ARRAY, items: { type: Type.STRING } },
        conseilsAlimentaires: { type: Type.ARRAY, items: { type: Type.STRING } },
        ventesAdditionnelles: {
          type: Type.OBJECT,
          properties: {
            complementsAlimentaires: { type: Type.ARRAY, items: { type: Type.STRING } },
            accessoires: { type: Type.ARRAY, items: { type: Type.STRING } },
            dispositifs: { type: Type.ARRAY, items: { type: Type.STRING } },
            cosmetiques: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        references: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles', 'references'],
    };
  } else if (memoFicheType === 'communication') {
    jsonStructure = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        shortDescription: { type: Type.STRING },
        summary: { type: Type.STRING },
        patientSituation: { type: Type.STRING },
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
      required: ['title', 'shortDescription', 'summary', 'patientSituation', 'customSections'],
    };
  }

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    const expertRole = memoFicheType === 'pharmacologie' ? 'pharmacologie' : 'connaissances pharmaceutiques';
    fullPrompt = `En tant qu'expert en ${expertRole}, votre tâche est de transformer le texte brut suivant en une mémofiche structurée de type '${memoFicheType}'. L'objectif est de conserver toute la richesse et le détail du texte original tout en l'organisant de manière claire et logique pour un professionnel de la pharmacie.

La mémofiche doit inclure :
1.  Un **titre** pertinent qui résume le sujet.
2.  Une **courte description** qui introduit le thème.
3.  Plusieurs **sections (memoSections)** qui décomposent le sujet.

Instructions pour les memoSections:
-   **Fidélité au texte source :** Le contenu de chaque section doit refléter fidèlement les informations, le niveau de détail et la terminologie du texte original. Ne simplifiez pas excessivement l'information.
-   **Structure et clarté :** Chaque section doit avoir un titre et un contenu. Le contenu doit être structuré sous forme de liste à puces pour une meilleure lisibilité.
-   **Formatage :** Chaque point de la liste doit commencer par un point (•) suivi d'un espace, et être sur une nouvelle ligne (en utilisant '\n'). Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).

Le texte à analyser est :

${prompt}`;
  } else if (memoFicheType === 'dispositifs-medicaux') {
    fullPrompt = `En tant qu'expert en dispositifs médicaux pour la pharmacie, analyse le texte suivant et génère une mémofiche de type 'dispositifs-medicaux'. La mémofiche doit inclure un titre pertinent et remplir les sections suivantes avec un contenu détaillé, professionnel et pertinent pour un pharmacien : casComptoir, objectifsConseil, pathologiesConcernees, interetDispositif, beneficesSante, dispositifsAConseiller, reponsesObjections, pagesSponsorisees. Le contenu de chaque section doit être un texte unique et bien structuré. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace. Le texte à analyser est :

${prompt}`;
  } else if (memoFicheType === 'communication') {
    fullPrompt = `En tant qu'expert en communication pharmaceutique, analyse le texte suivant et génère une mémofiche de type 'communication'. La mémofiche doit inclure un titre pertinent, une courte description, un résumé d'introduction, une section 'cas comptoir' (patientSituation) et plusieurs sections personnalisées (customSections) qui décomposent le sujet de manière logique et facile à comprendre pour un professionnel de la pharmacie. Le contenu de chaque section doit être détaillé, professionnel et rédigé dans un style clair et concis. Chaque section doit avoir un titre et un contenu. Le contenu de chaque section doit être une liste à puces. Chaque point de la liste doit commencer par un point (•) suivi d'un espace, et être sur une nouvelle ligne (en utilisant '\n'). Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**). Le texte à analyser est :

${prompt}`;
  }
    
  console.log("memoFicheType:", memoFicheType);
  console.log("jsonStructure:", JSON.stringify(jsonStructure, null, 2));
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

  return { ...generatedData, status: MemoFicheStatus.DRAFT };
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
                        description: "Pour un QCM, 4 options. Pour une question VRAI_FAUX, les options doivent être [\'Vrai\', \'Faux\']."
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
        Traitements: ${(memoContent.mainTreatment ?? []).join(', ')}
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
        { role: "user", parts: [{ text: `CONTEXTE DE LA MEMOFICHE: ${context}

QUESTION: ${question}` }] }
    ];

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
    });
  
    return response.text.trim();
};
