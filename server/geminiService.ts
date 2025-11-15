import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { vertexAI } from './vertexAI.js';
import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { CaseStudy, MemoFicheStatus, Flashcard, GlossaryTerm, QuizQuestion } from '../types.js';

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



export const generateLearningTools = async (memoContent: Partial<CaseStudy>, memoFicheId: string): Promise<Partial<CaseStudy>> => {
  const model = getGenerativeModel('gemini-2.0-flash-001');

  console.log("Contenu de memoContent avant construction du prompt:", JSON.stringify(memoContent, null, 2));

  const client = await clientPromise;
  const db = client.db('pharmia');
  const memoFichesCollection = db.collection<CaseStudy>('memofiches');

  // Try to find the memoFiche in the database
  const existingMemoFiche = await memoFichesCollection.findOne({ _id: new ObjectId(memoFicheId) });

  if (!existingMemoFiche) {
    throw new Error(`MemoFiche with ID ${memoFicheId} not found.`);
  }

  // Check if learning tools are already cached
  if (
    existingMemoFiche.flashcards && existingMemoFiche.flashcards.length > 0 &&
    existingMemoFiche.glossary && existingMemoFiche.glossary.length > 0 &&
    existingMemoFiche.quiz && existingMemoFiche.quiz.length > 0
  ) {
    console.log(`Learning tools for MemoFiche ${memoFicheId} found in cache. Returning cached data.`);
    return existingMemoFiche;
  }

  const fullPrompt = `À partir des informations détaillées de la mémofiche suivante, génère des outils pédagogiques (flashcards, glossaire, quiz) pour un professionnel de la pharmacie. La réponse doit être un objet JSON valide et complet, STRICTEMENT SANS AUCUN TEXTE SUPPLÉMENTAIRE NI MARKDOWN (par exemple, ne pas utiliser de blocs de code markdown json).

  Voici les sections de la mémofiche :
  - **Titre** : ${memoContent.title}
  - **Situation Patient** : ${memoContent.patientSituation}
  - **Aperçu Pathologie** : ${memoContent.pathologyOverview}
  - **Analyse Ordonnance** : ${(memoContent.analyseOrdonnance ?? []).join('; ')}
  - **Conseils Traitement** : ${(memoContent.conseilsTraitement ?? []).map(ct => `${ct.medicament}: ${ct.conseils.join(', ')}`).join('; ')}
  - **Informations Maladie** : ${(memoContent.informationsMaladie ?? []).join('; ')}
  - **Conseils Hygiène de Vie** : ${(memoContent.conseilsHygieneDeVie ?? []).join('; ')}
  - **Conseils Alimentaires** : ${(memoContent.conseilsAlimentaires ?? []).join('; ')}
  - **Ventes Additionnelles** : ${
    Array.isArray(memoContent.ventesAdditionnelles)
      ? (memoContent.ventesAdditionnelles as string[]).join('; ')
      : memoContent.ventesAdditionnelles
        ? `Compléments: ${(memoContent.ventesAdditionnelles.complementsAlimentaires ?? []).join(', ')}; Cosmétiques: ${(memoContent.ventesAdditionnelles.cosmetiques ?? []).join(', ')}`
        : ''
  }
  - **Signaux d'alerte** : ${(memoContent.redFlags ?? []).join('; ')}

  Les outils pédagogiques doivent être DIRECTEMENT DÉRIVÉS des informations clés et spécifiques présentes dans CES SECTIONS de la mémofiche. Ne générez pas d'informations générales ou non présentes dans le contexte fourni.

  Toutes les valeurs de chaîne de caractères dans le JSON doivent avoir les guillemets doubles internes échappés avec une barre oblique inverse (\\") et les nouvelles lignes échappées avec \\n.

  La réponse doit être un objet JSON valide et complet avec les clés "flashcards", "glossary", et "quiz".

  "flashcards" doit être un tableau de 10 objets avec "question" et "answer". Chaque flashcard doit porter sur un point clé du contenu de la mémofiche.
  Exemple de flashcard: {"question": "Quel est l'objectif du traitement d'attaque dans le psoriasis?", "answer": "Réduire rapidement l'inflammation et l'épaisseur des squames."}

  "glossary" doit être un tableau de 10 objets avec "term" et "definition". Chaque terme doit être un concept important ou un mot-clé présent dans le contenu de la mémofiche.
  Exemple de glossaire: {"term": "Phénomène de Koebner", "definition": "Apparition de lésions psoriasiques sur des zones de peau saine ayant subi un traumatisme."}

  "quiz" doit être un tableau de 10 questions : 6 QCM avec 4 options et 4 Vrai/Faux. Chaque question doit être basée sur le contenu de la mémofiche et avoir "questionType", "question", "options", "correctAnswerIndex", et "explanation".
  Exemple de QCM: {"questionType": "QCM", "question": "Quelle est la dose maximale hebdomadaire pour l'association calcipotriol/bétaméthasone?", "options": ["50g", "100g", "150g", "200g"], "correctAnswerIndex": 1, "explanation": "La dose ne doit pas dépasser 100g par semaine."}
  Exemple de Vrai/Faux: {"questionType": "VraiFaux", "question": "Le psoriasis est une maladie contagieuse.", "options": ["Vrai", "Faux"], "correctAnswerIndex": 1, "explanation": "Le psoriasis est une dermatose inflammatoire chronique et non contagieuse."}
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

  let extractedJsonString = jsonText;

  // If the response starts with ```json, remove it
  if (extractedJsonString.startsWith('```json')) {
    extractedJsonString = extractedJsonString.substring(7).trim();
  }
  // If the response ends with ```, remove it
  if (extractedJsonString.endsWith('```')) {
    extractedJsonString = extractedJsonString.substring(0, extractedJsonString.length - 3).trim();
  }

  // Find the first '{' and the last '}' to robustly extract the JSON object
  const firstCurly = extractedJsonString.indexOf('{');
  const lastCurly = extractedJsonString.lastIndexOf('}');

  if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
    extractedJsonString = extractedJsonString.substring(firstCurly, lastCurly + 1);
  } else {
    console.error("Texte reçu de Gemini (pas de JSON valide trouvé après extraction):", jsonText);
    throw new Error("La réponse de l'API Gemini ne contient pas de JSON valide ou est dans un format inattendu.");
  }

  let generatedLearningTools: { flashcards: Flashcard[]; glossary: GlossaryTerm[]; quiz: QuizQuestion[] };
  try {
    generatedLearningTools = JSON.parse(extractedJsonString);
  } catch (error) {
    console.error("Erreur de parsing JSON pour les outils pédagogiques:", error);
    console.error("Texte reçu de Gemini:", jsonText);
    console.error("JSON extrait pour parsing:", extractedJsonString);
    
    // Attempt to clean and re-parse
    const cleanedString = cleanMalformedJson(extractedJsonString);
    console.error("JSON nettoyé pour re-parsing:", cleanedString);
    try {
      generatedLearningTools = JSON.parse(cleanedString);
    } catch (cleanError) {
      console.error("Erreur de parsing JSON après nettoyage:", cleanError);
      throw new Error("La réponse de l'API Gemini pour les outils pédagogiques n'est pas un JSON valide même après nettoyage.");
    }
  }

  // Update the existing memoFiche with the newly generated learning tools
  await memoFichesCollection.updateOne(
    { _id: new ObjectId(memoFicheId) },
    {
      $set: {
        flashcards: generatedLearningTools.flashcards,
        glossary: generatedLearningTools.glossary,
        quiz: generatedLearningTools.quiz,
      },
    }
  );

  // Return the updated memoFiche
  return {
    ...existingMemoFiche,
    flashcards: generatedLearningTools.flashcards,
    glossary: generatedLearningTools.glossary,
    quiz: generatedLearningTools.quiz,
  };
};

function cleanMalformedJson(jsonString: string): string {
  let cleanedString = jsonString;

  // Remove any non-JSON characters before the first { and after the last }
  const firstCurly = cleanedString.indexOf('{');
  const lastCurly = cleanedString.lastIndexOf('}');
  if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
    cleanedString = cleanedString.substring(firstCurly, lastCurly + 1);
  }

  // Replace single quotes with double quotes for string values
  // cleanedString = cleanedString.replace(/'/g, '"'); // This line is causing issues, single quotes are fine within double-quoted JSON strings.

  // Remove trailing commas from objects and arrays
  // This regex is more robust for various whitespace and newline scenarios
  cleanedString = cleanedString.replace(/,\s*([}\]])/g, '$1');

  // Escape unescaped double quotes within string values
  // This is a common issue where "key": "value with "quotes"" breaks JSON
  cleanedString = cleanedString.replace(/\"([^"\\]*(?:\\.[^"\\]*)*)\"/g, (match, p1) => {
    // Only escape if the inner content contains unescaped double quotes
    if (p1.includes('"') && !p1.includes('\\"')) {
      return `"${p1.replace(/"/g, '\\"')}"`;
    }
    return match;
  });

  // Escape unescaped newlines within string values
  cleanedString = cleanedString.replace(/\"([^"\\]*(?:\\.[^"\\]*)*)\n/g, (match, p1) => `"${p1}\\n`);
  cleanedString = cleanedString.replace(/\"([^"\\]*(?:\\.[^"\\]*)*)\r/g, (match, p1) => `"${p1}\\r`);

  // Remove comments (single-line and multi-line) - sometimes models output these
  cleanedString = cleanedString.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  return cleanedString;
}

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