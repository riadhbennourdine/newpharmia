// scripts/inspect-image-urls.ts

import clientPromise from '../server/mongo.js';
import { CaseStudy } from '../types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function inspectUrls() {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const memofichesCollection = db.collection<CaseStudy>('memofiches');

    console.log('Connecting to database to inspect image URLs...');

    // Find up to 5 documents that have a coverImageUrl or infographicImageUrl
    const fichesWithImages = await memofichesCollection.find({
      $or: [
        { coverImageUrl: { $exists: true, $ne: '' } },
        { infographicImageUrl: { $exists: true, $ne: '' } },
        { "memoSections.content.type": "image" },
        { "customSections.content.type": "image" },
      ]
    }).limit(5).toArray();

    if (fichesWithImages.length === 0) {
      console.log('Could not find any memofiches with image URLs to inspect.');
      return;
    }

    console.log(`
Found ${fichesWithImages.length} sample memofiches. Inspecting URLs...`);
    console.log('--------------------------------------------------');

    fichesWithImages.forEach((fiche, index) => {
      console.log(`
[Fiche ${index + 1}] Title: ${fiche.title} (_id: ${fiche._id})`);
      
      if (fiche.coverImageUrl) {
        console.log(`  - coverImageUrl: "${fiche.coverImageUrl}"`);
      }
      if (fiche.infographicImageUrl) {
        console.log(`  - infographicImageUrl: "${fiche.infographicImageUrl}"`);
      }

      const inspectContent = (sections: any[] | undefined, sectionName: string) => {
        if (!sections) return;
        sections.forEach(section => {
          if (section.content) {
            section.content.forEach((item: any) => {
              if (item.type === 'image' && item.value) {
                console.log(`  - Image in section "${section.title || sectionName}": "${item.value}"`);
              }
            });
          }
        });
      };

      inspectContent(fiche.memoSections, 'memoSections');
      inspectContent(fiche.customSections, 'customSections');
    });

    console.log('--------------------------------------------------');
    console.log('Inspection complete. Please copy the log output above.');

  } catch (error) {
    console.error('❌ An error occurred during inspection:', error);
  } finally {
    // No need to close client with clientPromise
  }
}

inspectUrls();
