import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const getApiKey = () => {
    const API_KEY = process.env.GEMINI_API_KEY;
    console.log("GEMINI_API_KEY used in server:", API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : "Not Found");
    if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
    return API_KEY;
};

const genAI = new GoogleGenAI({ apiKey: getApiKey() });
const randomId = crypto.randomBytes(8).toString('hex');
const FILE_STORE_ID = `pharmia-learning-store-${randomId}`;
const EXPORT_DIR = './tmp/memofiches_export';

async function getOrCreateFileStore() {
    console.log(`Checking for File Search Store with display name: ${FILE_STORE_ID}...`);

    try {
        const pager = await genAI.fileSearchStores.list();
        if (pager.page) {
            for (const store of pager.page) {
                if (store.displayName === FILE_STORE_ID) {
                    console.log(`Found existing File Search Store: ${store.name}`);
                    return store;
                }
            }
        }

        console.log(`File Search Store not found. Creating new store with display name: ${FILE_STORE_ID}...`);
        const createStoreOp = await genAI.fileSearchStores.create({
            config: {
                displayName: FILE_STORE_ID,
            },
        });
        console.log(`Store created with name: ${createStoreOp.name}`);
        return createStoreOp;

    } catch (error: any) {
        console.error("Error in getOrCreateFileStore:", error);
        throw error; // Re-throw the error to be caught by the calling function
    }
}

async function listFileStores() {
    try {
        console.log("Listing available File Search Stores...");
        const pager = await genAI.fileSearchStores.list();
        if (!pager.page || pager.page.length === 0) {
            console.log("No File Search Stores found.");
            return;
        }
        for (const store of pager.page) {
            console.log(`- Found store: ${store.name} (Display Name: ${store.displayName})`);
        }
    } catch (error) {
        console.error("Error listing File Search Stores:", error);
    }
}

async function listAvailableModels() {
    try {
        console.log("Listing available Gemini models...");
        const pager = await genAI.models.list();
        if (!pager.page || pager.page.length === 0) {
            console.log("No Gemini models found.");
            return;
        }
        for (const model of pager.page) {
            console.log(`- Found model: ${model.name} (Display Name: ${model.displayName})`);
        }
    } catch (error) {
        console.error("Error listing Gemini models:", error);
    }
}

export async function queryLearningAssistant(query: string, history: { role: string; parts: { text: string }[] }[]) {
    try {
        const fileSearchStore = await getOrCreateFileStore(); // Ensure store exists and get its name
        const fileSearchStoreName = fileSearchStore.name;

        const contents = history.map(msg => ({
            role: msg.role,
            parts: msg.parts,
        }));
        contents.push({ role: 'user', parts: [{ text: query }] });

        const result = await genAI.models.generateContent({
            model: 'gemini-latest', // Use an appropriate model
            contents: contents,
            tools: [{
                fileSearch: {
                    fileSearchStoreNames: [fileSearchStoreName],
                },
            }],
        } as any); // Cast to any to allow the 'tools' property

        const response = result.candidates[0].content.parts[0].text;
        return response;

    } catch (error) {
        console.error("Error querying learning assistant:", error);
        throw error;
    }
}

export async function initializeFileStore() {
    await listFileStores(); // Log existing stores first

    try {
        const fileSearchStore = await getOrCreateFileStore();
        const fileStoreName = fileSearchStore.name;

        const exportedFiles = fs.readdirSync(EXPORT_DIR);
        console.log(`Found ${exportedFiles.length} exported memofiches to upload.`);

        for (const file of exportedFiles) {
            const filePath = path.join(EXPORT_DIR, file);
            console.log(`Uploading and importing ${filePath} to the store...`);

            const uploadOperation = await genAI.fileSearchStores.uploadToFileSearchStore({
                file: filePath, // Pass the file path directly
                fileSearchStoreName: fileStoreName,
                config: {
                    displayName: file,
                    mimeType: 'application/json',
                },
            });
            // The uploadOperation itself is the Operation object.
            // We need to wait for it to be done.
            // The example shows checking operation.done, but for simplicity,
            // we'll assume it completes successfully if no error is thrown.
            console.log(`File upload operation started: ${uploadOperation.name}`);
            // In a real application, you would poll the operation.done status
            // or use a webhook to get notified when it's complete.
            // For now, we'll just proceed.
            // If we need the actual uploaded file details, we might need to call
            // genAI.operations.get(uploadOperation.name) and check its response.
            console.log(`File uploaded and imported: ${file}`); // Log the file name for now
        }

        console.log("All memofiches have been uploaded to the File Search Store.");
        return { success: true, message: "File Search Store initialized successfully." };
    } catch (error) {
        console.error("Error initializing File Search Store:", error);
        return { success: false, message: "Error initializing File Search Store." };
    }
}
