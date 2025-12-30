import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const listGroups = async () => {
    if (!MONGO_URL) return;
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    const groups = await db.collection('webinars').distinct('group');
    const counts = await Promise.all(groups.map(async g => ({ 
        group: g, 
        count: await db.collection('webinars').countDocuments({ group: g }) 
    })));
    console.log(JSON.stringify(counts, null, 2));
    await client.close();
};

listGroups();
