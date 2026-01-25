import clientPromise from '../server/mongo.js';

async function debugAd() {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');

    console.log("--- 1. Searching for Memofiche 'Hémorroïdes' ---");
    // Search by title containing "Hémorroïdes"
    const fiches = await db
      .collection('memofiches')
      .find({ title: { $regex: /Hémorroïdes/i } })
      .toArray();

    if (fiches.length === 0) {
      console.log('No memofiche found!');
    } else {
      const fiche = fiches[0];
      console.log(`Found Fiche: ${fiche.title} (_id: ${fiche._id})`);

      console.log('\n--- Content: Traitement Principal ---');
      console.log(JSON.stringify(fiche.mainTreatment, null, 2));

      console.log('\n--- Content: Produits Associés ---');
      console.log(JSON.stringify(fiche.associatedProducts, null, 2));
    }

    console.log('\n--- 2. Checking Campaigns ---');
    const campaigns = await db.collection('campaigns').find({}).toArray();
    console.log(JSON.stringify(campaigns, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

debugAd();
