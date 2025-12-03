import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const algoliasearch = require('algoliasearch');
import { MemoFiche } from '../types.js';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_WRITE_KEY) {
  throw new Error('Algolia App ID and Write API Key are required.');
}

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_WRITE_KEY
);

const index = client.initIndex('memofiches');

export const indexMemoFiches = async (fiches: MemoFiche[]) => {
  if (fiches.length === 0) {
    return;
  }

  const objectsToIndex = fiches.map(fiche => ({
    objectID: fiche._id.toString(),
    title: fiche.title,
    theme: fiche.theme,
    system: fiche.system,
    patientSituation: typeof fiche.patientSituation === 'string' ? fiche.patientSituation : '',
    pathologyOverview: typeof fiche.pathologyOverview === 'string' ? fiche.pathologyOverview : '',
    keyPoints: fiche.keyPoints,
  }));

  try {
    const { objectIDs } = await index.saveObjects(objectsToIndex);
    console.log(`Successfully indexed ${objectIDs.length} memofiches.`);
    return objectIDs;
  } catch (error) {
    console.error('Error indexing fiches to Algolia:', error);
    throw error;
  }
};

export const removeMemoFicheFromIndex = async (ficheId: string) => {
  try {
    const { objectIDs } = await index.deleteObjects([ficheId]);
    console.log(`Successfully removed memofiche with ID: ${objectIDs[0]} from index.`);
    return objectIDs;
  } catch (error) {
    console.error('Error removing fiche from Algolia index:', error);
    throw error;
  }
};

export const clearIndex = async () => {
  try {
    await index.clearObjects();
    console.log('Successfully cleared the Algolia index.');
  } catch (error) {
    console.error('Error clearing the Algolia index:', error);
    throw error;
  }
};

/**
 * Searches the memofiches index in Algolia.
 * @param query - The search query string.
 * @returns A promise that resolves with the search results.
 */
export const searchMemoFiches = async (query: string) => {
  try {
    const results = await index.search(query, {
      hitsPerPage: 5, // Limit to the top 5 results to build the context
    });
    return results.hits;
  } catch (error) {
    console.error('Error searching Algolia index:', error);
    throw error;
  }
};