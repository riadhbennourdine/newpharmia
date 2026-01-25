import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';

const getApiKey = () => {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
  return API_KEY;
};

/**
 * Uploads a file to the Gemini API.
 * @param path The local path to the file to upload.
 * @param mimeType The MIME type of the file.
 * @returns The Gemini File API object.
 */
export const uploadFileToGemini = async (path: string, mimeType: string) => {
  const apiKey = getApiKey();
  const fileManager = new GoogleAIFileManager(apiKey);
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  return uploadResult.file;
};

/**
 * Performs a search query across a set of uploaded files using the Gemini API.
 * @param query The search query.
 * @param files An array of Gemini File API objects to search within.
 * @returns The search results as a string.
 */
export const searchInFiles = async (
  query: string,
  files: { name: string; uri: string; mimeType: string }[],
) => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const fileParts = files.map((file) => ({
    fileData: {
      mimeType: file.mimeType,
      fileUri: file.uri,
    },
  }));

  const prompt = `
    Tu es un assistant de recherche expert. Ta tâche est de répondre à la question de l'utilisateur en te basant EXCLUSIVEMENT sur le contenu des fichiers fournis.
    Analyse attentivement chaque fichier pour trouver les informations les plus pertinentes.
    Lorsque tu trouves une information pertinente, cite le passage exact et mentionne le nom du fichier d'où il provient.
    Si tu ne trouves pas de réponse dans les documents, réponds "Je n'ai pas trouvé d'information correspondante dans les documents fournis."
    Ne fournis aucune information qui ne provient pas directement des fichiers.

    Question de l'utilisateur : "${query}"
  `;

  const result = await model.generateContent([prompt, ...fileParts]);
  const response = await result.response;
  const text = response.text();

  return text;
};
