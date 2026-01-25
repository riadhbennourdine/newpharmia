import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const checkPharmia = async () => {
  if (!MONGO_URL) return;
  const client = await MongoClient.connect(MONGO_URL);
  // Connect explicitly to 'pharmia' database
  const db = client.db('pharmia');

  const count = await db.collection('webinars').countDocuments({});
  console.log(`Total webinars in 'pharmia' DB: ${count}`);

  // Search for one of the specific "old" webinars
  const example = await db
    .collection('webinars')
    .findOne({ title: { $regex: /Fièvre/i } });
  if (example) {
    console.log(
      'Found example old webinar:',
      example.title,
      '| Group:',
      example.group,
    );
  } else {
    console.log('Could not find "Fièvre" webinar in pharmia DB either.');
  }

  // List all groups in this DB
  const groups = await db.collection('webinars').distinct('group');
  console.log('Groups in pharmia DB:', groups);

  await client.close();
};

checkPharmia();
