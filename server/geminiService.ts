import { vertexAI } from './vertexAI.js';
import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { CaseStudy, MemoFicheStatus } from '../types.js';

const getGenerativeModel = (modelName: string) => {
  return vertexAI.getGenerativeModel({
    model: modelName,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
    },
  });
};

export const generateCaseStudyDraft = async (prompt: string, memoFicheType: string): Promise<Partial<CaseStudy>> => {
  const model = getGenerativeModel('gemini-2.0-flash-001'); // Using a specific version for stability

  let fullPrompt = `
    ${prompt}
    La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Respectez impérativement la structure suivante. Si une section contient une liste, chaque élément de la liste doit commencer par un point (•) suivi d'un espace.`;

  // The schema generation logic remains the same, but it's not directly used by the new SDK in the same way.
  // We will send the prompt and parse the JSON from the text response.

  const request = {
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  };

  const result = await model.generateContent(request);
  const response = result.response;
  
  if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Réponse invalide de l\'API Gemini.');
  }

  const responseText = response.candidates[0].content.parts[0].text.trim();
  
  const jsonText = responseText.startsWith('```json')
    ? responseText.substring(7, responseText.length - 3).trim()
    : responseText;
  
  try {
    const generatedData = JSON.parse(jsonText);
    console.log("Données générées brutes de Gemini :", JSON.stringify(generatedData, null, 2));
    return { ...generatedData, status: MemoFicheStatus.DRAFT };
  } catch (error) {
    console.error("Erreur de parsing JSON:", error);
    console.error("Texte reçu de Gemini:", jsonText);
    throw new Error("La réponse de l'API Gemini n'est pas un JSON valide.");
  }
};

export const generateLearningTools = async (memoContent: Partial<CaseStudy>): Promise<Partial<CaseStudy>> => {
  const model = getGenerativeModel('gemini-2.0-flash-001');

  const context = `
        Titre: ${memoContent.title}
        Situation: ${memoContent.patientSituation}
        Pathologie: ${memoContent.pathologyOverview}
        Traitements: ${(memoContent.mainTreatment ?? []).join(', ')}
        Signaux d'alerte: ${(memoContent.redFlags ?? []).join(', ')}
    `;

  const fullPrompt = `À partir du contenu de la mémofiche suivant, génère des outils pédagogiques pour un professionnel de la pharmacie. La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json). Le contenu de la mémofiche est : "${context}".
  La réponse doit être un objet JSON valide et complet avec les clés "flashcards", "glossary", et "quiz".
  "flashcards" doit être un tableau de 10 objets avec "question" and "answer".
  "glossary" doit être un tableau de 10 objets avec "term" and "definition".
  "quiz" doit être un tableau de 10 questions : 6 QCM avec 4 options et 4 Vrai/Faux. Chaque question doit avoir "questionType", "question", "options", "correctAnswerIndex", et "explanation".
  `;

  const request = {
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  };

  const result = await model.generateContent(request);
  const response = result.response;

  if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Réponse invalide de l\'API Gemini.');
  }

  const jsonText = response.candidates[0].content.parts[0].text.trim();

  const cleanedJsonText = jsonText.startsWith('```json')
    ? jsonText.substring(7, jsonText.length - 3).trim()
    : jsonText;

  try {
    return JSON.parse(cleanedJsonText);
  } catch (error) {
    console.error("Erreur de parsing JSON pour les outils pédagogiques:", error);
    console.error("Texte reçu de Gemini:", jsonText);
    throw new Error("La réponse de l'API Gemini pour les outils pédagogiques n'est pas un JSON valide.");
  }
};

export const getChatResponse = async (chatHistory: {role: string, text: string}[], context: string, question: string, title: string): Promise<string> => {
    const model = getGenerativeModel('gemini-2.0-flash-001');

    const system_prompt = 
`Tu es PharmIA, un assistant IA expert pour les professionnels de la pharmacie.
Ton rôle est de répondre aux questions UNIQUEMENT sur la base du contexte de la mémofiche fournie.
Ne réponds pas aux questions qui sortent de ce contexte. Sois concis et précis.

Dans tes réponses, mets en évidence les mots-clés les plus importants en les entourant de doubles astérisques (par exemple, **mot-clé**). Cela les affichera en gras et en couleur.

Si l'utilisateur te dit simplement "Bonjour" ou une salutation similaire, réponds EXACTEMENT :
"Bonjour! Je suis PharmIA, votre Assistant, Expert pour un conseil de Qualité à l'officine. Ici je peux vous conseiller sur **${title}**."
Ne rajoute rien d'autre à cette réponse de salutation.

Pour toutes les autres questions, base tes réponses sur le contexte de la mémofiche.`;

    const history = [
        { role: "user", parts: [{ text: system_prompt }] },
        { role: "model", parts: [{ text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :

**${title}**

Comment puis-je vous aider aujourd'hui ?` }] },
        ...chatHistory.map(msg => ({ 
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: [{ text: msg.text }] 
        })),
    ];

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(`CONTEXTE DE LA MEMOFICHE: ${context}\\n\\nQUESTION: ${question}`);
    const response = result.response;

    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Réponse invalide de l\'API Gemini.');
    }
    
    return response.candidates[0].content.parts[0].text.trim();
};