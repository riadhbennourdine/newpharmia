import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGO_URL =
  'mongodb://mongo:YoEfFXGVQwTTQlnwwPYRKwdIrgEqXrNp@centerbeam.proxy.rlwy.net:33803';
const DB_NAME = 'pharmia'; // Assuming the database name is 'newpharmia'
const COLLECTION_NAME = 'memofiches';
const EXPORT_DIR = './tmp/memofiches_export';

async function exportMemofiches() {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const memofiches = await collection.find({}).toArray();
    console.log(`Found ${memofiches.length} memofiches.`);

    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    for (const fiche of memofiches) {
      const filename = path.join(EXPORT_DIR, `${fiche._id}.json`);
      fs.writeFileSync(filename, JSON.stringify(fiche, null, 2));
      console.log(`Exported ${fiche._id}.json`);
    }

    console.log('Memofiches exported successfully!');
  } catch (error) {
    console.error('Error exporting memofiches:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

exportMemofiches();
