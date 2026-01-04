import clientPromise from '../server/mongo.js';

async function checkCampaigns() {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const campaigns = await db.collection('campaigns').find({}).toArray();
        console.log(JSON.stringify(campaigns, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCampaigns();