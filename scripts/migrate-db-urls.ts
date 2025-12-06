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
  const client = await clientPromise;
  let db;
  try {
    db = client.db('pharmia');
    const memofichesCollection = db.collection<CaseStudy>('memofiches');

    console.log('Starting migration of image URLs in MongoDB...');

    const cursor = memofichesCollection.find({});
    let migratedCount = 0;
    const updatedFiches = new Set<string>();

    for await (const fiche of cursor) {
      const updateOps: any = {};
      let hasUpdate = false;

      // Deep copy sections for safe mutation
      const newMemoSections = fiche.memoSections ? JSON.parse(JSON.stringify(fiche.memoSections)) : undefined;
      const newCustomSections = fiche.customSections ? JSON.parse(JSON.stringify(fiche.customSections)) : undefined;

      // 1. Migrate coverImageUrl
      const newCoverUrl = transformUrl(fiche.coverImageUrl || '');
      if (newCoverUrl) {
        updateOps.coverImageUrl = newCoverUrl;
        hasUpdate = true;
        console.log(`- [${fiche.title}] Migrating coverImageUrl: ${fiche.coverImageUrl} -> ${newCoverUrl}`);
      }

      // 2. Migrate infographicImageUrl
      const newInfographicUrl = transformUrl(fiche.infographicImageUrl || '');
      if (newInfographicUrl) {
        updateOps.infographicImageUrl = newInfographicUrl;
        hasUpdate = true;
        console.log(`- [${fiche.title}] Migrating infographicImageUrl: ${fiche.infographicImageUrl} -> ${newInfographicUrl}`);
      }
      
      // 3. Migrate images within rich content sections
      const migrateSectionContent = (sections: MemoFicheSection[] | undefined): boolean => {
        let sectionUpdated = false;
        if (!sections) return false;
        sections.forEach(section => {
          if (section.content) {
            section.content.forEach((item: MemoFicheSectionContent) => {
              if (item.type === 'image' && item.value) {
                const newContentUrl = transformUrl(item.value);
                if (newContentUrl) {
                  console.log(`- [${fiche.title}] Migrating image in section "${section.title}": ... -> ${newContentUrl}`);
                  item.value = newContentUrl;
                  sectionUpdated = true;
                }
              }
            });
          }
        });
        return sectionUpdated;
      };

      if (migrateSectionContent(newMemoSections)) {
        updateOps.memoSections = newMemoSections;
        hasUpdate = true;
      }
      if (migrateSectionContent(newCustomSections)) {
        updateOps.customSections = newCustomSections;
        hasUpdate = true;
      }

      // 4. Update the document if any changes were made
      if (hasUpdate) {
        await memofichesCollection.updateOne({ _id: fiche._id }, { $set: updateOps });
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
     if (client) {
       await client.close();
     }
  }
}

migrateDbUrls();
