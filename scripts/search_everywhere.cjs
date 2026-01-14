
const { MongoClient } = require('mongodb');

const MONGO_URL = "mongodb://mongo:YoEfFXGVQwTTQlnwwPYRKwdIrgEqXrNp@centerbeam.proxy.rlwy.net:33803";

async function searchEverywhere() {
    const client = new MongoClient(MONGO_URL);
    try {
        await client.connect();
        const dbs = ['pharmia', 'test'];
        
        for (const dbName of dbs) {
            const db = client.db(dbName);
            const collections = await db.listCollections({ name: 'users' }).toArray();
            
            if (collections.length > 0) {
                const users = await db.collection('users').find({
                    $or: [
                        { firstName: /Radhi/i },
                        { lastName: /Darghouth/i },
                        { email: /Radhi/i },
                        { email: /Darghouth/i }
                    ]
                }).toArray();
                
                console.log(`Recherche dans ${dbName}.users : ${users.length} résultat(s)`);
                users.forEach(u => console.log(`- [${dbName}] ID: ${u._id}, Nom: ${u.firstName} ${u.lastName}, Email: ${u.email}`));
            }
        }
    } catch (error) {
        console.error('Erreur :', error);
    } finally {
        await client.close();
    }
}

searchEverywhere();
