import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const performCleanup = async () => {
  if (!MONGO_URL) return;
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db('pharmia');
  const collection = db.collection('webinars');

  const targetGroup = 'MASTER CLASS OFFICINE 2026';
  const protectedGroup = 'CROP Tunis';

  // Double-check safety
  const protectedCountBefore = await collection.countDocuments({
    group: protectedGroup,
  });
  console.log(
    `[SAFETY CHECK] Protected group "${protectedGroup}" has ${protectedCountBefore} items.`,
  );

  // Perform deletion
  // Delete ONLY from 'MASTER CLASS OFFICINE 2026' AND where title DOES NOT start with 'MC' followed by digit
  const result = await collection.deleteMany({
    group: targetGroup,
    title: { $not: /^MC\d+/ },
  });

  console.log(
    `[SUCCESS] Deleted ${result.deletedCount} old webinars from group "${targetGroup}".`,
  );

  // Verify safety post-deletion
  const protectedCountAfter = await collection.countDocuments({
    group: protectedGroup,
  });
  console.log(
    `[SAFETY CHECK] Protected group "${protectedGroup}" now has ${protectedCountAfter} items.`,
  );

  if (protectedCountBefore === protectedCountAfter) {
    console.log('Integrity of CROP Tunis confirmed.');
  } else {
    console.error('WARNING: Discrepancy in CROP Tunis count!');
  }

  await client.close();
};

performCleanup();
