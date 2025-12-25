import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'dermoguide_generated');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// --- Schema Definition (Strictly Typed for App) ---
const dermoSchema = {
    type: SchemaType.OBJECT,
    properties: {
        id: { type: SchemaType.STRING, description: "Slug unique (ex: psoriasis-vulgaire)" },
        title: { type: SchemaType.STRING, description: "Nom de la pathologie" },
        group: { 
            type: SchemaType.STRING, 
            enum: ["A", "B", "C", "D"],
            description: "A=Ça gratte, B=Boutons Visage, C=Plaques & Squames, D=Mains/Pieds" 
        },
        shortDef: { type: SchemaType.STRING, description: "Définition courte en 1 phrase" },
        pharma: {
            type: SchemaType.OBJECT,
            properties: {
                profil: { type: SchemaType.STRING, description: "P - Terrain, Âge, Sexe" },
                histoire: { type: SchemaType.STRING, description: "H - Facteurs déclenchants, début, contexte" },
                analyse: { 
                    type: SchemaType.OBJECT,
                    properties: {
                        lesionPrimaire: { type: SchemaType.STRING, description: "Type précis (Macule, Papule...)" },
                        aspectVisuel: { type: SchemaType.STRING, description: "Description visuelle détaillée (forme, couleur, texture)" },
                        symptomes: { type: SchemaType.STRING, description: "Prurit, douleur, brûlure" }
                    },
                    required: ["lesionPrimaire", "aspectVisuel", "symptomes"]
                },
                recurrence: { type: SchemaType.STRING, description: "R - Chronique ou Aigu" },
                medicaments: { type: SchemaType.STRING, description: "M - Lien iatrogène ou confusion" },
                alerte: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "A - Drapeaux Rouges (Red Flags)" 
                }
            },
            required: ["profil", "histoire", "analyse", "recurrence", "medicaments", "alerte"]
        },
        protocol: {
            type: SchemaType.OBJECT,
            properties: {
                hygiene: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                traitement: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                soin: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["hygiene", "traitement", "soin"]
        },
        differential: {
            type: SchemaType.ARRAY,
            items: { 
                type: SchemaType.OBJECT, 
                properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING, description: "Pourquoi on confond et comment différencier" }
                }
            }
        },
        imagePrompt: { type: SchemaType.STRING, description: "Prompt précis pour générer/chercher une image d'atlas correspondante" }
    },
    required: ["id", "title", "group", "shortDef", "pharma", "protocol", "differential", "imagePrompt"]
};

// --- Generation Logic ---
async function generateDermoFiche(pathologyName: string, rawContext: string = "") {
    if (!API_KEY) {
        console.error("❌ ERREUR: GEMINI_API_KEY manquante dans .env");
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro", // Use Pro for complex reasoning
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: dermoSchema
        }
    });

    console.log(`🚀 Génération en cours pour : ${pathologyName}...`);

    const prompt = `
    Tu es un Expert Dermatologue et Pharmacien.
    Ta mission : Créer une fiche structurée "DermoGuide" pour l'application d'aide au triage officinal.

    SUJET : "${pathologyName}"
    ${rawContext ? `CONTEXTE ACADÉMIQUE FOURNI : ${rawContext}` : ""}

    CONSIGNES STRICTES :
    1. **Méthode PHARMA** : Respecte scrupuleusement la structure P.H.A.R.M.A.
    2. **Sémiologie** : Utilise le vocabulaire dermatologique précis (Macule, Papule, Vésicule, Squame, etc.) dans la section 'Analyse'.
    3. **Groupes** :
       - A: "Ça gratte" (Prurit)
       - B: "Boutons & Visage" (Acné, Rosacée)
       - C: "Plaques & Squames" (Psoriasis, Mycose)
       - D: "Mains, Pieds & Ongles"
    4. **Orientation** : Si la pathologie est une urgence ou grave, remplis bien les "Red Flags".
    5. **Conseil** : Si éligible au conseil, fournis un protocole Hygiène/Traitement/Soin réaliste en officine (OTC).

    Génère le JSON complet.
    `;

    try {
        const result = await model.generateContent(prompt);
        const fiche = JSON.parse(result.response.text());
        
        // Save to file
        const filename = `${fiche.id}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(fiche, null, 2));

        console.log(`✅ Fiche générée avec succès : ${filepath}`);
        return fiche;

    } catch (error) {
        console.error("❌ Erreur de génération :", error);
    }
}

// --- CLI Execution ---
const target = process.argv[2];
const contextFile = process.argv[3];

if (target) {
    let context = "";
    if (contextFile && fs.existsSync(contextFile)) {
        context = fs.readFileSync(contextFile, 'utf-8');
        console.log(`📚 Contexte chargé depuis ${contextFile}`);
    }
    generateDermoFiche(target, context);
} else {
    console.log("Usage: npx ts-node scripts/generate_dermoguide_fiche.ts <NomPathologie> [FichierContexteOptional]");
    console.log("Exemple: npx ts-node scripts/generate_dermoguide_fiche.ts 'Psoriasis'");
}
