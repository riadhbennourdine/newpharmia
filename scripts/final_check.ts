import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const finalCheck = async () => {
    if (!MONGO_URL) return;
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db('pharmia');
    const collection = db.collection('webinars');

    const mcWebinars = await collection.find({ group: 'MASTER CLASS OFFICINE 2026' }).sort({ date: 1 }).toArray();
    const cropWebinars = await collection.find({ group: 'CROP Tunis' }).sort({ date: 1 }).toArray();

    console.log(`--- MASTER CLASS OFFICINE 2026 (${mcWebinars.length} sessions) ---`);
    mcWebinars.slice(0, 5).forEach(w => console.log(`  [NEW] ${w.title} - ${new Date(w.date).toLocaleDateString()}`));
    console.log('  ...');
    mcWebinars.slice(-5).forEach(w => console.log(`  [NEW] ${w.title} - ${new Date(w.date).toLocaleDateString()}`));

    console.log(`\n--- CROP TUNIS (${cropWebinars.length} sessions) ---`);
    cropWebinars.forEach(w => console.log(`  [KEEP] ${w.title} - ${new Date(w.date).toLocaleDateString()}`));

    await client.close();
};

finalCheck();
