import express from 'express';
import { User, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole, AuthenticatedRequest } from './authMiddleware.js';

console.log('server/users.ts: Initializing users router.');

const router = express.Router();

// Public route to get pharmacists for registration (no auth required)
router.get('/public/pharmacists', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const pharmacists = await usersCollection.find(
            { role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } },
            { projection: { _id: 1, firstName: 1, lastName: 1, city: 1, email: 1 } }
        ).toArray();
        res.json(pharmacists);
    } catch (error) {
        console.error('Error fetching pharmacists for registration:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des pharmaciens.' });
    }
});

router.get('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const users = await usersCollection.find({}, { projection: { passwordHash: 0 } }).toArray();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des utilisateurs.' });
    }
});

router.get('/pharmacists', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const pharmacists = await usersCollection.find(
            { role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } },
            { projection: { passwordHash: 0 } }
        ).toArray();
        res.json(pharmacists);
    } catch (error) {
        console.error('Error fetching pharmacists:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des pharmaciens.' });
    }
});

router.get('/preparateurs', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find(
            { role: UserRole.PREPARATEUR },
            { projection: { passwordHash: 0 } }
        ).toArray();
        res.json(preparateurs);
    } catch (error) {
        console.error('Error fetching preparateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des préparateurs.' });
    }
});

router.get('/subscribers', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const subscribers = await usersCollection.find(
            { role: UserRole.PHARMACIEN },
            { projection: { passwordHash: 0 } }
        ).toArray();
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
router.get('/managers', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const managers = await usersCollection.find(
        { role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] } },
        { projection: { passwordHash: 0 } }
    ).toArray();
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des gestionnaires.", error });
  }
});

// Get preparateurs for a group
router.get('/groups/:id/preparateurs', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const user = req.user!;
        const { id } = req.params;

        // Security check: must be admin OR part of the group
        if (user.role !== UserRole.ADMIN && user.groupId?.toString() !== id) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const { usersCollection } = await getCollections();
        const preparateurs = await usersCollection.find(
            { groupId: new ObjectId(id), role: UserRole.PREPARATEUR },
            { projection: { passwordHash: 0 } }
        ).toArray();
        res.json(preparateurs);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des préparateurs.", error });
    }
});

// Get user by email
router.get('/by-email/:email', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const user = await usersCollection.findOne(
        { email: req.params.email },
        { projection: { passwordHash: 0 } }
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur.", error });
  }
});

// New endpoint to get user by name
router.get('/by-name', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
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
        }, { projection: { passwordHash: 0 } });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);

    } catch (error) {
        console.error('Error fetching user by name:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.get('/latest', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const latestUsers = await usersCollection.find({ role: UserRole.PHARMACIEN })
            .sort({ createdAt: -1 })
            .limit(10)
            .project({ _id: 1, firstName: 1, lastName: 1, email: 1, role: 1, city: 1, phoneNumber: 1, createdAt: 1 })
            .toArray();
        res.json(latestUsers);
    } catch (error) {
        console.error('Error fetching latest users:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des derniers inscrits.' });
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
            
            // Adjust dates with a buffer to handle Timezone differences (e.g. UTC+1)
            // Subtract 3 hours from start date to catch events that happened at "local midnight" (e.g. 23:00 UTC prev day)
            start.setHours(start.getHours() - 3);

            // Set end date to end of day, plus buffer
            end.setHours(23, 59, 59, 999);
            end.setHours(end.getHours() + 3);

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

        // Calculate mastery by category
        const masteryByCategory: Record<string, { totalScore: number, count: number, system: string }> = {};
        
        // We need to fetch the full memofiche objects to get their categories/systems
        const fullFiches = await memofichesCollection.find(
            { _id: { $in: allRelatedIds } },
            { projection: { title: 1, theme: 1, system: 1 } }
        ).toArray();

        const ficheInfoMap = new Map();
        fullFiches.forEach(f => {
            ficheInfoMap.set(f._id.toString(), { 
                title: f.title, 
                theme: f.theme || 'Général', 
                system: f.system || 'Autre' 
            });
        });

        const enrichedQuizHistory = quizHistory.map(q => {
            const info = ficheInfoMap.get(q.quizId) || { title: 'Quiz inconnu', theme: 'Général', system: 'Autre' };
            
            // Aggregate for mastery
            const category = info.system;
            if (!masteryByCategory[category]) {
                masteryByCategory[category] = { totalScore: 0, count: 0, system: category };
            }
            masteryByCategory[category].totalScore += (q.score || 0);
            masteryByCategory[category].count += 1;

            return {
                ...q,
                title: info.title,
                theme: info.theme,
                system: info.system
            };
        });

        const skillsHeatmap = Object.keys(masteryByCategory).map(cat => ({
            category: cat,
            score: Math.round(masteryByCategory[cat].totalScore / masteryByCategory[cat].count),
            count: masteryByCategory[cat].count
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
            viewedMediaIds: user.viewedMediaIds || [],
            averageQuizScore: averageQuizScore,
            skillsHeatmap: skillsHeatmap
        });

    } catch (error) {
        console.error('Error fetching learning journey:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du parcours.' });
    }
});

router.get('/:userId/quiz-history', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.params;
        const authUser = req.user!;

        if (authUser.role !== UserRole.ADMIN && authUser._id.toString() !== userId) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ quizHistory: user.quizHistory || [] });

    } catch (error) {
        console.error('Error fetching quiz history:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.get('/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.params;
        const authUser = req.user!;

        // Security check: Self OR Admin OR Group Pharmacist
        if (authUser.role !== UserRole.ADMIN && authUser._id.toString() !== userId) {
             // If it's not self/admin, we could check group membership here if needed
             return res.status(403).json({ message: 'Accès refusé.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();
        const user = await usersCollection.findOne(
            { _id: new ObjectId(userId) },
            { projection: { passwordHash: 0 } }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.put('/preparateurs/:preparateurId/assign-pharmacist', authenticateToken, checkRole([UserRole.ADMIN, UserRole.PHARMACIEN]), async (req: AuthenticatedRequest, res) => {
    try {
        const { preparateurId } = req.params;
        const { pharmacistId } = req.body;
        const authUser = req.user!;

        // If pharmacist, can only assign to self
        let effectivePharmacistId = pharmacistId;
        if (authUser.role === UserRole.PHARMACIEN) {
            effectivePharmacistId = authUser._id.toString();
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(preparateurId)) {
            return res.status(400).json({ message: 'Invalid preparateurId.' });
        }

        if (effectivePharmacistId && !ObjectId.isValid(effectivePharmacistId)) {
            return res.status(400).json({ message: 'Invalid pharmacistId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(preparateurId) },
            { $set: { pharmacistId: effectivePharmacistId ? new ObjectId(effectivePharmacistId) : undefined } }
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

router.get('/pharmacists/:pharmacistId/team', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { pharmacistId } = req.params;
        const authUser = req.user!;

        if (authUser.role !== UserRole.ADMIN && authUser._id.toString() !== pharmacistId) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(pharmacistId)) {
            return res.status(400).json({ message: 'Invalid pharmacistId.' });
        }

        const { usersCollection } = await getCollections();

        const team = await usersCollection.find(
            { role: UserRole.PREPARATEUR, pharmacistId: new ObjectId(pharmacistId) },
            { projection: { passwordHash: 0 } }
        ).toArray();
        res.json(team);
    } catch (error) {
        console.error('Error fetching pharmacist team:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de l\'équipe.' });
    }
});

router.put('/:userId/subscription', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
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
            { _id: new ObjectId(userId) },
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

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0 } });
        res.json(updatedUser);

    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de l\'abonnement.' });
    }
});

router.get('/:userId/read-fiches', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.params;
        const authUser = req.user!;

        if (authUser.role !== UserRole.ADMIN && authUser._id.toString() !== userId) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

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

router.post('/:userId/read-fiches', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.params;
        const { ficheId } = req.body;
        const authUser = req.user!;

        if (authUser._id.toString() !== userId) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

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

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0 } });
        res.json(updatedUser);

    } catch (error) {
        console.error('Error marking fiche as read:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.post('/:userId/quiz-history', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.params;
        const { quizId, score, completedAt } = req.body;
        const authUser = req.user!;

        if (authUser._id.toString() !== userId) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

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
            { _id: new ObjectId(userId) },
            { $push: { quizHistory: quizResult } as any }
        );

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0 } });
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

router.put('/:userId/profile', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;
        const { firstName, lastName } = req.body;

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { firstName, lastName } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        res.json({ message: 'User profile updated successfully.', user: updatedUser });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du profil.' });
    }
});

router.delete('/:userId', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { userId } = req.params;

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId.' });
        }

        const { usersCollection } = await getCollections();

        const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User deleted successfully.' });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de l\'utilisateur.' });
    }
});

export default router;
