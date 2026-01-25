import { MongoClient } from 'mongodb';

const MONGO_URL =
  'mongodb://mongo:YoEfFXGVQwTTQlnwwPYRKwdIrgEqXrNp@centerbeam.proxy.rlwy.net:33803';

async function searchUser() {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db('pharmia');
    const usersCollection = db.collection('users');

    const query = {
      $or: [
        { firstName: /Mariem/i },
        { lastName: /Ben Amor/i },
        { username: /Mariem/i },
      ],
    };

    const users = await usersCollection.find(query).toArray();

    if (users.length > 0) {
      console.log('Utilisateur(s) trouvé(s) :');
      users.forEach((u) => {
        console.log(
          `- ID: ${u._id}, Nom: ${u.firstName} ${u.lastName}, Email: ${u.email}, Role: ${u.role}, Username: ${u.username}`,
        );
      });
    } else {
      console.log('Aucun utilisateur trouvé au nom de Mariem Ben Amor.');
    }
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
  } finally {
    await client.close();
  }
}

searchUser();
