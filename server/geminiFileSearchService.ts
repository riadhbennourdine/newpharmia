import { vertexAI } from './vertexAI.js';
import * as fs from 'fs';
import { Part } from '@google-cloud/vertexai';

const getGenerativeModel = (modelName: string) => {
  return vertexAI.getGenerativeModel({ model: modelName });
};

/**
 * Uploads a file to the Gemini API.
 * @param path The local path to the file to upload.
 * @param mimeType The MIME type of the file.
 * @returns The Gemini File API object.
 */
export const uploadFileToGemini = async (path: string, mimeType: string) => {
  const fileBytes = fs.readFileSync(path);
  const base64File = fileBytes.toString('base64');

  const filePart: Part = {
    fileData: {
      mimeType,
      fileUri: `data:${mimeType};base64,${base64File}`,
    },
  };

  // With the new SDK, we don't upload files beforehand.
  // We pass the file data directly when generating content.
  // This function will now just prepare the file part.
  console.log(`Preparing file for Gemini: ${path}`);
  return filePart;
};

/**
 * Performs a search query across a set of uploaded files using the Gemini API.
 * @param query The search query.
 * @param files An array of Gemini File API objects to search within.
 * @returns The search results as a string.
 */
export const searchInFiles = async (query: string, fileParts: Part[]) => {
  const model = getGenerativeModel('gemini-1.5-pro');

  const prompt = `
    Tu es un assistant de recherche expert. Ta tâche est de répondre à la question de l'utilisateur en te basant EXCLUSIVEMENT sur le contenu des fichiers fournis.
    Analyse attentivement chaque fichier pour trouver les informations les plus pertinentes.
    Lorsque tu trouves une information pertinente, cite le passage exact.
    Si tu ne trouves pas de réponse dans les documents, réponds "Je n'ai pas trouvé d'information correspondante dans les documents fournis."
    Ne fournis aucune information qui ne provient pas directement des fichiers.

    Question de l'utilisateur : "${query}"
  `;

  console.log(`Performing search for query: "${query}" in ${fileParts.length} files.`);

  const contents = [{ role: 'user', parts: [ {text: prompt}, ...fileParts] }];

  const result = await model.generateContent({ contents });
  const response = result.response;

  if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Réponse invalide de l\'API Gemini.');
  }

  const text = response.candidates[0].content.parts[0].text;

  console.log('Search result from Gemini:', text);
  return text;
};