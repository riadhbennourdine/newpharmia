import express from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from './authMiddleware.js';

console.log('server/users.ts: Initializing users router.');

const adminRouter = express.Router();
const nonAdminRouter = express.Router();

async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    usersCollection: db.collection<User>('users'),
  };
}

// ===============================================
// NON-ADMIN ROUTES
// ===============================================

nonAdminRouter.get('/pharmacists', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const pharmacists = await usersCollection.find({ role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } }).toArray();
        res.json(pharmacists);
    } catch (error) {
        console.error('Error fetching pharmacists:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des pharmaciens.' });
    }
});

nonAdminRouter.get('/preparateurs', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find({ role: UserRole.PREPARATEUR }).toArray();
        res.json(preparateurs);
    } catch (error) {
        console.error('Error fetching preparateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des préparateurs.' });
    }
});

nonAdminRouter.get('/subscribers', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const subscribers = await usersCollection.find({
            role: UserRole.PHARMACIEN
        }).toArray();
        res.json(subscribers);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des abonnés.' });
    }
});

// Get all managers (admins and formateurs)
nonAdminRouter.get('/managers', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const managers = await usersCollection.find({ role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] } }).toArray();
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gestionnaires.", error });
  }
});

// Get preparateurs for a group
nonAdminRouter.get('/groups/:id/preparateurs', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find({ groupId: new ObjectId(req.params.id), role: UserRole.PREPARATEUR }).toArray();
        res.json(preparateurs);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des préparateurs.", error });
    }
});

// Get user by email
nonAdminRouter.get('/by-email/:email', async (req, res) => {
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

nonAdminRouter.get('/:userId', async (req, res) => {
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

        res.json(user);

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

nonAdminRouter.put('/preparateurs/:preparateurId/assign-pharmacist', async (req, res) => {
    try {
        const { preparateurId } = req.params;
        const { pharmacistId } = req.body;

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(preparateurId)) {
            return res.status(400).json({ message: 'Invalid preparateurId.' });
        }

        if (pharmacistId && !ObjectId.isValid(pharmacistId)) {
            return res.status(400).json({ message: 'Invalid pharmacistId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(preparateurId) as any },
            { $set: { pharmacistId: pharmacistId ? new ObjectId(pharmacistId) : undefined } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Preparateur not found.' });
        }

        res.json({ message: 'Pharmacist assigned successfully.' });
    } catch (error) {
        console.error('Error assigning pharmacist:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'assignation du pharmacien.' });
    }
});

nonAdminRouter.get('/pharmacists/:pharmacistId/team', async (req, res) => {
    try {
        const { pharmacistId } = req.params;
        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(pharmacistId)) {
            return res.status(400).json({ message: 'Invalid pharmacistId.' });
        }

        const { usersCollection } = await getCollections();

        const team = await usersCollection.find({ role: UserRole.PREPARATEUR, pharmacistId: new ObjectId(pharmacistId) as any }).toArray();
        res.json(team);
    } catch (error) {
        console.error('Error fetching pharmacist team:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de l\'équipe.' });
    }
});

nonAdminRouter.put('/:userId/subscription', async (req, res) => {
    try {
        const { userId } = req.params;
        const { subscriptionEndDate, planName } = req.body;

        if (!subscriptionEndDate) {
            return res.status(400).json({ message: 'subscriptionEndDate is required.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const newSubscriptionEndDate = new Date(subscriptionEndDate);
        const hasActiveSubscription = newSubscriptionEndDate > new Date();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) as any },
            { 
                $set: { 
                    subscriptionEndDate: newSubscriptionEndDate,
                    planName: planName,
                    hasActiveSubscription: hasActiveSubscription
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
        res.json(updatedUser);

    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'abonnement.' });
    }
});

nonAdminRouter.get('/:userId/read-fiches', async (req, res) => {
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

        res.json({ readFiches: user.readFiches || [] });

    } catch (error) {
        console.error('Error fetching read fiches:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

nonAdminRouter.get('/:userId/quiz-history', async (req, res) => {
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

nonAdminRouter.post('/:userId/read-fiches', async (req, res) => {
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

        // Only add the fiche to the set if it's not already there
        await usersCollection.updateOne(
            { _id: new ObjectId(userId), 'readFiches.ficheId': { $ne: ficheId } },
            { $push: { readFiches: { ficheId: ficheId, readAt: new Date() } } as any }
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

nonAdminRouter.post('/:userId/quiz-history', async (req, res) => {
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

// ===============================================
// ADMIN ROUTES
// ===============================================

// Get all users (with optional role filter for admin)
adminRouter.get('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const { role } = req.query;
        let query: any = {};

        if (role && typeof role === 'string' && Object.values(UserRole).includes(role as UserRole)) {
            query.role = role;
        }

        const users = await usersCollection.find(query).toArray();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateurs.' });
    }
});

adminRouter.put('/:userId/role', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!role || !Object.values(UserRole).includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) as any },
            { $set: { role: role } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User role updated successfully.' });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du rôle de l\'utilisateur.' });
    }
});

// Assign a memofiche to a user
adminRouter.post('/:userId/assign-fiche', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
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

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { assignedFichesToUser: { ficheId, assignedAt: new Date() } } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: 'Fiche already assigned to this user.' });
        }

        res.status(200).json({ message: 'Mémofiche assignée avec succès à l\'utilisateur.' });
    } catch (error) {
        console.error('Error assigning fiche to user:', error);
        res.status(500).json({ message: 'Erreur lors de l\'assignation de la mémofiche à l\'utilisateur.', error });
    }
});


export { adminRouter, nonAdminRouter };
