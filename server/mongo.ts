import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;

if (!uri) {
  // FIX: Replaced console.error and process.exit with a thrown error.
  // This is a more standard way to handle fatal configuration errors in a module,
  // stops execution, and resolves the TypeScript error regarding `process.exit`.
  throw new Error(
    'FATAL ERROR: MONGO_URL environment variable is not defined.\nPlease set the MONGO_URL environment variable to your MongoDB connection string.',
  );
}

export let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // FIX: Replaced Node.js-specific `global` with the standardized `globalThis`
  // to ensure compatibility across different JavaScript environments and to
  // resolve the "Cannot find name 'global'" TypeScript error.
  if (!(globalThis as any)._mongoClientPromise) {
    client = new MongoClient(uri, {});
    (globalThis as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (globalThis as any)._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, {});
  clientPromise = client.connect();
}

export default clientPromise;
