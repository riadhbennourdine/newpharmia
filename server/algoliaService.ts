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

function extractTextFromMemoFiche(fiche: MemoFiche): string {
  let fullText = '';

  // Helper to extract text from a string or MemoFicheSectionContent array
  const appendContent = (content: string | string[] | Array<{ type: string; value: string }> | undefined) => {
    if (typeof content === 'string') {
      fullText += ` ${content}`;
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'string') {
          fullText += ` ${item}`;
        } else if (item && typeof item.value === 'string') {
          fullText += ` ${item.value}`;
        }
      });
    }
  };

  fullText += ` ${fiche.title || ''}`;
  fullText += ` ${fiche.shortDescription || ''}`;
  fullText += ` ${fiche.theme || ''}`;
  fullText += ` ${fiche.system || ''}`;

  if (fiche.keyPoints) {
    appendContent(fiche.keyPoints);
  }
  if (fiche.patientSituation) {
    appendContent(fiche.patientSituation.content || fiche.patientSituation); // Handle both string and object
  }
  if (fiche.pathologyOverview) {
    appendContent(fiche.pathologyOverview.content || fiche.pathologyOverview); // Handle both string and object
  }
  if (fiche.redFlags) {
    appendContent(fiche.redFlags);
  }
  if (fiche.mainTreatment) {
    appendContent(fiche.mainTreatment);
  }
  if (fiche.associatedProducts) {
    appendContent(fiche.associatedProducts);
  }
  if (fiche.lifestyleAdvice) {
    appendContent(fiche.lifestyleAdvice);
  }
  if (fiche.dietaryAdvice) {
    appendContent(fiche.dietaryAdvice);
  }
  if (fiche.references) {
    appendContent(fiche.references);
  }

  // Handle memoSections and customSections
  if (fiche.memoSections) {
    fiche.memoSections.forEach(section => {
      fullText += ` ${section.title || ''}`;
      appendContent(section.content);
    });
  }
  if (fiche.customSections) {
    fiche.customSections.forEach(section => {
      fullText += ` ${section.title || ''}`;
      appendContent(section.content);
    });
  }

  // Handle ordonnances specific fields
  if (fiche.ordonnance) {
    appendContent(fiche.ordonnance);
  }
  if (fiche.analyseOrdonnance) {
    appendContent(fiche.analyseOrdonnance);
  }
  if (fiche.conseilsTraitement) {
    if (Array.isArray(fiche.conseilsTraitement)) {
      fiche.conseilsTraitement.forEach(ct => appendContent(ct.conseils));
    } else {
      appendContent(fiche.conseilsTraitement);
    }
  }
  if (fiche.informationsMaladie) {
    appendContent(fiche.informationsMaladie);
  }
  if (fiche.conseilsHygieneDeVie) {
    appendContent(fiche.conseilsHygieneDeVie);
  }
  if (fiche.conseilsAlimentaires) {
    appendContent(fiche.conseilsAlimentaires);
  }
  if (fiche.ventesAdditionnelles) {
    if (typeof fiche.ventesAdditionnelles === 'string') { // Should not be string in theory
      fullText += ` ${fiche.ventesAdditionnelles}`;
    } else if (typeof fiche.ventesAdditionnelles === 'object') {
      appendContent(fiche.ventesAdditionnelles.complementsAlimentaires);
      appendContent(fiche.ventesAdditionnelles.accessoires);
      appendContent(fiche.ventesAdditionnelles.dispositifs);
      appendContent(fiche.ventesAdditionnelles.cosmetiques);
    }
  }

  return fullText.replace(/\s+/g, ' ').trim(); // Replace multiple spaces with single space and trim
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
    const results = await index.search(query, {
      hitsPerPage: 5, // Limit to the top 5 results to build the context
    });
    return results.hits;
  } catch (error) {
    console.error('Error searching Algolia index:', error);
    throw error;
  }
};