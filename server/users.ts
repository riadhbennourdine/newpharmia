import express from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    usersCollection: db.collection<User>('users'),
  };
}

// Get all managers (admins and formateurs)
router.get('/managers', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const managers = await usersCollection.find({ role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] } }).toArray();
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gestionnaires.", error });
  }
});

// Get preparateurs for a group
router.get('/groups/:id/preparateurs', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find({ groupId: new ObjectId(req.params.id), role: UserRole.PREPARATEUR }).toArray();
        res.json(preparateurs);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des préparateurs.", error });
    }
});

// Get user by email
router.get('/by-email/:email', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const user = await usersCollection.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur.", error });
  }
});

export default router;
