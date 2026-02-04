// find_user_email.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get the first and last name from command-line arguments
const firstName = process.argv[2];
const lastName = process.argv[3];

if (!firstName || !lastName) {
  console.error('Erreur : Veuillez fournir le prénom et le nom en arguments.');
  console.log('Usage : node find_user_email.js <prénom> <nom>');
  process.exit(1);
}

// Get the connection string from environment variables
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('Erreur : La variable d\'environnement MONGO_URI n\'est pas définie.');
  console.error('Veuillez la définir dans un fichier .env à la racine du projet.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function findUser() {
  try {
    await client.connect();
    console.log('Connecté à la base de données MongoDB...');

    const db = client.db('pharmia'); // Assuming the database name is 'pharmia'
    const usersCollection = db.collection('users');

    // Create a case-insensitive regex for the names
    const query = {
      firstName: { $regex: `^${firstName}$`, $options: 'i' },
      lastName: { $regex: `^${lastName}$`, $options: 'i' },
    };

    console.log(`Recherche de l'utilisateur : ${firstName} ${lastName}...`);

    const user = await usersCollection.findOne(query);

    if (user) {
      console.log('----------------------------------------');
      console.log('Utilisateur trouvé :');
      console.log(`  Nom : ${user.firstName} ${user.lastName}`);
      console.log(`  Email : ${user.email}`);
      console.log('----------------------------------------');
    } else {
      console.log(`Aucun utilisateur trouvé avec le nom "${firstName} ${lastName}".`);
    }
  } catch (err) {
    console.error('Une erreur est survenue :', err);
  } finally {
    await client.close();
    console.log('Connexion à la base de données fermée.');
  }
}

findUser();