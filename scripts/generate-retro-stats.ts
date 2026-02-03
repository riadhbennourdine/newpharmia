import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { User, MemoFiche, UserRole } from '../types';

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('Erreur : La variable d\'environnement MONGO_URL est manquante.');
  process.exit(1);
}

async function generateRetrospectiveStats() {
  console.log('Connexion à la base de données...');
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');
    const memofichesCollection = db.collection<MemoFiche>('memofiches');

    console.log('Analyse des données en cours, veuillez patienter...');

    // 1. Nombre d'utilisateurs par rôle
    console.log('\n--- Statistiques sur les utilisateurs ---');
    const usersByRole = await usersCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    console.log('Répartition des utilisateurs par rôle :');
    usersByRole.forEach(role => {
      console.log(`- ${role._id || 'Non défini'}: ${role.count}`);
    });

    // 2. Inscriptions par mois
    const registrationsByMonth = await usersCollection.aggregate([
      {
        $match: {
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();
    console.log('\nÉvolution des inscriptions par mois :');
    registrationsByMonth.forEach(item => {
      console.log(`- ${item._id.year}-${String(item._id.month).padStart(2, '0')}: ${item.count} nouvelles inscriptions`);
    });

    // 3. Engagement sur les mémofiches
    console.log('\n--- Statistiques sur les Mémofiches ---');
    const ficheReads = await usersCollection.aggregate([
      { $unwind: '$readFiches' },
      { $group: { _id: null, totalReads: { $sum: 1 } } }
    ]).toArray();
    const totalReads = ficheReads.length > 0 ? ficheReads[0].totalReads : 0;
    console.log(`Nombre total de lectures de fiches: ${totalReads}`);

    // 4. Top 10 des fiches les plus lues
    const topFiches = await usersCollection.aggregate([
      { $unwind: '$readFiches' },
      { $group: { _id: '$readFiches.ficheId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'memofiches',
          localField: '_id',
          foreignField: 'id',
          as: 'ficheDetails'
        }
      },
       { $unwind: '$ficheDetails' },
    ]).toArray();

    if (topFiches.length > 0) {
        console.log('\nTop 10 des mémofiches les plus consultées :');
        topFiches.forEach((fiche, index) => {
            console.log(`${index + 1}. "${fiche.ficheDetails.title}" - ${fiche.count} lectures`);
        });
    } else {
        console.log('\nAucune donnée de lecture de mémofiche trouvée.');
    }

  } catch (error) {
    console.error('Une erreur est survenue lors de la génération des statistiques :', error);
  } finally {
    await client.close();
    console.log('\nConnexion à la base de données fermée.');
  }
}

generateRetrospectiveStats();
