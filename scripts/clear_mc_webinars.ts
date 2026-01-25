import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL is not defined in .env');
  process.exit(1);
}

const clearMasterClasses = async () => {
  let client: MongoClient | undefined;
  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    const webinarsCollection = db.collection('webinars');

    const targetGroup = 'MASTER CLASS OFFICINE 2026';
    const protectedGroup = 'CROP Tunis';

    // Count protected group before deletion
    const cropCountBefore = await webinarsCollection.countDocuments({
      group: protectedGroup,
    });
    console.log(
      `[SAFETY CHECK] Found ${cropCountBefore} webinars in protected group "${protectedGroup}".`,
    );

    console.log(`Deleting webinars ONLY with group: "${targetGroup}"...`);

    // STRICT DELETION
    const result = await webinarsCollection.deleteMany({ group: targetGroup });

    console.log(`Deleted ${result.deletedCount} existing Master Classes.`);

    // Verify protected group after deletion
    const cropCountAfter = await webinarsCollection.countDocuments({
      group: protectedGroup,
    });

    if (cropCountBefore === cropCountAfter) {
      console.log(
        `[SUCCESS] Protected group "${protectedGroup}" remains untouched (${cropCountAfter} webinars).`,
      );
    } else {
      console.error(
        `[WARNING] Mismatch in protected group count! Before: ${cropCountBefore}, After: ${cropCountAfter}`,
      );
    }
  } catch (error) {
    console.error('Error clearing Master Classes:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
};

(async () => {
  await clearMasterClasses();
})();
