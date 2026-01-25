import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const checkCrop = async () => {
  if (!MONGO_URL) return;
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db('pharmia');
  const webinar = await db
    .collection('webinars')
    .findOne({ group: 'CROP Tunis' });
  console.log(JSON.stringify(webinar, null, 2));
  await client.close();
};

checkCrop();
