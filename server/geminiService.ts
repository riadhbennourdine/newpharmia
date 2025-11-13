import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Schema, Part, Content, SchemaType } from "@google/generative-ai";
import { CaseStudy, MemoFicheStatus } from "../types.js";

// NOTE: This file has been refactored to use the new '@google/generative-ai' SDK.
// The schemas now use the official SchemaType enum for defining data types.

const getApiKey = () => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  return API_KEY;
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let jsonStructure: Schema = {
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
    },
    required: ['title', 'patientSituation', 'keyQuestions', 'pathologyOverview', 'redFlags', 'mainTreatment', 'associatedProducts', 'lifestyleAdvice', 'dietaryAdvice', 'references'],
  };

  let fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Respectez impérativement la structure suivante. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace.`;

  if (memoFicheType === 'pharmacologie' || memoFicheType === 'savoir') {
    jsonStructure = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
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
      },
      required: ['title', 'shortDescription', 'memoSections'],
    };
  } else if (memoFicheType === 'dispositifs-medicaux') {
    jsonStructure = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        casComptoir: { type: SchemaType.STRING },
        objectifsConseil: { type: SchemaType.STRING },
        pathologiesConcernees: { type: SchemaType.STRING },
        interetDispositif: { type: SchemaType.STRING },
        beneficesSante: { type: SchemaType.STRING },
        dispositifsAConseiller: { type: SchemaType.STRING },
        reponsesObjections: { type: SchemaType.STRING },
        pagesSponsorisees: { type: SchemaType.STRING },
        references: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
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
        references: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ['title', 'ordonnance', 'analyseOrdonnance', 'conseilsTraitement', 'informationsMaladie', 'conseilsHygieneDeVie', 'conseilsAlimentaires', 'ventesAdditionnelles', 'references'],
    };
  } else if (memoFicheType === 'communication') {
    jsonStructure = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        shortDescription: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING },
        patientSituation: { type: SchemaType.STRING },
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