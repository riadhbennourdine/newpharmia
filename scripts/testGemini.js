import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const getApiKey = () => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
    return API_KEY;
};

const genAI = new GoogleGenAI({ apiKey: getApiKey() });

async function testListFileStores() {
    try {
        console.log("Listing available File Search Stores with test script...");
        const pager = await genAI.fileSearchStores.list();
        console.log("Successfully called the list API.");
        if (!pager.page || pager.page.length === 0) {
            console.log("No File Search Stores found.");
            return;
        }
        for (const store of pager.page) {
            console.log(`- Found store: ${store.name} (Display Name: ${store.displayName})`);
        }
    } catch (error) {
        console.error("Error in test script listing File Search Stores:", error);
    }
}

testListFileStores();
