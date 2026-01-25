import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const searchMC = async () => {
  if (!MONGO_URL) return;
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db();
  const results = await db
    .collection('webinars')
    .find({
      title: { $regex: /Master Class/i },
    })
    .project({ title: 1, group: 1, date: 1 })
    .toArray();
  console.log(JSON.stringify(results, null, 2));
  await client.close();
};

searchMC();
