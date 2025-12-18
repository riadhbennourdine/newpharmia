import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const getApiKey = () => {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) throw new Error("La clé API de Gemini n'est pas configurée.");
    return API_KEY;
};

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(getApiKey());
        // The SDK doesn't have a direct 'listModels' on the main class in some versions, 
        // or it might be different. 
        // Actually, for listing models, we often use the fetch endpoint directly or a specific manager 
        // if the SDK exposes it. 
        // The previous code in geminiService.ts used fetch. Let's do that to be raw and sure.
        
        console.log("Listing models via API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${getApiKey()}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods})`);
            });
        } else {
            console.log("No models found or error structure:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
