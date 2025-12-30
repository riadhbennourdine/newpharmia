import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const webinars = [
    {
        title: "Pharmacie vétérinaire - volailles, vaccination",
        date: "2026-04-07T08:00:00.000Z",
        description: "Session CROP Tunis : Pharmacie vétérinaire - focus volailles et protocoles de vaccination.",
        presenter: "Ph Riadh Barhoumi",
        group: "CROP Tunis",
        publicationStatus: "PUBLISHED"
    },
    {
        title: "Révision Générale - Questions Réponse",
        date: "2026-04-14T08:00:00.000Z",
        description: "Session de révision générale et session interactive de questions-réponses.",
        presenter: "Ph Riadh Barhoumi",
        group: "CROP Tunis",
        publicationStatus: "PUBLISHED"
    },
    {
        title: "Évaluation écrite",
        date: "2026-04-21T08:00:00.000Z",
        description: "Évaluation écrite des connaissances acquises durant le cycle.",
        presenter: "Ph Riadh Barhoumi",
        group: "CROP Tunis",
        publicationStatus: "PUBLISHED"
    },
    {
        title: "Évaluation orale",
        date: "2026-04-28T08:00:00.000Z",
        description: "Évaluation orale et validation finale des compétences.",
        presenter: "Ph Riadh Barhoumi",
        group: "CROP Tunis",
        publicationStatus: "PUBLISHED"
    }
];

const insertCropWebinars = async () => {
    if (!MONGO_URL) return;
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db('pharmia');
    const collection = db.collection('webinars');

    console.log(`Attempting to insert ${webinars.length} CROP Tunis webinars...`);

    for (const w of webinars) {
        const existing = await collection.findOne({ title: w.title, date: new Date(w.date) });
        if (existing) {
            console.log(`Skipping already existing webinar: ${w.title}`);
            continue;
        }
        
        await collection.insertOne({
            ...w,
            date: new Date(w.date),
            attendees: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log(`Inserted: ${w.title}`);
    }

    await client.close();
};

insertCropWebinars();
