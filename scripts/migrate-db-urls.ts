// scripts/migrate-db-urls.ts

import clientPromise from '../server/mongo.js';
import { CaseStudy, MemoFicheSection, MemoFicheSectionContent } from '../types.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the old pattern and new pattern
const OLD_URL_PREFIX = '/api/ftp/view?filePath=';
const NEW_URL_PREFIX = '/uploads';

// Regex to extract the file path from the old URL
const FTP_FILE_PATH_REGEX = /\/api\/ftp\/view\?filePath=(.*)/;

async function migrateDbUrls() {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const memofichesCollection = db.collection<CaseStudy>('memofiches');

    console.log('Starting migration of image URLs in MongoDB...');

    const cursor = memofichesCollection.find({});
    let migratedCount = 0;

    for await (const fiche of cursor) {
      let updated = false;
      const newFiche = { ...fiche };

      // 1. Migrate coverImageUrl
      if (newFiche.coverImageUrl && newFiche.coverImageUrl.startsWith(OLD_URL_PREFIX)) {
        const match = newFiche.coverImageUrl.match(FTP_FILE_PATH_REGEX);
        if (match && match[1]) {
          newFiche.coverImageUrl = NEW_URL_PREFIX + decodeURIComponent(match[1]);
          updated = true;
          console.log(`- Migrated coverImageUrl for fiche ${newFiche._id}: ${fiche.coverImageUrl} -> ${newFiche.coverImageUrl}`);
        }
      }

      // 2. Migrate infographicImageUrl (for 'le-medicament' type)
      if (newFiche.infographicImageUrl && newFiche.infographicImageUrl.startsWith(OLD_URL_PREFIX)) {
        const match = newFiche.infographicImageUrl.match(FTP_FILE_PATH_REGEX);
        if (match && match[1]) {
          newFiche.infographicImageUrl = NEW_URL_PREFIX + decodeURIComponent(match[1]);
          updated = true;
          console.log(`- Migrated infographicImageUrl for fiche ${newFiche._id}: ${fiche.infographicImageUrl} -> ${newFiche.infographicImageUrl}`);
        }
      }

      // 3. Migrate images within memoSections and customSections (rich content)
      const migrateSectionContent = (sections: MemoFicheSection[] | undefined) => {
        if (!sections) return;
        sections.forEach(section => {
          if (section.content) {
            section.content.forEach((item: MemoFicheSectionContent) => {
              if (item.type === 'image' && item.value && item.value.startsWith(OLD_URL_PREFIX)) {
                const match = item.value.match(FTP_FILE_PATH_REGEX);
                if (match && match[1]) {
                  item.value = NEW_URL_PREFIX + decodeURIComponent(match[1]);
                  updated = true;
                  console.log(`- Migrated image in section ${section.id} for fiche ${newFiche._id}: ${OLD_URL_PREFIX}... -> ${item.value}`);
                }
              }
            });
          }
        });
      };

      migrateSectionContent(newFiche.memoSections);
      migrateSectionContent(newFiche.customSections);

      // 4. Update the document if any changes were made
      if (updated) {
        await memofichesCollection.updateOne({ _id: newFiche._id }, { $set: newFiche });
        migratedCount++;
      }
    }

    console.log(`\n✅ Database URL migration completed. Total fiches updated: ${migratedCount}`);

  } catch (error) {
    console.error('❌ An error occurred during database URL migration:', error);
  } finally {
    // client.close() - clientPromise handles connection pooling, so no need to close here.
  }
}

migrateDbUrls();
