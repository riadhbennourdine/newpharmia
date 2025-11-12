import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Schema, Part, Content } from "@google/generative-ai";
import { CaseStudy, MemoFicheStatus } from "../types.js";

// NOTE: This file has been refactored to use the new '@google/generative-ai' SDK.
// The schemas now use the official JSON Schema format required by the SDK.

const getApiKey = () => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  return API_KEY;
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let jsonStructure: Schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      patientSituation: { type: "string" },
      keyQuestions: { type: "array", items: { type: "string" } },
      pathologyOverview: { type: "string" },
      redFlags: { type: "array", items: { type: "string" } },
      mainTreatment: { type: "array", items: { type: "string" } },
      associatedProducts: { type: "array", items: { type: "string" } },
      lifestyleAdvice: { type: "array", items: { type: "string" } },
      dietaryAdvice: { type: "array", items: { type: "string" } },
      references: { type: "array", items: { type: "string" } },
    },
    required: ['title', 'patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags', 'mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'references'],
  };

  let fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Respectez impérativement la structure suivante. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace.`;

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    jsonStructure = {
      type: "object",
      properties: {
        title: { type: "string" },
        shortDescription: { type: "string" },
        memoSections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ['title', 'content'],
          },
        },
      },
      required: ['title', 'shortDescription', 'memoSections'],
    };
  } else if (memoFicheType === 'dispositifs-medicaux') {
    jsonStructure = {
      type: "object",
      properties: {
        title: { type: "string" },
        casComptoir: { type: "string" },
        objectifsConseil: { type: "string" },
        pathologiesConcernees: { type: "string" },
        interetDispositif: { type: "string" },
        beneficesSante: { type: "string" },
        dispositifsAConseiller: { type: "string" },
        reponsesObjections: { type: "string" },
        pagesSponsorisees: { type: "string" },
        references: { type: "array", items: { type: "string" } },
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
      type: "object",
      properties: {
        title: { type: "string" },
        ordonnance: { type: "array", items: { type: "string" } },
        analyseOrdonnance: { type: "array", items: { type: "string" } },
        conseilsTraitement: {
          type: "array",
          items: {
            type: "object",
            properties: {
              medicament: { type: "string" },
              conseils: { type: "array", items: { type: "string" } },
            },
            required: ['medicament', 'conseils'],
          },
        },
        informationsMaladie: { type: "array", items: { type: "string" } },
        conseilsHygieneDeVie: { type: "array", items: { type: "string" } },
        conseilsAlimentaires: { type: "array", items: { type: "string" } },
        ventesAdditionnelles: {
          type: "object",
          properties: {
            complementsAlimentaires: { type: "array", items: { type: "string" } },
            accessoires: { type: "array", items: { type: "string" } },
            dispositifs: { type: "array", items: { type: "string" } },
            cosmetiques: { type: "array", items: { type: "string" } },
          },
        },
        references: { type: "array", items: { type: "string" } },
      },
      required: ['title', 'ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles', 'references'],
    };
  } else if (memoFicheType === 'communication') {
    jsonStructure = {
      type: "object",
      properties: {
        title: { type: "string" },
        shortDescription: { type: "string" },
        summary: { type: "string" },
        patientSituation: { type: "string" },
        customSections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ['title', 'content'],
          },
        },
      },
      required: ['title', 'shortDescription', 'summary', 'patientSituation', 'customSections'],
    };
  }

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    const expertRole = memoFicheType === 'pharmacologie' ? 'pharmacologie et ingénieur pédagogique' : 'connaissances pharmaceutiques';
    fullPrompt = `En tant qu\\'expert en ${expertRole} pour les professionnels de la pharmacie, votre mission est de transformer le texte brut suivant en une mémofiche de type '${memoFicheType}' claire, détaillée et directement utilisable au comptoir.\\n\\n**Objectif :** Extraire et structurer l\\'information clé du texte source pour créer un outil de référence rapide et fiable. Il est impératif de conserver la profondeur et la précision scientifique du texte original.\\n\\n**Structure de la mémofiche :**\\n\\n1.  **Titre :** Un titre précis et informatif (ex: "Les inhibiteurs de la pompe à protons (IPP)").\\n2.  **Courte description :** Un résumé de 2-3 phrases qui présente la classe thérapeutique ou le principe actif et son importance.\\n3.  **Sections (memoSections) :** Plusieurs sections thématiques qui décomposent le sujet de manière logique.\\n\\n**Instructions détaillées pour les \`memoSections\` :**\\n\\n*   **Titres de section :** Les titres doivent être clairs et correspondre aux grandes catégories de la pharmacologie. Exemples de titres de section à utiliser si pertinent :\\n    *   Mécanisme d\\'action\\n    *   Indications principales\\n    *   Posologie et mode d\\'administration\\n    *   Effets indésirables et gestion\\n    *   Contre-indications et précautions d\\'emploi\\n    *   Interactions médicamenteuses\\n    *   Conseils aux patients\\n    *   Molécules de la classe\\n\\n*   **Contenu des sections :**\\n    *   **Fidélité et détail :** Le contenu doit être une synthèse fidèle et détaillée du texte source. **Ne pas simplifier à l\\'extrême.** Conserver la terminologie médicale et pharmaceutique précise.\\n    *   **Formatage :** Le contenu de chaque section doit être une liste à puces. Chaque point doit commencer par le caractère "•" suivi d\\'un espace.\\n    *   **Mise en évidence :** Chaque point de la liste doit commencer par un mot-clé ou un concept clé mis en évidence en gras (entouré de doubles astérisques). Exemple : "**Effet principal** : Diminution de la sécrétion ...`;
  } else if (memoFicheType === 'dispositifs-medicaux') {
    fullPrompt = `En tant qu'expert en dispositifs médicaux pour la pharmacie, analyse le texte suivant et génère une mémofiche de type 'dispositifs-medicaux'. La mémofiche doit inclure un titre pertinent et remplir les sections suivantes avec un contenu détaillé, professionnel et pertinent pour un pharmacien : casComptoir, objectifsConseil, pathologiesConcernees, interetDispositif, beneficesSante, dispositifsAConseiller, reponsesObjections, pagesSponsorisees. Le contenu de chaque section doit être un texte unique et bien structuré. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace. Le texte à analyser est :

${prompt}`;
  } else if (memoFicheType === 'communication') {
    fullPrompt = `En tant qu'expert en communication pharmaceutique, analyse le texte suivant et génère une mémofiche de type 'communication'. La mémofiche doit inclure un titre pertinent, une courte description, un résumé d'introduction, une section 'cas comptoir' (patientSituation) et plusieurs sections personnalisées (customSections) qui décomposent le sujet de manière logique et facile à comprendre pour un professionnel de la pharmacie. Le contenu de chaque section doit être détaillé, professionnel et rédigé dans un style clair et concis. Chaque section doit avoir un titre et un contenu. Le contenu de chaque section doit être une liste à puces. Chaque point de la liste doit commencer par un point (•) suivi d'un espace, et être sur une nouvelle ligne (en utilisant '\\n'). Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**). Le texte à analyser est :

${prompt}`;
  }
    
  console.log("memoFicheType:", memoFicheType);
  console.log("jsonStructure:", JSON.stringify(jsonStructure, null, 2));
  console.log("Prompt envoyé à Gemini :", fullPrompt);

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
  console.log("Données générées brutes de Gemini :", JSON.stringify(generatedData, null, 2));

  return { ...generatedData, status: MemoFicheStatus.DRAFT };
};

const learningToolsSchema: Schema = {
    type: "object",
    properties: {
        flashcards: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                },
                required: ['question', 'answer'],
            },
            description: "Crée exactement 10 flashcards pertinentes pour aider à mémoriser les points clés de la mémofiche."
        },
        glossary: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    term: { type: "string" },
                    definition: { type: "string" },
                },
                required: ['term', 'definition'],
            },
            description: "Crée un glossaire d'exactement 10 termes techniques importants mentionnés dans la mémofiche."
        },
        quiz: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    questionType: {
                        type: "string",
                        enum: ['QCM', 'VRAI_FAUX'],
                        description: "Le type de question : QCM (Question à Choix Multiples) ou VRAI_FAUX."
                    },
                    question: { type: "string" },
                    options: {
                        type: "array", 
                        items: { type: "string" },
                        description: "Pour un QCM, 4 options. Pour une question VRAI_FAUX, les options doivent être ['Vrai', 'Faux']."
                    },
                    correctAnswerIndex: { type: "integer" },
                    explanation: { type: "string" }
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = `
        Titre: ${memoContent.title}
        Situation: ${memoContent.patientSituation}
        Pathologie: ${memoContent.pathologyOverview}
        Points clés: ${(memoContent.keyPoints ?? []).join(', ')}
        Traitements: ${(memoContent.mainTreatment ?? []).join(', ')}
        Signaux d'alerte: ${(memoContent.redFlags ?? []).join(', ')}
    `;

    const fullPrompt = `À partir du contenu de la mémofiche suivant, génère des outils pédagogiques pour un professionnel de la pharmacie. Réponds en JSON en respectant le schéma détaillé qui demande explicitement 10 flashcards et un quiz de 10 questions (6 QCM et 4 Vrai/Faux). Le contenu de la mémofiche est : "${context}".`;

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const system_prompt = `Tu es PharmIA, un assistant IA expert pour les professionnels de la pharmacie.
Ton rôle est de répondre aux questions UNIQUEMENT sur la base du contexte de la mémofiche fournie.
Ne réponds pas aux questions qui sortent de ce contexte. Sois concis et précis.

Dans tes réponses, mets en évidence les mots-clés les plus importants en les entourant de doubles astérisques (par exemple, **mot-clé**). Cela les affichera en gras et en couleur.

Si l'utilisateur te dit simplement "Bonjour" ou une salutation similaire, réponds EXACTEMENT :
"Bonjour! Je suis PharmIA, votre Assistant, Expert pour un conseil de Qualité à l'officine. Ici je peux vous conseiller sur **${title}**."
Ne rajoute rien d'autre à cette réponse de salutation.

Pour toutes les autres questions, base tes réponses sur le contexte de la mémofiche.`;

    const history: Content[] = [
        { role: "user", parts: [{ text: system_prompt }] },
        { role: "model", parts: [{ text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :

**${title}**

Comment puis-je vous aider aujourd'hui ?` }] },
        ...chatHistory.map(msg => ({ 
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: [{ text: msg.text }] 
        })),
    ];

    const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

    const result = await chat.sendMessage(`CONTEXTE DE LA MEMOFICHE: ${context}\\n\\nQUESTION: ${question}`);
    const response = result.response;
    return response.text().trim();
};
