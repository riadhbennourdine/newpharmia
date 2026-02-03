
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';
import { User } from '../types';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Erreur : La variable d'environnement MONGODB_URI est manquante.");
  process.exit(1);
}

async function resetPassword() {
  const email = process.argv[2];
  let newPassword = process.argv[3]; // 'let' pour pouvoir le réassigner

  if (!email) {
    console.error('Usage: tsx scripts/admin-reset-password.ts <email> [nouveauMotDePasse]');
    console.error('Si aucun mot de passe n\'est fourni, un mot de passe aléatoire sera généré.');
    process.exit(1);
  }

  // Générer un mot de passe aléatoire si non fourni
  if (!newPassword) {
    newPassword = crypto.randomBytes(8).toString('hex');
    console.log('Aucun mot de passe fourni, génération d\'un mot de passe aléatoire...');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      console.error(`Erreur : Aucun utilisateur trouvé avec l'email "${email}".`);
      return;
    }

    console.log(`Utilisateur trouvé : ${user.firstName} ${user.lastName} (${user.email})`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: passwordHash,
          // Effacer les anciens tokens de réinitialisation pour éviter toute confusion
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        },
      }
    );

    console.log(`\nLe mot de passe pour l'utilisateur ${email} a été réinitialisé avec succès.`);
    console.log(`Nouveau mot de passe : ${newPassword}`);

  } catch (error) {
    console.error('Une erreur est survenue lors de la réinitialisation du mot de passe :', error);
  } finally {
    await client.close();
  }
}

resetPassword();
