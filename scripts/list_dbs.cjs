
const { MongoClient } = require('mongodb');

const MONGO_URL = "mongodb://mongo:YoEfFXGVQwTTQlnwwPYRKwdIrgEqXrNp@centerbeam.proxy.rlwy.net:33803";

async function listDbs() {
    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        console.log('Bases de données disponibles :');
        dbs.databases.forEach(db => console.log(`- ${db.name}`));
        
        // On vérifie aussi s'il y a des collections dans 'pharmia'
        const dbPharmia = client.db('pharmia');
        const collections = await dbPharmia.listCollections().toArray();
        console.log('\nCollections dans la base "pharmia" :');
        collections.forEach(col => console.log(`- ${col.name}`));

    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        await client.close();
    }
}

listDbs();
