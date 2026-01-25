import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const webinarId = process.argv[2];

const publishWebinar = async () => {
  if (!MONGO_URL) {
    console.error('MONGO_URL not defined');
    return;
  }
  if (!webinarId) {
    console.error('Webinar ID not provided');
    return;
  }

  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db('pharmia');
  const result = await db
    .collection('webinars')
    .updateOne(
      { _id: new ObjectId(webinarId) },
      { $set: { publicationStatus: 'PUBLISHED' } },
    );

  console.log(result);
  await client.close();
};

publishWebinar();
