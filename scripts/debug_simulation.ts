import clientPromise from '../server/mongo.js';

async function run() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  const users = db.collection('users');

  // Recherche par nom d'utilisateur ou email contenant 'rbphar'
  const user = await users.findOne({
    $or: [{ username: /rbphar/i }, { email: /rbphar/i }],
  });

  if (!user) {
    console.log("Utilisateur 'rbphar' non trouvé.");
    process.exit(0);
  }

  console.log('Utilisateur trouvé :', user.email);

  const simulations = (user.simulationHistory || []) as any[];
  // On cherche la dernière simulation sur l'angine
  const angineSim = [...simulations]
    .reverse()
    .find((s: any) => s.topic && s.topic.toLowerCase().includes('angine'));

  if (!angineSim) {
    console.log("Aucune simulation sur l'angine trouvée pour cet utilisateur.");
    console.log(
      'Dernières simulations :',
      simulations.slice(-5).map((s: any) => s.topic),
    );
    process.exit(0);
  }

  console.log('--- Détails de la Simulation ---');
  console.log('Sujet :', angineSim.topic);
  console.log('Score :', angineSim.score, '%');
  console.log('Feedback :', angineSim.feedback);
  console.log('\n--- Historique de la Discussion ---');
  angineSim.conversationHistory.forEach((msg: any) => {
    console.log(`[${msg.role.toUpperCase()}]: ${msg.text}`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
