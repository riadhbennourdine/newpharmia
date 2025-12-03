
import 'dotenv/config'; // Loads environment variables from .env file
import { MongoClient } from 'mongodb';

async function listCollections() {
    const uri = process.env.MONGO_URL;

    if (!uri) {
        console.error('MONGO_URL environment variable is not defined.');
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Successfully connected to MongoDB.');

        const db = client.db('pharmia');
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('No collections found in the "pharmia" database.');
        } else {
            console.log('Collections in "pharmia" database:');
            collections.forEach(col => console.log(`- ${col.name}`));
        }
    } catch (error) {
        console.error('Error connecting to MongoDB or listing collections:', error);
    } finally {
        await client.close();
    }
}

listCollections();
