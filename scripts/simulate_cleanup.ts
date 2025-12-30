import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const simulateCleanup = async () => {
    if (!MONGO_URL) return;
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db('pharmia');
    const collection = db.collection('webinars');

    const targetGroup = 'MASTER CLASS OFFICINE 2026';
    const protectedGroup = 'CROP Tunis';

    // 1. Verify protected group safety
    const protectedCount = await collection.countDocuments({ group: protectedGroup });
    console.log(`[SAFETY] There are ${protectedCount} webinars in protected group "${protectedGroup}". They will NOT be touched.\n`);

    // 2. Identify old Master Classes to delete
    // Logic: In group 'MASTER CLASS OFFICINE 2026', delete items that DO NOT start with "MC" followed by a digit.
    const query = {
        group: targetGroup,
        title: { $not: /^MC\d+/ }
    };

    const toDelete = await collection.find(query).project({ title: 1, date: 1 }).toArray();

    console.log(`[TARGET] Found ${toDelete.length} "old" webinars to DELETE in group "${targetGroup}":`);
    if (toDelete.length > 0) {
        console.log('(First 5 examples):');
        toDelete.slice(0, 5).forEach(w => console.log(`  - DELETE: ${w.title}`));
        console.log('  ...');
    }

    // 3. Verify what remains in the target group (The new ones)
    const toKeep = await collection.find({ group: targetGroup, title: /^MC\d+/ }).countDocuments();
    console.log(`\n[KEEP] Would keep ${toKeep} new webinars in group "${targetGroup}" (starting with MC...).`);

    await client.close();
};

simulateCleanup();
