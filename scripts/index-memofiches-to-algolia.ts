import clientPromise from '../server/mongo';
import { indexMemoFiches, clearIndex } from '../server/algoliaService';
import { MemoFiche } from '../types';

const runIndexing = async () => {
  let mongoClient;
  try {
    console.log('Connecting to MongoDB...');
    mongoClient = await clientPromise;
    const db = mongoClient.db('pharmia');

    console.log('Clearing Algolia index...');
    await clearIndex();

    console.log('Fetching documents from memofiches collection...');
    const fichesCollection = db.collection<MemoFiche>('memofiches');
    const allFiches = await fichesCollection.find({}).toArray();

    console.log(`Found ${allFiches.length} fiches to index.`);

    if (allFiches.length > 0) {
      console.log('Starting indexing to Algolia...');
      await indexMemoFiches(allFiches);
      console.log('Indexing complete.');
    }
  } catch (error) {
    console.error('An error occurred during the indexing process:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB connection closed.');
    }
    process.exit();
  }
};

runIndexing();
