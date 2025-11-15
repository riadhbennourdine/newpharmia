import { VertexAI } from '@google-cloud/vertexai';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = 'us-central1';
const GOOGLE_APPLICATION_CREDENTIALS_CONTENT = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!PROJECT_ID) {
  throw new Error("La variable d'environnement GOOGLE_PROJECT_ID est requise.");
}

if (!GOOGLE_APPLICATION_CREDENTIALS_CONTENT) {
  throw new Error("La variable d'environnement GOOGLE_APPLICATION_CREDENTIALS est requise.");
}

// Create a temporary file with the credentials
const credentialsPath = path.join('/tmp', 'gcp-credentials.json');
fs.writeFileSync(credentialsPath, GOOGLE_APPLICATION_CREDENTIALS_CONTENT);

// Set the environment variable to the path of the temporary file
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

export const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
