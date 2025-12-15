import express from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from './authMiddleware.js';

console.log('server/users.ts: Initializing users router.');

const router = express.Router();

router.get('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateurs.' });
    }
});

router.get('/pharmacists', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const pharmacists = await usersCollection.find({ role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } }).toArray();
        res.json(pharmacists);
    } catch (error) {
        console.error('Error fetching pharmacists:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des pharmaciens.' });
    }
});

router.get('/preparateurs', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find({ role: UserRole.PREPARATEUR }).toArray();
        res.json(preparateurs);
    } catch (error) {
        console.error('Error fetching preparateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des préparateurs.' });
    }
});

router.get('/subscribers', async (req, res) => {
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

async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    usersCollection: db.collection<User>('users'),
    memofichesCollection: db.collection('memofiches'),
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

// New endpoint to get user by name
router.get('/by-name', async (req, res) => {
    try {
        const { firstName, lastName } = req.query;

        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }

        const { usersCollection } = await getCollections();

        // Perform a case-insensitive search
        const user = await usersCollection.findOne({
            firstName: { $regex: new RegExp(firstName as string, 'i') },
            lastName: { $regex: new RegExp(lastName as string, 'i') }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Exclude sensitive information like passwordHash
        const { passwordHash, ...userWithoutHash } = user;
        res.json(userWithoutHash);

    } catch (error) {
        console.error('Error fetching user by name:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.get('/:userId/learning-journey', authenticateToken, checkRole([UserRole.ADMIN, UserRole.PHARMACIEN, UserRole.FORMATEUR, UserRole.ADMIN_WEBINAR]), async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query; // Get date filters from query params
        const { usersCollection, memofichesCollection } = await getCollections();
        const { ObjectId } = await import('mongodb');

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        let readFiches = user.readFiches || [];
        let quizHistory = user.quizHistory || [];
        // Note: viewedMediaIds usually doesn't have a timestamp in the current schema based on types.ts.
        // If it's just an array of strings, we can't filter it by date. 
        // We will proceed with filtering what we can.

        // Apply date filtering
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate as string) : new Date(0); // Default to epoch if no start date
            const end = endDate ? new Date(endDate as string) : new Date(); // Default to now if no end date
            // Adjust end date to include the full day
            end.setHours(23, 59, 59, 999);

            readFiches = readFiches.filter(f => {
                const date = new Date(f.readAt);
                return date >= start && date <= end;
            });

            quizHistory = quizHistory.filter(q => {
                const date = new Date(q.completedAt);
                return date >= start && date <= end;
            });
        }

        const readFicheIds = readFiches.map(f => {
            try {
                return new ObjectId(f.ficheId);
            } catch (e) {
                return null;
            }
        }).filter(id => id !== null);

        const quizIds = quizHistory.map(q => {
            try {
                return new ObjectId(q.quizId);
            } catch (e) {
                return null;
            }
        }).filter(id => id !== null);

        const allRelatedIds = [...readFicheIds, ...quizIds];
        
        // Fetch titles for all related fiches
        let ficheDetailsMap = new Map();
        if (allRelatedIds.length > 0) {
            const fiches = await memofichesCollection.find(
                { _id: { $in: allRelatedIds } },
                { projection: { title: 1 } }
            ).toArray();
            
            fiches.forEach(f => {
                ficheDetailsMap.set(f._id.toString(), f.title);
            });
        }

        const enrichedReadFiches = readFiches.map(f => ({
            ...f,
            title: ficheDetailsMap.get(f.ficheId) || 'Fiche inconnue'
        }));

        const enrichedQuizHistory = quizHistory.map(q => ({
            ...q,
            title: ficheDetailsMap.get(q.quizId) || 'Quiz inconnu'
        }));

        let averageQuizScore = 0;
        if (quizHistory.length > 0) {
            const totalScores = quizHistory.reduce((sum, q) => sum + (q.score || 0), 0);
            averageQuizScore = Math.round(totalScores / quizHistory.length);
        } else if ((user.quizHistory || []).length > 0 && (startDate || endDate)) {
            // If filtering resulted in no quizzes, but the user has history, average is 0 for this period.
            averageQuizScore = 0;
        }

        res.json({
            readFiches: enrichedReadFiches,
            quizHistory: enrichedQuizHistory,
            viewedMediaIds: user.viewedMediaIds || [], // Returning all as we can't filter yet
            averageQuizScore: averageQuizScore
        });

    } catch (error) {
        console.error('Error fetching learning journey:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du parcours.' });
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

router.get('/:userId', async (req, res) => {
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

router.put('/preparateurs/:preparateurId/assign-pharmacist', async (req, res) => {
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

router.get('/pharmacists/:pharmacistId/team', async (req, res) => {
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

router.put('/:userId/subscription', async (req, res) => {
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

        res.json({ readFiches: user.readFiches || [] });

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

// New endpoint to get user by name
router.get('/by-name', async (req, res) => {
    try {
        const { firstName, lastName } = req.query;

        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }

        const { usersCollection } = await getCollections();

        // Perform a case-insensitive search
        const user = await usersCollection.findOne({
            firstName: { $regex: new RegExp(firstName as string, 'i') },
            lastName: { $regex: new RegExp(lastName as string, 'i') }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Exclude sensitive information like passwordHash
        const { passwordHash, ...userWithoutHash } = user;
        res.json(userWithoutHash);

    } catch (error) {
        console.error('Error fetching user by name:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.post('/:userId/read-fiches', async (req, res) => {
    console.log('Attempting to reach /api/users/:userId/read-fiches (POST). Params:', req.params);    try {
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

router.put('/:userId/role', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
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

router.get('/expired-trial', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const now = new Date();
        console.log(`[DEBUG] /expired-trial: Current date (now): ${now.toISOString()}`);

        const query = {
            trialExpiresAt: { $lt: now },
            $or: [
                { hasActiveSubscription: { $exists: false } },
                { hasActiveSubscription: false }
            ]
        };
        console.log(`[DEBUG] /expired-trial: MongoDB Query: ${JSON.stringify(query)}`);

        const users = await usersCollection.find(query).toArray();
        console.log(`[DEBUG] /expired-trial: Found ${users.length} users matching criteria.`);
        
        res.json(users);
    } catch (error) {
        console.error('Error fetching users with expired trials:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateurs.' });
    }
});

router.put('/:userId/credits', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const { credits } = req.body;

        if (typeof credits !== 'number' || credits < 0) {
            return res.status(400).json({ message: 'Credits must be a non-negative number.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { masterClassCredits: credits } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User credits updated successfully.', credits });

    } catch (error) {
        console.error('Error updating user credits:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour des crédits.' });
    }
});

export default router;
