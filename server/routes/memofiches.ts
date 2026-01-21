import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from '../mongo.js';
import { CaseStudy, User, Group, UserRole, MemoFicheStatus } from '../../types.js';
import { authenticateToken, softAuthenticateToken, AuthenticatedRequest, checkRole } from '../authMiddleware.js';
import { indexMemoFiches, removeMemoFicheFromIndex } from '../algoliaService.js';

const router = express.Router();

router.get('/', softAuthenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const {
            page = '1',
            limit = '9',
            search = '',
            theme = 'all',
            system = 'all',
            sortBy = 'default', // 'newest'
            selectedStatus = 'all' // New query parameter for status filtering
        } = req.query as { [key: string]: string };

        const user = req.user; // Securely retrieved from token

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        // Variables to determine access
        let group: Group | null = null;
        let pharmacist: User | null = null;

        if (user) {
             // Check for group
             if (user.groupId) {
                 group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
                 if (group && group.pharmacistIds && group.pharmacistIds.length > 0) {
                     pharmacist = await usersCollection.findOne({ _id: new ObjectId(group.pharmacistIds[0]) });
                 }
             }
             
             // Fallback: Check for direct pharmacist link if not found via group
             if (!pharmacist && user.pharmacistId) {
                  pharmacist = await usersCollection.findOne({ _id: new ObjectId(user.pharmacistId) });
             }
        }

        let query: any = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            query.$or = [
                { title: searchRegex },
                { shortDescription: searchRegex }
            ];
        }

        if (theme !== 'all') {
            query.theme = theme;
        } else {
            query.theme = { $ne: "Dermatologie" };
        }
        if (system !== 'all') {
            query.system = system;
        }

        // Add status filtering based on user role and selectedStatus query param
        if (user && (user.role === UserRole.ADMIN || user.role === UserRole.FORMATEUR)) {
            if (selectedStatus !== 'all') {
                query.status = selectedStatus;
            }
        } else {
            // Other roles (Apprenant, etc.) only see PUBLISHED fiches or fiches without a status
            // EXCEPTION: Dermatologie fiches are always visible in their dedicated app if requested
            if (theme === 'Dermatologie') {
                // No status restriction for DermoGuide app
            } else {
                query.$or = [
                    { status: { $in: [MemoFicheStatus.PUBLISHED, 'Publiée'] } },
                    { status: { $exists: false } }
                ];
            }
        }

        const total = await memofichesCollection.countDocuments(query);
        const totalPages = Math.ceil(total / limitNum);

        let sortOptions: any = {};
        if (sortBy === 'newest') {
            sortOptions.creationDate = -1;
        }

        const fiches = await memofichesCollection.find(query)
            .sort(sortOptions)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .toArray();

        const fichesWithAccess = fiches.map(fiche => {
            let hasAccess = false;
            if (user) {
                if(user.role === UserRole.ADMIN || user.role === UserRole.FORMATEUR) {
                    hasAccess = true;
                } else {
                    const createdAt = new Date(user.createdAt);
                    const trialExpiresAt = user.trialExpiresAt ? new Date(user.trialExpiresAt) : (createdAt ? new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null);

                    // Check personal subscription first
                    const hasPersonalSubscription = user.hasActiveSubscription && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();

                    // Check linked pharmacist subscription
                    const subscriber = pharmacist;
                    const hasPharmacistSubscription = subscriber && subscriber.hasActiveSubscription && subscriber.subscriptionEndDate && new Date(subscriber.subscriptionEndDate) > new Date();
                    
                    // Check trial
                    const isInTrial = trialExpiresAt && new Date(trialExpiresAt) > new Date();

                    if (hasPersonalSubscription || hasPharmacistSubscription || isInTrial || user.role === UserRole.PHARMACIEN && user.hasActiveSubscription) {
                        hasAccess = true;
                    }

                    if (!hasAccess && group && group.assignedFiches.some(f => f.ficheId === fiche._id.toString())) {
                        hasAccess = true;
                    }
                }
            }

            if (fiche.isFree) {
                return { ...fiche, isLocked: false };
            }
            return { ...fiche, isLocked: !hasAccess };
        });

        res.json({
            data: fichesWithAccess,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages,
            }
        });
    } catch (error) {
        console.error('Error fetching memofiches:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des mémofiches.' });
    }
});

router.get('/all', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const fiches = await memofichesCollection.find({}).toArray();
        res.json(fiches);
    } catch (error) {
        console.error('Error fetching all memofiches:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de toutes les mémofiches.' });
    }
});

router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const user = req.user!; // req.user is guaranteed to exist by authenticateToken

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'ID de mémofiche invalide.' });
        }
        let fiche = await memofichesCollection.findOne({ _id: new ObjectId(id) }); 

        if (!fiche) {
            return res.status(404).json({ message: 'Mémofiche non trouvée' });
        }

        // This logic was added to fix an issue where free fiches were not accessible
        if (fiche.isFree) {
            return res.json({
                ...fiche,
                isLocked: false,
                mainTreatment: fiche.mainTreatment || [],
                associatedProducts: fiche.associatedProducts || [],
                lifestyleAdvice: fiche.lifestyleAdvice || [],
                dietaryAdvice: fiche.dietaryAdvice || [],
            });
        }

        let group: Group | null = null;
        let pharmacist: User | null = null;

        if (user && user.groupId) {
                        group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
            
                        if (group && group.pharmacistIds && group.pharmacistIds.length > 0) {
                            pharmacist = await usersCollection.findOne({ _id: new ObjectId(group.pharmacistIds[0]) });
                        }
        }

        // Admin and Formateur can access all non-free memofiches
        if (user.role === UserRole.ADMIN || user.role === UserRole.FORMATEUR) {
            return res.json({
                ...fiche,
                isLocked: false,
                mainTreatment: fiche.mainTreatment || [],
                associatedProducts: fiche.associatedProducts || [],
                lifestyleAdvice: fiche.lifestyleAdvice || [],
                dietaryAdvice: fiche.dietaryAdvice || [],
            });
        }

        // Apprenant and Preparateur need an active subscription or group access
        if (user.role === UserRole.APPRENANT || user.role === UserRole.PREPARATEUR || user.role === UserRole.PHARMACIEN || user.role === UserRole.ADMIN_WEBINAR) {
            let effectiveSubscriber: User | null = user; // Start with the user trying to access
            
            // If preparator or assistant pharmacist, check if they are linked to a pharmacist with an active subscription
            if ((user.role === UserRole.PREPARATEUR || user.role === UserRole.PHARMACIEN) && user.pharmacistId) {
                const associatedPharmacist = await usersCollection.findOne({ _id: new ObjectId(user.pharmacistId) });
                if (associatedPharmacist) {
                    effectiveSubscriber = associatedPharmacist;
                }
            } else if ((user.role === UserRole.APPRENANT || user.role === UserRole.PHARMACIEN) && user.groupId) {
                // If apprenant or pharmacist and in a group, check the group's pharmacist's subscription
                const groupDetails = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
                if (groupDetails && groupDetails.pharmacistIds && groupDetails.pharmacistIds.length > 0) {
                    const groupPharmacist = await usersCollection.findOne({ _id: new ObjectId(groupDetails.pharmacistIds[0]) });
                    if (groupPharmacist) {
                        effectiveSubscriber = groupPharmacist;
                    }
                }
            }
            
            // Check for effective subscriber's active subscription OR a valid trial period
            if (effectiveSubscriber && (
                (effectiveSubscriber.hasActiveSubscription && effectiveSubscriber.subscriptionEndDate && new Date(effectiveSubscriber.subscriptionEndDate) > new Date()) ||
                (effectiveSubscriber.trialExpiresAt && new Date(effectiveSubscriber.trialExpiresAt) > new Date())
            )) {
                return res.json({
                    ...fiche,
                    isLocked: false,
                    mainTreatment: fiche.mainTreatment || [],
                    associatedProducts: fiche.associatedProducts || [],
                    lifestyleAdvice: fiche.lifestyleAdvice || [],
                    dietaryAdvice: fiche.dietaryAdvice || [],
                });
            }

            // Existing group access check (if fiche is assigned to the preparator's group)
            // Re-fetch group if not already fetched for apprenant
            if (!group && user.groupId) { 
                group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
            }

            if (group && group.assignedFiches.some(f => f.ficheId === id)) {
                return res.json({
                    ...fiche,
                    isLocked: false,
                    mainTreatment: fiche.mainTreatment || [],
                    associatedProducts: fiche.associatedProducts || [],
                    lifestyleAdvice: fiche.lifestyleAdvice || [],
                    dietaryAdvice: fiche.dietaryAdvice || [],
                });
            }

            // If none of the above, access is denied
            return res.status(403).json({ message: 'Accès refusé: Abonnement inactif, mémofiche non assignée ou rôle insuffisant.', isLocked: true });
        }

        return res.status(403).json({ message: 'Accès refusé: Rôle utilisateur insuffisant.', isLocked: true });

    } catch (error) {
        console.error('Error fetching memofiche by ID:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de la mémofiche.' });
    }
});

router.post('/', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
    try {
        const newFicheData = req.body as CaseStudy;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        const { _id, ...ficheData } = newFicheData;

        // MongoDB will generate _id automatically
        const result = await memofichesCollection.insertOne({
            ...ficheData,
            creationDate: new Date().toISOString(),
        } as CaseStudy);

        if (result.acknowledged) {
            const insertedFiche = { _id: result.insertedId, ...ficheData, creationDate: new Date().toISOString() } as CaseStudy;
            // Index the new fiche in Algolia, but don't block the response
            indexMemoFiches([insertedFiche]).catch(err => {
                console.error('Failed to index new memofiche in Algolia:', err);
            });
            res.status(201).json(insertedFiche);
        } else {
            res.status(500).json({ message: 'Échec de l\'insertion de la mémofiche.' });
        }
    } catch (error) {
        console.error('Error creating memofiche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création de la mémofiche.' });
    }
});

router.put('/:id', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req, res) => {
    try {
        const { id } = req.params;
        const updatedFicheData = req.body as Partial<CaseStudy>;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        // FIX: Remove immutable _id field from update payload
        delete updatedFicheData._id;
        const result = await memofichesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFicheData }
        );

        if (result.matchedCount === 0) {
            res.status(404).json({ message: 'Mémofiche non trouvée' });
        } else if (result.modifiedCount === 0) {
            res.status(200).json({ message: 'Mémofiche trouvée mais aucune modification effectuée.' });
        } else {
            const updatedFiche = await memofichesCollection.findOne({ _id: new ObjectId(id) });
            // Re-index the updated fiche in Algolia
            if (updatedFiche) {
                indexMemoFiches([updatedFiche]).catch(err => {
                    console.error(`Failed to re-index memofiche ${id} in Algolia:`, err);
                });
            }
            res.json(updatedFiche);
        }
    } catch (error) {
        console.error('Error updating memofiche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour de la mémofiche.' });
    }
});

router.delete('/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        const result = await memofichesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) {
            // Also remove from Algolia index
            removeMemoFicheFromIndex(id).catch(err => {
                console.error(`Failed to remove memofiche ${id} from Algolia index:`, err);
            });

            // Also remove this ficheId from all users' readFiches array
            const usersCollection = db.collection<User>('users');
            await usersCollection.updateMany(
                { 'readFiches.ficheId': id },
                { $pull: { readFiches: { ficheId: id } } } as any
            );
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Mémofiche non trouvée' });
        }
    } catch (error) {
        console.error('Error deleting memofiche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la mémofiche.' });
    }
});

router.post('/validate-ids', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ message: 'Request body must be an array of IDs.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        
        const objectIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

        const query = { _id: { $in: objectIds } };
        const projection = { _id: 1 }; // We only need the IDs

        const validFiches = await memofichesCollection.find(query).project(projection).toArray();
        const validIds = validFiches.map(fiche => fiche._id.toString());

        res.json({ validIds });

    } catch (error) {
        console.error('Error validating fiche IDs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// GET /api/memofiches/search-for-admin - Authenticated and Admin/Formateur only
router.get('/search-for-admin', authenticateToken, checkRole([UserRole.ADMIN, UserRole.FORMATEUR]), async (req: AuthenticatedRequest, res) => {
    try {
        const { search = '' } = req.query as { [key: string]: string };

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        let query: any = {};
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            query.$or = [
                { title: searchRegex },
                { shortDescription: searchRegex }
            ];
        }

        const fiches = await memofichesCollection.find(query)
            .project({ _id: 1, title: 1, shortDescription: 1 }) // Project only necessary fields
            .limit(20) // Limit results for performance
            .toArray();

        res.json(fiches);

    } catch (error) {
        console.error('Error searching memofiches for admin:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la recherche des mémofiches.' });
    }
});

export default router;
