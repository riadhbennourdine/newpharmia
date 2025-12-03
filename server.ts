import './server/env.js';
import express from 'express';
import path from 'path';
import cors from 'cors';
// FIX: Added imports for ES module scope __dirname
import { fileURLToPath } from 'url';
import { handleSubscription, handleUnsubscription } from './server/subscribe.js';
import { uploadFileToGemini, searchInFiles } from './server/geminiFileSearchService.js';
import fs from 'fs';
import { authenticateToken, AuthenticatedRequest } from './server/authMiddleware.js';
import { generateCaseStudyDraft, generateLearningTools, getChatResponse, listModels } from './server/geminiService.js';
import { indexMemoFiches, removeMemoFicheFromIndex, searchMemoFiches } from './server/algoliaService.js';
import { User, UserRole, CaseStudy, Group, MemoFicheStatus } from './types.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

import clientPromise from './server/mongo.js';

// FIX: Define __filename and __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')));

// import { initializeFileStore, queryLearningAssistant } from './server/learningJourneyService.js';

/*
app.post('/api/learning-journey/initialize', async (req, res) => {
    try {
            // const result = await initializeFileStore();
        if (result.success) {
            res.json({ message: result.message });
        } else {
            res.status(500).json({ message: result.message });
        }
    } catch (error: any) {
        console.error('Error initializing learning journey:', error);
        res.status(500).json({ message: `Erreur interne du serveur lors de l'initialisation du parcours d'apprentissage.` });
    }
});
*/

/*
app.post('/api/learning-assistant/ask', async (req, res) => {
    try {
        const { query, history } = req.body;
        if (!query) {
            return res.status(400).json({ message: 'Query is required.' });
        }
                // const response = await queryLearningAssistant(query, history || []);
        res.json({ response });
    } catch (error: any) {
        console.error('Error in learning assistant ask endpoint:', error);
        res.status(500).json({ message: `Erreur interne du serveur lors de la requête à l'assistant d'apprentissage: ${error.message}` });
    }
});
*/

// In production, serve static files from the build directory
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
}



// Mock user data
const mockUsers: User[] = [
    { _id: 'admin1', email: 'admin@pharmia.com', role: UserRole.ADMIN, firstName: 'Admin', lastName: 'User', passwordHash: 'hashedpassword', hasActiveSubscription: true },
    { _id: 'formateur1', email: 'formateur@pharmia.com', role: UserRole.FORMATEUR, firstName: 'Formateur', lastName: 'User', passwordHash: 'hashedpassword' },
    { _id: 'apprenant1', email: 'apprenant@pharmia.com', role: UserRole.APPRENANT, firstName: 'Apprenant', lastName: 'User', passwordHash: 'hashedpassword', profileIncomplete: true },
    { _id: 'pharmacien1', email: 'pharmacien@pharmia.com', role: UserRole.PHARMACIEN, firstName: 'Pharmacien', lastName: 'User', passwordHash: 'hashedpassword' },
];

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendSingleEmail } from './server/emailService.js';
import multer from 'multer';
import fetch from 'node-fetch'; // Add node-fetch import

const upload = multer({ storage: multer.memoryStorage() });

// AUTH ROUTES
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: 'L\'identifiant et le mot de passe sont requis.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const user = await usersCollection.findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        });

        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(password, user.passwordHash);

            if (isMatch) {
                // Check if subscription is still active
                if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
                    await usersCollection.updateOne({ _id: user._id }, { $set: { hasActiveSubscription: false } });
                    user.hasActiveSubscription = false;
                }

                // Passwords match, generate a real JWT
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_default_secret', { expiresIn: '24h' });
                res.json({ token, user });
            } else {
                // Passwords do not match
                res.status(401).json({ message: 'Identifiants invalides.' });
            }
        } else {
            // User not found
            res.status(401).json({ message: 'Identifiants invalides.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, role, pharmacistId, firstName, lastName, city } = req.body;

        // Basic validation
        if (!email || !username || !password || !role || !firstName || !lastName) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUserDocument = {
            email,
            username,
            passwordHash,
            role,
            pharmacistId: role === UserRole.PREPARATEUR && pharmacistId ? new ObjectId(pharmacistId) : undefined,
            firstName,
            lastName,
            city,
            createdAt: new Date(),
            trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            hasActiveSubscription: false, 
            profileIncomplete: false, 
        };

        const result = await usersCollection.insertOne(newUserDocument as User);

        if (result.acknowledged) {
            res.status(201).json({ message: 'Inscription réussie. Vous pouvez maintenant vous connecter.' });
        } else {
            res.status(500).json({ message: 'Échec de la création de l\'utilisateur.' });
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) {
            return res.status(400).json({ message: 'L\'identifiant est requis.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const user = await usersCollection.findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        });

        if (!user) {
            // Send a generic message to prevent email enumeration
            return res.json({ message: 'Si un compte existe, un email de réinitialisation a été envoyé.' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { resetPasswordToken: resetToken, resetPasswordExpires: resetTokenExpires } }
        );

        // Send email with reset link
        const resetUrl = `${process.env.CLIENT_URL}#/reset-password?token=${resetToken}`;
        const htmlContent = `
            <p>Vous avez demandé une réinitialisation de mot de passe.</p>
            <p>Veuillez cliquer sur ce lien pour réinitialiser votre mot de passe : <a href="${resetUrl}">${resetUrl}</a></p>
            <p>Ce lien expirera dans une heure.</p>
            <p>Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail.</p>
        `;

        await sendSingleEmail({
            to: user.email,
            subject: 'Réinitialisation de mot de passe PharmIA',
            htmlContent,
        });

        res.json({ message: 'Si un compte existe, un email de réinitialisation a été envoyé.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la demande de réinitialisation de mot de passe.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Le jeton et le nouveau mot de passe sont requis.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const user = await usersCollection.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() } // Token not expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Le jeton de réinitialisation est invalide ou a expiré.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { passwordHash, resetPasswordToken: undefined, resetPasswordExpires: undefined } }
        );

        res.json({ message: 'Mot de passe réinitialisé avec succès.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la réinitialisation du mot de passe.' });
    }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(404).json({ message: 'User not found.' });
    }
});

// USER ROUTES


// ===============================================
// CRM API ROUTES
// ===============================================



import crmRoutes from './server/crm.js';
import { adminRouter as adminGroupsRouter, nonAdminRouter as groupsRouter } from './server/groups.js';
import usersRoutes from './server/users.js';
import webinarsRouter from './server/webinars.js';
import ordersRouter from './server/orders.js';
import uploadRouter from './server/upload.js';
import imageThemesRouter from './server/imageThemes.js';
import ftpRouter from './server/ftp.js'; // Import the new FTP router

// ===============================================
// API ROUTES
// ===============================================
app.use('/api/admin/crm', crmRoutes);
app.use('/api/admin/groups', adminGroupsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/users', usersRoutes);
app.use('/api/webinars', webinarsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/image-themes', imageThemesRouter);
app.use('/api/ftp', ftpRouter); // Register the new FTP routes

// ===============================================
// ADMIN FILE SEARCH API
// ===============================================
const fileSearchUpload = multer({ dest: 'tmp/filesearch/' });
// Ensure the upload directory exists
if (!fs.existsSync('tmp/filesearch/')) {
    fs.mkdirSync('tmp/filesearch/', { recursive: true });
}

app.post('/api/admin/filesearch/upload', authenticateToken, fileSearchUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== UserRole.ADMIN) {
        // Clean up uploaded file if user is not admin
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Accès non autorisé.' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier envoyé.' });
    }

    try {
        const geminiFile = await uploadFileToGemini(req.file.path, req.file.mimetype);
        fs.unlinkSync(req.file.path); // Clean up the temporary file
        res.json(geminiFile);
    } catch (error: any) {
        console.error('Error uploading file to Gemini:', error);
        // Make sure to clean up the file in case of an error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: `Erreur lors de l'upload du fichier vers Gemini: ${error.message}` });
    }
});

app.post('/api/admin/filesearch/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Accès non autorisé.' });
    }

    const { query, files } = req.body;
    if (!query || !files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: 'La requête et une liste de fichiers sont requises.' });
    }

    try {
        const searchResult = await searchInFiles(query, files);
        res.json({ result: searchResult });
    } catch (error: any) {
        console.error('Error searching in files:', error);
        res.status(500).json({ message: `Erreur lors de la recherche: ${error.message}` });
    }
});








// ===============================================
// MEMOFICHES API
// ===============================================
app.get('/api/memofiches', async (req, res) => {
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

        const userId = req.headers['x-user-id'] as string; // THIS IS A TEMPORARY, INSECURE SOLUTION

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        let user: User | null = null;
        let group: Group | null = null;
        let pharmacist: User | null = null;

        if (userId && ObjectId.isValid(userId)) {
            user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            if (user && user.groupId) {
                group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
                if (group && group.pharmacistIds && group.pharmacistIds.length > 0) {
                    pharmacist = await usersCollection.findOne({ _id: new ObjectId(group.pharmacistIds[0]) });
                }
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
            query.$or = [
                { status: { $in: [MemoFicheStatus.PUBLISHED, 'Publiée'] } },
                { status: { $exists: false } }
            ];
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

                const subscriber = user.role === UserRole.PHARMACIEN ? user : pharmacist;

                if ((subscriber && subscriber.hasActiveSubscription) || (trialExpiresAt && new Date(trialExpiresAt) > new Date())) {
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
app.get('/api/memofiches/all', async (req, res) => {
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
app.get('/api/memofiches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] as string; // THIS IS A TEMPORARY, INSECURE SOLUTION

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'ID de mémofiche invalide.' });
        }
        const fiche = await memofichesCollection.findOne({ _id: new ObjectId(id) });

        if (!fiche) {
            return res.status(404).json({ message: 'Mémofiche non trouvée' });
        }

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

        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(403).json({ message: 'Accès refusé: Utilisateur non authentifié.' });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(403).json({ message: 'Accès refusé: Utilisateur introuvable.' });
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
        if (user.role === UserRole.APPRENANT || user.role === UserRole.PREPARATEUR) {
            // Check for active subscription
            if (user.hasActiveSubscription && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
                return res.json({
                    ...fiche,
                    isLocked: false,
                    mainTreatment: fiche.mainTreatment || [],
                    associatedProducts: fiche.associatedProducts || [],
                    lifestyleAdvice: fiche.lifestyleAdvice || [],
                    dietaryAdvice: fiche.dietaryAdvice || [],
                });
            }

            // Check for group access
            if (user.groupId) {
                group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });

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
            }

            return res.status(403).json({ message: 'Accès refusé: Abonnement inactif ou mémofiche non assignée.', isLocked: true });
        }

        return res.status(403).json({ message: 'Accès refusé: Rôle utilisateur insuffisant.', isLocked: true });

    } catch (error) {
        console.error('Error fetching memofiche by ID:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de la mémofiche.' });
    }
});

app.post('/api/memofiches', async (req, res) => {
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

app.put('/api/memofiches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedFicheData = req.body as Partial<CaseStudy>;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        // FIX: Remove immutable _id field from update payload
        delete updatedFicheData._id;

        const { ObjectId } = await import('mongodb');
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

app.delete('/api/memofiches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        const { ObjectId } = await import('mongodb');
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
                { $pull: { readFiches: { ficheId: id } } as any }
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

app.post('/api/memofiches/validate-ids', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ message: 'Request body must be an array of IDs.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const { ObjectId } = await import('mongodb');

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


// GEMINI ROUTES
app.get('/api/proxy-pdf', async (req, res) => {
    try {
        const { pdfUrl } = req.query;

        if (!pdfUrl || typeof pdfUrl !== 'string') {
            return res.status(400).json({ message: 'A valid pdfUrl is required.' });
        }

        // Basic validation to ensure it's a PDF URL, can be more robust
        if (!pdfUrl.startsWith('http') || !pdfUrl.endsWith('.pdf')) {
            return res.status(400).json({ message: 'Only HTTP(S) PDF URLs are allowed.' });
        }

        const response = await fetch(pdfUrl);

        if (!response.ok) {
            return res.status(response.status).json({ message: `Failed to fetch PDF from external source: ${response.statusText}` });
        }

        // Forward all headers from the original response
        response.headers.forEach((value, name) => {
            // Exclude headers that should be handled by Express or might cause issues
            if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(name)) {
                res.setHeader(name, value);
            }
        });

        // Set appropriate headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        // Optional: Set a filename if not present in original headers
        if (!res.hasHeader('Content-Disposition')) {
            res.setHeader('Content-Disposition', 'inline; filename="proxied.pdf"');
        }

        // Add caching headers
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year from now

        // Pipe the response body directly to the client
        response.body?.pipe(res);

    } catch (error) {
        console.error('Error proxying PDF:', error);
        res.status(500).json({ message: 'Internal server error while proxying PDF.' });
    }
});
app.post('/api/gemini/generate-draft', async (req, res) => {
    try {
        const { prompt, memoFicheType } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required.' });
        }
        const draft = await generateCaseStudyDraft(prompt, memoFicheType);
        res.json(draft);
    } catch (error: any) {
        console.error('Error generating draft:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/gemini/generate-learning-tools', async (req, res) => {
    try {
        const memoContent = req.body as Partial<CaseStudy>;
        if (!memoContent) {
            return res.status(400).json({ message: 'MemoFiche content is required.' });
        }
        const tools = await generateLearningTools(memoContent);
        res.json(tools);
    } catch (error: any) {
        console.error('Error generating learning tools:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/gemini/chat', authenticateToken, async (req, res) => {
    try {
        const { messages, context } = req.body;

        if (!messages || !context) {
            return res.status(400).json({ message: 'Messages and context are required.' });
        }

        const history = messages.filter(m => m.role !== 'model');
        const question = messages[messages.length - 1].text;
        const caseStudy = JSON.parse(context);
        const title = caseStudy.title ?? 'cette mémofiche';

        const text = await getChatResponse(history, context, question, title);
        res.json({ message: text });

    } catch (error: any) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/rag/chat', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query is required.' });
        }

        // 1. Retrieve: Search for relevant documents in Algolia
        const searchResults = await searchMemoFiches(query);

        // 2. Augment: Create a context from the search results
        const context = searchResults.map((hit: any) => {
            return `Titre: ${hit.title}\nPoints Clés: ${hit.keyPoints?.join(', ')}\nSituation: ${hit.patientSituation}\n`;
        }).join('\n---\n');

        const augmentedQuery = `En te basant STRICTEMENT sur le contexte suivant, réponds à la question de l'utilisateur. Le contexte provient de fiches validées. Ne fournis aucune information qui ne soit pas dans ce contexte. Si la réponse n'est pas dans le contexte, dis simplement "Je ne trouve pas l'information dans les fiches disponibles."

Contexte:
---
${context}
---

Question de l'utilisateur: ${query}`;

        // 3. Generate: Call the Gemini model with the augmented prompt
        const text = await getChatResponse([], augmentedQuery, query, 'mémofiches'); 
        
        res.json({ message: text, sources: searchResults }); // Also return the sources for display

    } catch (error: any) {
        console.error('Error in RAG chat endpoint:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/gemini/models', async (req, res) => {
    try {
        const models = await listModels();
        res.json(models);
    } catch (error: any) {
        console.error('Error listing models:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/gemini/list-models', async (req, res) => {
    try {
        const models = await listModels();
        res.json(models);
    } catch (error: any) {
        console.error('Error listing models:', error);
        res.status(500).json({ message: error.message });
    }
});

/*
// KONNECT PAYMENT ROUTES
app.post('/api/konnect/initiate-payment', async (req, res) => {
    try {
        const { amount, planName, isAnnual, firstName, lastName, email, phoneNumber, orderId } = req.body;

        if (!amount || !planName || !email) {
            return res.status(400).json({ message: 'Missing required payment details.' });
        }

        const KONNECT_API_KEY = process.env.KONNECT_API_KEY;
        const KONNECT_RECEIVER_WALLET_ID = process.env.KONNECT_RECEIVER_WALLET_ID;
        const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'; // Base URL of your frontend

        let missingVars = [];
        if (!KONNECT_API_KEY) missingVars.push('KONNECT_API_KEY');
        if (!KONNECT_RECEIVER_WALLET_ID) missingVars.push('KONNECT_RECEIVER_WALLET_ID');

        if (missingVars.length > 0) {
            const errorMessage = `Konnect payment not configured. Missing environment variables: ${missingVars.join(', ')}`;
            console.error(errorMessage);
            return res.status(500).json({ message: errorMessage });
        }

        const konnectApiBaseUrl = process.env.KONNECT_API_BASE_URL || 'https://api.konnect.network/api/v2';
        const konnectApiUrl = `${konnectApiBaseUrl}/payments/init-payment`;
        const webhookUrl = `${CLIENT_URL}/api/konnect/webhook`; // Our webhook endpoint
        const successUrl = `${CLIENT_URL}/#/pricing?status=success`;
        const failUrl = `${CLIENT_URL}/#/pricing?status=failed`;

        const konnectRequestBody = {
            receiverWalletId: KONNECT_RECEIVER_WALLET_ID,
            token: "TND", // Assuming TND as currency
            amount: Math.round(amount * 1000), // Convert to millimes
            type: "immediate",
            description: `Payment for ${planName} plan`,
            acceptedPaymentMethods: ["bank_card", "e-DINAR"], // Only bank card and e-DINAR
            lifespan: 15, // 15 minutes
            checkoutForm: true,
            addPaymentFeesToAmount: true,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber,
            email: email,
            orderId: orderId, // Use the orderId from the client
            webhook: webhookUrl,
            successUrl: successUrl,
            failUrl: failUrl,
            theme: "light"
        };

        const konnectHeaders = {
            'x-api-key': KONNECT_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        console.log('Initiating Konnect payment with:', JSON.stringify(konnectRequestBody, null, 2));

        const konnectResponse = await fetch(konnectApiUrl, {
            method: 'POST',
            headers: konnectHeaders,
            body: JSON.stringify(konnectRequestBody)
        });

        const konnectData = await konnectResponse.json();

        if (!konnectResponse.ok) {
            console.error("Konnect API error:", konnectResponse.status, konnectData);
            return res.status(konnectResponse.status).json({ message: konnectData.message || 'Failed to initiate payment with Konnect.' });
        }

        res.json({ payUrl: konnectData.payUrl, paymentRef: konnectData.paymentRef });

    } catch (error) {
        console.error('Error initiating Konnect payment:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'initialisation du paiement Konnect.' });
    }
});

app.get('/api/konnect/webhook', async (req, res) => {
    try {
        const paymentRef = req.query.payment_ref as string;

        if (!paymentRef) {
            return res.status(400).json({ message: 'Missing payment_ref in webhook request.' });
        }

        const KONNECT_API_KEY = process.env.KONNECT_API_KEY;
        if (!KONNECT_API_KEY) {
            const errorMessage = "Konnect payment not configured. Missing environment variable: KONNECT_API_KEY";
            console.error(errorMessage);
            return res.status(500).json({ message: errorMessage });
        }

        const konnectApiUrl = process.env.KONNECT_API_URL || 'https://api.konnect.network/api/v2';
        const getPaymentDetailsUrl = `${konnectApiUrl}/payments/${paymentRef}`;

        const konnectHeaders = {
            'x-api-key': KONNECT_API_KEY,
            'Accept': 'application/json'
        };

        console.log('Fetching Konnect payment details for paymentRef:', paymentRef);

        const konnectResponse = await fetch(getPaymentDetailsUrl, {
            method: 'GET',
            headers: konnectHeaders
        });

        const konnectData = await konnectResponse.json();

        if (!konnectResponse.ok) {
            console.error("Konnect API error fetching payment details:", konnectResponse.status, konnectData);
            return res.status(konnectResponse.status).json({ message: konnectData.message || 'Failed to fetch payment details from Konnect.' });
        }

        const paymentStatus = konnectData.payment.status;
        const orderId = konnectData.payment.orderId; // Assuming orderId is passed in init-payment

        console.log(`Payment ${paymentRef} status: ${paymentStatus} for orderId: ${orderId}`);

        // TODO: Update user's subscription status in the database based on paymentStatus and orderId
        // For example:
        // if (paymentStatus === 'completed') {
        //   const client = await clientPromise;
        //   const db = client.db('pharmia');
        //   const usersCollection = db.collection<User>('users');
        //   await usersCollection.updateOne({ _id: new ObjectId(orderId) }, { $set: { hasActiveSubscription: true, planName: konnectData.payment.description } });
        // }

        res.status(200).json({ message: 'Webhook received and processed.' });

    } catch (error) {
        console.error('Error processing Konnect webhook:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors du traitement du webhook Konnect.' });
    }
*/

// GPG PAYMENT ROUTES
app.post('/api/gpg/initiate-payment', async (req, res) => {
    try {
        const { amount, planName, isAnnual, firstName, lastName, email, phoneNumber, orderId: clientOrderId, city, country, zip } = req.body;

        if (!amount || !planName || !email) {
            return res.status(400).json({ message: 'Missing required payment details.' });
        }

        const { GPG_NUM_SITE, GPG_PASSWORD, GPG_VAD, GPG_TERMINAL } = process.env;

        const missingVars = [];
        if (!GPG_NUM_SITE) missingVars.push('GPG_NUM_SITE');
        if (!GPG_PASSWORD) missingVars.push('GPG_PASSWORD');
        if (!GPG_VAD) missingVars.push('GPG_VAD');
        if (!GPG_TERMINAL) missingVars.push('GPG_TERMINAL');

        if (missingVars.length > 0) {
            const errorMessage = `GPG payment not configured. Missing environment variables: ${missingVars.join(', ')}`;
            console.error(errorMessage);
            return res.status(500).json({ message: errorMessage });
        }

        const orderID = `PHARMIA-${Date.now()}`;
        const formattedAmount = Math.round(amount * 1000); // Convert to millimes
        const currency = 'TND';

        // Create signature
        const signatureClear = GPG_NUM_SITE + GPG_PASSWORD + orderID + formattedAmount + currency;
        const signature = crypto.createHash('sha1').update(signatureClear).digest('hex');

        // Create MD5 password for the form
        const md5Password = crypto.createHash('md5').update(GPG_PASSWORD).digest('hex');

        const paymentUrl = process.env.NODE_ENV === 'production' 
            ? 'https://www.gpgcheckout.com/Paiement/Validation_paiement.php' 
            : 'https://preprod.gpgcheckout.com/Paiement_test/Validation_paiement.php';

        const paymentData = {
            paymentUrl,
            NumSite: GPG_NUM_SITE,
            Password: md5Password,
            orderID,
            Amount: formattedAmount.toString(),
            Currency: currency,
            Language: 'fr',
            EMAIL: email,
            CustLastName: lastName,
            CustFirstName: firstName,
            CustAddress: 'N/A', // Or get from user profile
            CustZIP: zip || '0000',
            CustCity: city || 'N/A',
            CustCountry: country || 'Tunisie',
            CustTel: phoneNumber || '00000000',
            PayementType: '1', // Direct Payment
            signature,
            vad: GPG_VAD,
            Terminal: GPG_TERMINAL,
            orderProducts: `Abonnement ${planName} (${isAnnual ? 'Annuel' : 'Mensuel'})`,
        };

        res.json(paymentData);

    } catch (error) {
        console.error('Error initiating GPG payment:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'initialisation du paiement GPG.' });
    }
});

app.post('/api/gpg/webhook', async (req, res) => {
    try {
        console.log("GPG Webhook received:", req.body);

        const { TransStatus, PAYID, Signature } = req.body;
        const { GPG_PASSWORD } = process.env;

        if (!TransStatus || !PAYID || !Signature || !GPG_PASSWORD) {
            console.error('GPG Webhook: Missing required parameters.');
            return res.status(400).send('Missing parameters');
        }

        // Verify signature
        const signatureClear = TransStatus + PAYID + GPG_PASSWORD;
        const expectedSignature = crypto.createHash('sha1').update(signatureClear).digest('hex');

        if (Signature.toLowerCase() !== expectedSignature.toLowerCase()) {
            console.error(`GPG Webhook: Invalid signature. Received: ${Signature}, Expected: ${expectedSignature}`);
            return res.status(400).send('Invalid signature');
        }

        if (TransStatus === '00') {
            console.log(`GPG Webhook: Payment success for order ${PAYID}`);
            // TODO: Find user/order by PAYID and update subscription status
            // const orderId = PAYID; // This should contain the user ID or another identifier
            // const client = await clientPromise;
            // const db = client.db('pharmia');
            // const usersCollection = db.collection<User>('users');
            // await usersCollection.updateOne({ _id: new ObjectId(orderId) }, { $set: { hasActiveSubscription: true, ... } });
        } else {
            console.log(`GPG Webhook: Payment status for order ${PAYID}: ${TransStatus}`);
        }

        res.status(200).send('Webhook processed');

    } catch (error) {
        console.error('Error processing GPG webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/api/newsletter/send', async (req, res) => {
    const { subject, htmlContent, roles, cities, statuses, formalGroupIds, webinarId, googleMeetLink } = req.body;

    if (!subject || !htmlContent) {
        return res.status(400).json({ message: 'Subject and content are required.' });
    }

    try {
        const finalSubject = subject.replace(/\[TEST\]\s*/, '');

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection('users');
        let recipients = [];
        let fetchedWebinar = null; 

        if (webinarId) {
            const webinarsCollection = db.collection('webinars');
            fetchedWebinar = await webinarsCollection.findOne({ _id: new ObjectId(webinarId) });

            if (!fetchedWebinar) {
                return res.status(404).json({ message: 'Webinar not found.' });
            }

            const confirmedAttendeeUserIds = fetchedWebinar.attendees
                .filter(att => att.status === 'CONFIRMED')
                .map(att => new ObjectId(att.userId));

            if (confirmedAttendeeUserIds.length === 0) {
                return res.status(404).json({ message: 'No confirmed attendees found for this webinar.' });
            }

            recipients = await usersCollection.find({ _id: { $in: confirmedAttendeeUserIds } })
                .project({ email: 1, firstName: 1, lastName: 1 })
                .toArray();

        } else {
            const groupsCollection = db.collection('groups');
            let userQuery: any = { subscribed: { $ne: false } };
            const queries = [];

            if (roles && roles.length > 0) {
                queries.push({ role: { $in: roles } });
            }
            if (cities && cities.length > 0) {
                queries.push({ city: { $in: cities } });
            }
            if (statuses && statuses.length > 0) {
                queries.push({ status: { $in: statuses } });
            }
            if (formalGroupIds && formalGroupIds.length > 0) {
                const groupObjectIds = formalGroupIds.map((id: string) => new ObjectId(id));
                const groups = await groupsCollection.find({ _id: { $in: groupObjectIds } }).toArray();
                
                const userIdsFromGroups = new Set<string>();
                groups.forEach(group => {
                    group.pharmacistIds.forEach((id: ObjectId) => userIdsFromGroups.add(id.toString()));
                    group.preparatorIds.forEach((id: ObjectId) => userIdsFromGroups.add(id.toString()));
                });

                const userObjectIds = Array.from(userIdsFromGroups).map(id => new ObjectId(id));
                queries.push({ _id: { $in: userObjectIds } });
            }

            if (queries.length > 0) {
                userQuery = { $and: [userQuery, { $or: queries }] };
            }

            recipients = await usersCollection.find(userQuery).project({ email: 1, firstName: 1, lastName: 1 }).toArray();
        }

        if (recipients.length === 0) {
            return res.status(404).json({ message: 'No recipients found for the selected criteria.' });
        }

        console.log(`Sending newsletter to ${recipients.length} recipients.`);

        const { sendBulkEmails } = await import('./server/emailService.js');
        
        const emailMessages = recipients.map(recipient => {
            const finalHtmlContentWithPlaceholders = htmlContent
                .replace(/{{NOM_DESTINATAIRE}}/g, recipient.firstName || 'cher utilisateur')
                .replace(/{{EMAIL_DESTINATAIRE}}/g, recipient.email);
            
            let finalHtmlContent;
            if (webinarId && fetchedWebinar) { 
                finalHtmlContent = finalHtmlContentWithPlaceholders
                    .replace(/{{LIEN_MEETING}}/g, fetchedWebinar.googleMeetLink || '')
                    .replace(/{{WEBINAR_DESCRIPTION}}/g, fetchedWebinar.description || '');
            } else {
                finalHtmlContent = finalHtmlContentWithPlaceholders;
            }

            return {
                to: [{ email: recipient.email, name: recipient.firstName || '' }],
                subject: finalSubject,
                htmlContent: finalHtmlContent,
            };
        });

        await sendBulkEmails(emailMessages);

        res.status(200).json({ message: `Newsletter successfully sent to ${recipients.length} recipients.` });
    } catch (error) {
        console.error('Error sending newsletter:', error);
        res.status(500).json({ message: 'An error occurred while sending the newsletter.' });
    }
});


app.post('/api/newsletter/send-test', async (req, res) => {
    try {
        const { subject, htmlContent, testEmails, webinarId } = req.body;

        if (!subject || !htmlContent || !Array.isArray(testEmails) || testEmails.length === 0) {
            return res.status(400).json({ message: 'Le sujet, le contenu HTML et une liste d\'e-mails de test sont requis.' });
        }
        
        let finalHtmlContent = htmlContent;

        if (webinarId) {
            const client = await clientPromise;
            const db = client.db('pharmia');
            const webinarsCollection = db.collection('webinars');
            const webinar = await webinarsCollection.findOne({ _id: new ObjectId(webinarId) });

            if (webinar && webinar.googleMeetLink) {
                finalHtmlContent = htmlContent.replace(/{{LIEN_MEETING}}/g, webinar.googleMeetLink);
            }
        }

        const sendPromises = testEmails.map(email => {
            if (!/\S+@\S+\.\S+/.test(email)) {
                console.warn(`Invalid test email address skipped: ${email}`);
                return Promise.resolve(); // Skip invalid emails
            }
            // The {{NOM_DESTINATAIRE}} is not replaced in test emails, which is acceptable.
            return sendSingleEmail({
                to: email,
                subject: `[TEST] ${subject}`,
                htmlContent: finalHtmlContent,
            });
        });

        await Promise.all(sendPromises);

        res.json({ message: `E-mail de test envoyé à ${testEmails.join(', ')}.` });

    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'envoi de l\'e-mail de test.' });
    }
});

app.post('/api/contact', upload.single('attachment'), async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const attachment = req.file;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required.' });
        }

        const htmlContent = `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `;

        const attachments = [];
        if (attachment) {
            attachments.push({
                content: attachment.buffer.toString('base64'),
                name: attachment.originalname,
            });
        }

        await sendSingleEmail({
            to: 'rbpharskillseed@gmail.com',
            subject: `New message from ${name}`,
            htmlContent,
            attachment: attachments,
        });

        res.json({ message: 'Message sent successfully!' });

    } catch (error) {
        console.error('Error sending contact message:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'envoi du message.' });
    }
});


// SUBSCRIPTION ROUTES
app.get('/api/newsletter/subscriber-groups', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const rolesWithCounts = await usersCollection.aggregate([
            { $match: { role: { $in: [UserRole.PHARMACIEN, UserRole.PREPARATEUR] } } },
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $project: { _id: 0, name: '$_id', count: 1 } }
        ]).toArray();

        const citiesWithCounts = await usersCollection.aggregate([
            { $match: { city: { $exists: true, $ne: null } } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $project: { _id: 0, name: '$_id', count: 1 } }
        ]).toArray();

        const staffCount = await usersCollection.countDocuments({
            role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] }
        });

        const staffGroup = { name: 'Staff PharmIA', count: staffCount };

        const statusesWithCounts = await usersCollection.aggregate([
            { $match: { status: { $exists: true, $ne: null } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { _id: 0, name: '$_id', count: 1 } }
        ]).toArray();

        res.json({ roles: rolesWithCounts, cities: citiesWithCounts, staff: staffGroup, statuses: statusesWithCounts });
    } catch (error) {
        console.error('Error fetching subscriber groups:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des groupes d\'abonnés.' });
    }
});
app.post('/api/subscribe', handleSubscription);
app.post('/api/unsubscribe', handleUnsubscription);

// Serve React App - This should be after all API routes
if (process.env.NODE_ENV === 'production') {
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });
}

// --- END DEBUG LOGGING ---


async function migrateWebinars() {
    console.log('Checking if webinar migration is needed...');
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection('webinars');

        // Find webinars where the first attendee is a string or ObjectId, not an object
        const webinarsToMigrate = await webinarsCollection.find({
            $or: [
                { "attendees.0": { $type: "string" } },
                { "attendees.0": { $type: "objectId" } }
            ]
        }).toArray();

        if (webinarsToMigrate.length === 0) {
            console.log('No webinars to migrate.');
            return;
        }

        console.log(`Found ${webinarsToMigrate.length} webinars to migrate.`);

        const bulkOps = webinarsToMigrate.map(webinar => {
            const newAttendees = webinar.attendees.map(attendeeId => ({
                userId: attendeeId,
                status: 'CONFIRMED', // Assume old registrations are confirmed
                registeredAt: webinar.createdAt || new Date() // Use webinar creation date or now
            }));
            return {
                updateOne: {
                    filter: { _id: webinar._id },
                    update: { $set: { attendees: newAttendees } }
                }
            };
        });

        const result = await webinarsCollection.bulkWrite(bulkOps);
        console.log(`Successfully migrated ${result.modifiedCount} webinars.`);

    } catch (error) {
        console.error('Webinar migration failed:', error);
    }
}

async function migrateWebinarGroup() {
    console.log('Checking if webinar group migration is needed...');
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection('webinars');
        const { WebinarGroup } = await import('./types.js');

        // Find the first webinar ever created that does not have a group
        const firstWebinar = await webinarsCollection.findOne(
            { group: { $exists: false } },
            { sort: { createdAt: 1 } }
        );

        if (!firstWebinar) {
            console.log('No webinars need a group assignment.');
            return;
        }

        console.log(`Assigning group to webinar "${firstWebinar.title}"...`);

        const result = await webinarsCollection.updateOne(
            { _id: firstWebinar._id },
            { $set: { group: WebinarGroup.CROP_TUNIS } }
        );

        if (result.modifiedCount > 0) {
            console.log('Successfully assigned webinar to CROP Tunis group.');
        }

    } catch (error) {
        console.error('Webinar group migration failed:', error);
    }
}


app.listen(port, async () => {
    await migrateWebinars();
    await migrateWebinarGroup();
    console.log(`Server is running on http://localhost:${port}`);
    await ensureAdminUserExists();
});

async function ensureAdminUserExists() {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const adminUser = await usersCollection.findOne({ 
            $or: [
                { email: 'admin@example.com' },
                { username: 'admin' }
            ]
        });

        if (!adminUser) {
            console.log('Admin user not found, creating default admin user...');
            const password = 'password'; // Default password for admin
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const newAdmin: User = {
                _id: new ObjectId(),
                email: 'admin@example.com',
                username: 'admin',
                passwordHash,
                role: UserRole.ADMIN,
                firstName: 'Admin',
                lastName: 'User',
                createdAt: new Date(),
                updatedAt: new Date(),
                hasActiveSubscription: true, // Admin always has active subscription
                profileIncomplete: false,
            };

            await usersCollection.insertOne(newAdmin);
            console.log('Default admin user created successfully.');
        }
    } catch (error) {
        console.error('Error ensuring admin user exists:', error);
    }
}