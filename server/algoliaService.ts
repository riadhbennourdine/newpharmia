import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const algoliasearch = require('algoliasearch');
import { MemoFiche } from '../types.js';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_WRITE_KEY || !process.env.ALGOLIA_SEARCH_KEY) {
  throw new Error('Algolia App ID, Search Key and Write API Key are required.');
}

// Search client (public/search operations)
const searchClient = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_SEARCH_KEY
);

// Admin client (index/write operations)
const adminClient = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_WRITE_KEY
);

const index = searchClient.initIndex('memofiches');
const adminIndex = adminClient.initIndex('memofiches');

export function extractTextFromMemoFiche(fiche: MemoFiche): string {
  let fullText = '';

  const appendContent = (content: any) => {
    if (!content) return;
    if (typeof content === 'string') {
      fullText += ` ${content}`;
    } else if (Array.isArray(content)) {
      content.forEach(item => appendContent(item));
    } else if (typeof content === 'object' && content !== null) {
      if (content.value && typeof content.value === 'string') {
        fullText += ` ${content.value}`;
      }
      if (content.content && (Array.isArray(content.content) || typeof content.content === 'string')) {
        appendContent(content.content);
      }
      if (content.conseils && Array.isArray(content.conseils)) {
        appendContent(content.conseils);
      }
    }
  };

  fullText += ` ${fiche.title || ''}`;
  fullText += ` ${fiche.shortDescription || ''}`;
  fullText += ` ${fiche.theme || ''}`;
  fullText += ` ${fiche.system || ''}`;

  appendContent(fiche.keyPoints);
  appendContent(fiche.patientSituation);
  appendContent(fiche.pathologyOverview);
  appendContent(fiche.redFlags);
  appendContent(fiche.mainTreatment);
  appendContent(fiche.associatedProducts);
  appendContent(fiche.lifestyleAdvice);
  appendContent(fiche.dietaryAdvice);
  appendContent(fiche.references);

  fiche.memoSections?.forEach(section => {
    fullText += ` ${section.title || ''}`;
    appendContent(section.content);
  });
  fiche.customSections?.forEach(section => {
    fullText += ` ${section.title || ''}`;
    appendContent(section.content);
  });
  
  appendContent(fiche.ordonnance);
  appendContent(fiche.analyseOrdonnance);
  appendContent(fiche.conseilsTraitement);
  appendContent(fiche.informationsMaladie);
  appendContent(fiche.conseilsHygieneDeVie);
  appendContent(fiche.conseilsAlimentaires);
  
  if (fiche.ventesAdditionnelles && typeof fiche.ventesAdditionnelles === 'object') {
      appendContent((fiche.ventesAdditionnelles as any).complementsAlimentaires);
      appendContent((fiche.ventesAdditionnelles as any).accessoires);
      appendContent((fiche.ventesAdditionnelles as any).dispositifs);
      appendContent((fiche.ventesAdditionnelles as any).cosmetiques);
  }

  return fullText.replace(/\s+/g, ' ').trim();
}

export const indexMemoFiches = async (fiches: MemoFiche[]) => {
  if (fiches.length === 0) {
    console.log('No fiches to index.');
    return;
  }

  const objectsToIndex = fiches.map(fiche => {
    const fullContent = extractTextFromMemoFiche(fiche);
    const truncatedContent = fullContent.substring(0, 8000); // Truncate to 8000 characters
    if (fullContent.length > 8000) {
        console.warn(`Fiche ${fiche._id} content truncated from ${fullContent.length} to 8000 characters.`);
    }

    return {
        objectID: fiche._id.toString(),
        title: fiche.title,
        theme: fiche.theme,
        system: fiche.system,
        fullContent: truncatedContent,
    };
  });

  try {
    const { objectIDs } = await adminIndex.saveObjects(objectsToIndex);
    console.log(`Successfully indexed ${objectIDs.length} memofiches.`);
    return objectIDs;
  } catch (error) {
    console.error('Error indexing fiches to Algolia:', error);
    throw error;
  }
};

export const removeMemoFicheFromIndex = async (ficheId: string) => {
  try {
    const { objectIDs } = await adminIndex.deleteObjects([ficheId]);
    console.log(`Successfully removed memofiche with ID: ${objectIDs[0]} from index.`);
    return objectIDs;
  } catch (error) {
    console.error('Error removing fiche from Algolia index:', error);
    throw error;
  }
};

export const clearIndex = async () => {
  try {
    await adminIndex.clearObjects();
    console.log('Successfully cleared the Algolia index.');
  } catch (error) {
    console.error('Error clearing the Algolia index:', error);
    throw error;
  }
};

/**
 * Cleans the search query to improve Algolia matching.
 * Removes common French stop words and verbs.
 */
function cleanQuery(query: string): string {
  const stopWords = ['comment', 'traiter', 'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'pour', 'est', 'ce', 'que', 'quel', 'quels', 'quelle', 'quelles', 'dans', 'sur', 'avec'];
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 1)
    .join(' ');
}

/**
 * Searches the memofiches index in Algolia.
 * @param query - The search query string.
 * @returns A promise that resolves with the search results.
 */
export const searchMemoFiches = async (query: string) => {
  try {
    const cleaned = cleanQuery(query);
    console.log(`[Algolia] Original: "${query}" | Cleaned: "${cleaned}"`);
    
    // If the query is empty after cleaning (e.g., "Bonjour"), don't search
    if (!cleaned) return [];

    const results = await index.search(cleaned, {
      hitsPerPage: 5, // Limit to the top 5 results to build the context
    });
    console.log(`[Algolia] Found ${results.hits.length} hits.`);
    return results.hits;
  } catch (error) {
    console.error('Error searching Algolia index:', error);
    throw error;
  }
};