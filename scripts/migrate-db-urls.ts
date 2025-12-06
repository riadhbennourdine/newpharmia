// scripts/migrate-db-urls.ts

import clientPromise from '../server/mongo.js';
import { CaseStudy, MemoFicheSection, MemoFicheSectionContent } from '../types.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define URL patterns
const OLD_FTP_PROXY_REGEX = /\/api\/ftp\/view\?filePath=(.*)/;
const OLD_EXTERNAL_URL_PREFIX = 'https://pharmaconseilbmb.com/photos/site';
const NEW_URL_PREFIX = '/uploads/pharmia';

function transformUrl(oldUrl: string): string | null {
  // Case 1: Handle /api/ftp/view?filePath=...
  let match = oldUrl.match(OLD_FTP_PROXY_REGEX);
  if (match && match[1]) {
    // The captured path might still have a leading /pharmia, remove it if so
    // to avoid /uploads/pharmia/pharmia/...
    const decodedPath = decodeURIComponent(match[1]).replace(/^\/pharmia/, '');
    return `${NEW_URL_PREFIX}${decodedPath}`;
  }

  // Case 2: Handle https://pharmaconseilbmb.com/photos/site/...
  if (oldUrl.startsWith(OLD_EXTERNAL_URL_PREFIX)) {
    const relativePath = oldUrl.substring(OLD_EXTERNAL_URL_PREFIX.length);
    return `${NEW_URL_PREFIX}${relativePath}`;
  }

  // Return null if no transformation is needed
  return null;
}


async function migrateDbUrls() {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const memofichesCollection = db.collection<CaseStudy>('memofiches');

    console.log('Starting migration of image URLs in MongoDB...');

    const cursor = memofichesCollection.find({});
    let migratedCount = 0;
    let updatedFiches = new Set<string>();

    for await (const fiche of cursor) {
      let updated = false;
      const newFiche = JSON.parse(JSON.stringify(fiche)); // Deep copy to avoid mutation issues

      // 1. Migrate coverImageUrl
      const newCoverUrl = transformUrl(newFiche.coverImageUrl || '');
      if (newCoverUrl) {
        console.log(`- [${newFiche.title}] Migrating coverImageUrl: ${newFiche.coverImageUrl} -> ${newCoverUrl}`);
        newFiche.coverImageUrl = newCoverUrl;
        updated = true;
      }

      // 2. Migrate infographicImageUrl
      const newInfographicUrl = transformUrl(newFiche.infographicImageUrl || '');
      if (newInfographicUrl) {
        console.log(`- [${newFiche.title}] Migrating infographicImageUrl: ${newFiche.infographicImageUrl} -> ${newInfographicUrl}`);
        newFiche.infographicImageUrl = newInfographicUrl;
        updated = true;
      }

      // 3. Migrate images within rich content sections
      const migrateSectionContent = (sections: MemoFicheSection[] | undefined) => {
        if (!sections) return;
        sections.forEach(section => {
          if (section.content) {
            section.content.forEach((item: MemoFicheSectionContent) => {
              if (item.type === 'image' && item.value) {
                const newContentUrl = transformUrl(item.value);
                if (newContentUrl) {
                  console.log(`- [${newFiche.title}] Migrating image in section "${section.title}": ... -> ${newContentUrl}`);
                  item.value = newContentUrl;
                  updated = true;
                }
              }
            });
          }
        });
      };

      migrateSectionContent(newFiche.memoSections);
      migrateSectionContent(newFiche.customSections);
      
      // Also check top-level simple sections that might contain image URLs in rich content format
      // This is a safeguard based on the complex structure of CaseStudy type
      const sectionsToCheck = ['patientSituation', 'pathologyOverview', 'casComptoir', 'objectifsConseil', 'pathologiesConcernees', 'interetDispositif', 'beneficesSante', 'dispositifsAConseiller', 'reponsesObjections', 'pagesSponsorisees'];
      for (const key of sectionsToCheck) {
        if (newFiche[key]) {
            migrateSectionContent([newFiche[key]]);
        }
      }


      // 4. Update the document if any changes were made
      if (updated) {
        await memofichesCollection.replaceOne({ _id: fiche._id }, newFiche);
        updatedFiches.add(fiche.title);
      }
    }
    
    migratedCount = updatedFiches.size;
    if (migratedCount > 0) {
        console.log('\nUpdated fiches:');
        updatedFiches.forEach(title => console.log(`  - ${title}`));
    }
    console.log(`\n✅ Database URL migration completed. Total unique fiches updated: ${migratedCount}`);

  } catch (error) {
    console.error('❌ An error occurred during database URL migration:', error);
  } finally {
     const client = await clientPromise;
     await client.close();
  }
}

migrateDbUrls();
