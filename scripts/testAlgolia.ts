
import dotenv from 'dotenv';
import algoliasearch from 'algoliasearch';

dotenv.config();

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_SEARCH_KEY);
const index = client.initIndex('memofiches');

async function testSearch() {
  try {
    console.log("Testing Algolia search for 'angine'...");
    const results = await index.search('angine');
    console.log(`Hits found: ${results.hits.length}`);
    results.hits.forEach(hit => console.log(`- ${hit.title}`));
  } catch (error) {
    console.error("Search failed:", error.message);
  }
}

testSearch();
