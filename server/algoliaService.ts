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
    console.log(`[Algolia] Searching for: "${query}"`);
    const results = await index.search(query, {
      hitsPerPage: 5, // Limit to the top 5 results to build the context
    });
    console.log(`[Algolia] Found ${results.hits.length} hits.`);
    return results.hits;
  } catch (error) {
    console.error('Error searching Algolia index:', error);
    throw error;
  }
};