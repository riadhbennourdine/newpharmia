import clientPromise from '../server/mongo';
import { Collection } from 'mongodb';
import { CaseStudy } from '../types';

async function run() {
  console.log('Connecting to database...');
  const client = await clientPromise;
  const db = client.db('pharmia');
  const memofiches: Collection<CaseStudy> = db.collection('memofiches');
  console.log('Successfully connected to database.');

  const filter = { memoSections: { $exists: false } };
  const update = { $set: { memoSections: [] } };

  console.log('Updating documents...');
  const result = await memofiches.updateMany(filter, update);

  console.log(`Migration complete. Updated ${result.modifiedCount} documents to add the 'memoSections' field.`);

  await client.close();
  console.log('Database connection closed.');
}

run().catch(err => {
    console.error('An error occurred during the migration:', err);
    process.exit(1);
});
