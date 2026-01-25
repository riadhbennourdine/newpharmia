import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const verifyApril = async () => {
  if (!MONGO_URL) return;
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db('pharmia');
  const collection = db.collection('webinars');

  const startApril = new Date('2026-04-01');
  const endApril = new Date('2026-04-30T23:59:59');

  const aprilWebinars = await collection
    .find({
      group: 'CROP Tunis',
      date: { $gte: startApril, $lte: endApril },
    })
    .sort({ date: 1 })
    .toArray();

  console.log('--- CROP TUNIS - AVRIL 2026 ---');
  aprilWebinars.forEach((w) =>
    console.log(
      `  - ${w.title} | Date: ${new Date(w.date).toLocaleDateString('fr-FR')}`,
    ),
  );

  await client.close();
};

verifyApril();
