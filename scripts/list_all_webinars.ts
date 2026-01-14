import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const listAll = async () => {
    if (!MONGO_URL) return;
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db('pharmia');
    const results = await db.collection('webinars').find({}).toArray();
    console.log(JSON.stringify(results.map(r => ({ _id: r._id, title: r.title, group: r.group, date: r.date })), null, 2));
    await client.close();
};

listAll();
