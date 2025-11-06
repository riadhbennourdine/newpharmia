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

router.get('/:userId/read-fiches', async (req, res) => {
    console.log('Received request for /api/users/:userId/read-fiches. User ID:', req.params.userId);
    try {
        const { userId } = req.params;

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ readFicheIds: user.readFicheIds || [] });

    } catch (error) {
        console.error('Error fetching read fiches:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.get('/:userId/quiz-history', async (req, res) => {
    console.log('Attempting to reach /api/users/:userId/quiz-history. Params:', req.params);
    try {
        const { userId } = req.params;
        console.log('Inside /api/users/:userId/quiz-history. userId:', userId);

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            console.log('Invalid ObjectId for quiz-history. userId:', userId);
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            console.log('User not found for quiz-history. userId:', userId);
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ quizHistory: user.quizHistory || [] });

    } catch (error) {
        console.error('Error fetching quiz history:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.post('/:userId/read-fiches', async (req, res) => {
    console.log('Attempting to reach /api/users/:userId/read-fiches (POST). Params:', req.params);
    try {
        const { userId } = req.params;
        const { ficheId } = req.body;

        if (!ficheId) {
            return res.status(400).json({ message: 'ficheId is required.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) as any },
            { $addToSet: { readFicheIds: ficheId } as any }
        );

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update.' });
        }

        res.json(updatedUser);

    } catch (error) {
        console.error('Error marking fiche as read:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.post('/:userId/quiz-history', async (req, res) => {
    console.log('Attempting to reach /api/users/:userId/quiz-history (POST). Params:', req.params);
    try {
        const { userId } = req.params;
        const { quizId, score, completedAt } = req.body;

        if (quizId === undefined || score === undefined || completedAt === undefined) {
            return res.status(400).json({ message: 'quizId, score, and completedAt are required.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const quizResult = { quizId, score, completedAt: new Date(completedAt) };

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) as any },
            { $push: { quizHistory: quizResult } as any }
        );

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update.' });
        }

        res.json(updatedUser);

    } catch (error) {
        console.error('Error saving quiz history:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

export default router;
