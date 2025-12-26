import './server/env.js';
import express from 'express';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
// FIX: Added imports for ES module scope __dirname
import { fileURLToPath } from 'url';
import { handleSubscription, handleUnsubscription } from './server/subscribe.js';
import { uploadFileToGemini, searchInFiles } from './server/geminiFileSearchService.js';
import fs from 'fs';
import { authenticateToken, AuthenticatedRequest, checkRole } from './server/authMiddleware.js';
import { generateCaseStudyDraft, generateLearningTools, getChatResponse, getCoachResponse, listModels, isCacheReady, evaluateSimulation, generateDermoFicheJSON, getDermoPatientResponse } from './server/geminiService.js';
import { indexMemoFiches, removeMemoFicheFromIndex, searchMemoFiches, extractTextFromMemoFiche } from './server/algoliaService.js';
import { initCronJobs } from './server/cronService.js';
import { generateKnowledgeBase } from './server/generateKnowledgeBase.js';
import { refreshKnowledgeBaseCache } from './server/geminiService.js';
import { User, UserRole, CaseStudy, Group, MemoFicheStatus, Rating, Order, OrderStatus, SimulationResult } from './types.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { MASTER_CLASS_PACKS } from './constants.js';

import clientPromise from './server/mongo.js';

// FIX: Define __filename and __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Trust proxy is required for rate limiting to work correctly behind a load balancer (like Railway/Heroku)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// Serve files from the Railway Volume
// This maps the public URL path /uploads to the internal volume mount path /data/uploads
app.use('/uploads', express.static('/data/uploads'));

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

// Serve files from the Railway Volume (priority 1)
// This maps the public URL path /uploads to the internal volume mount path /app/public/uploads
app.use('/uploads', express.static('/app/public/uploads'));

// In production, serve static files from the build directory (priority 2)
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
        const { email, username, password, role, pharmacistId, firstName, lastName, city, phoneNumber } = req.body;

        // Basic validation
        if (!email || !username || !password || !role || !firstName || !lastName) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
        }

        // Security check: Only allow public roles registration
        const allowedRoles = [UserRole.PHARMACIEN, UserRole.PREPARATEUR];
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: 'Inscription non autorisée pour ce rôle.' });
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
            phoneNumber, // Added phoneNumber
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
import debugRouter from './server/debug.js'; // Import the debug router
import profileRoutes from './server/profile.js';
import simulationRouter from './server/simulation.js';

// ===============================================
// API ROUTES
// ===============================================

// Apply a rate limiter to all API routes
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 1000 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

app.use('/api/admin/crm', crmRoutes);
app.use('/api/admin/groups', adminGroupsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/users', usersRoutes);
app.use('/api/webinars', webinarsRouter);
console.log('Mounting Orders Router at /api/orders'); // DEBUG LOG
app.use('/api/orders', ordersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/image-themes', imageThemesRouter);
app.use('/api/ftp', ftpRouter); // Register the new FTP routes
app.use('/api/debug', debugRouter); // Register the debug routes
app.use('/api/profile', profileRoutes);
app.use('/api/simulation', simulationRouter);

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
app.get('/api/memofiches/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const user = req.user!; // req.user is guaranteed to exist by authenticateToken

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        const { ObjectId } = await import('mongodb'); // Explicit local import for safety
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'ID de mémofiche invalide.' });
        }
        let fiche = await memofichesCollection.findOne({ _id: new ObjectId(id) }); // Declared here

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
            
            // If preparator, check if they are linked to a pharmacist with an active subscription
            if (user.role === UserRole.PREPARATEUR && user.pharmacistId) {
                const associatedPharmacist = await usersCollection.findOne({ _id: new ObjectId(user.pharmacistId) });
                if (associatedPharmacist) {
                    effectiveSubscriber = associatedPharmacist;
                }
            } else if (user.role === UserRole.APPRENANT && user.groupId) {
                // If apprenant and in a group, check the group's pharmacist's subscription
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
app.post('/api/gemini/generate-dermo-fiche', async (req, res) => {
    try {
        const { pathologyName, rawText } = req.body;
        if (!pathologyName) {
            return res.status(400).json({ message: 'Pathology name is required.' });
        }
        const draft = await generateDermoFicheJSON(pathologyName, rawText || "");
        res.json(draft);
    } catch (error: any) {
        console.error('Error generating dermo fiche:', error);
        res.status(500).json({ message: error.message });
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
        const { query, history = [] } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query is required.' });
        }

        // 1. Retrieve: Search for relevant documents in Algolia
        const algoliaResults = await searchMemoFiches(query);

        // If Algolia fails OR returns nothing, but the CACHE is ready, we let Gemini handle it with the cache
        if ((!algoliaResults || algoliaResults.length === 0) && isCacheReady()) {
            console.log('[Chat] No Algolia results, but cache is ready. Using cache directly.');
            const text = await getChatResponse(history, "", query, 'mémofiches');
            return res.json({ message: text, sources: [] });
        }

        if (!algoliaResults || algoliaResults.length === 0) {
            const text = await getChatResponse(history, "", query, 'mémofiches');
            return res.json({ message: text, sources: [] });
        }

        const ficheObjectIDs = algoliaResults.map((hit: any) => new ObjectId(hit.objectID));

        let fullFiches: CaseStudy[] = [];
        if (ficheObjectIDs.length > 0) {
            const client = await clientPromise;
            const db = client.db('pharmia');
            const memofichesCollection = db.collection<CaseStudy>('memofiches');
            fullFiches = await memofichesCollection.find({ _id: { $in: ficheObjectIDs } }).toArray();
        }

        // 2. Augment: Create a raw context string from the full MongoDB documents
        const context = fullFiches.map(fiche => {
            return `Titre: ${fiche.title}\nContenu: ${extractTextFromMemoFiche(fiche)}\n`;
        }).join('\n---\n');
        
        // 3. Generate: Call the chat service with the raw context, history and question
        const text = await getChatResponse(history, context, query, 'mémofiches'); 
        
        const sources = fullFiches.map(fiche => ({
            objectID: fiche._id.toString(),
            title: fiche.title
        }));

        res.json({ message: text, sources });

    } catch (error: any) {
        console.error('Error in RAG chat endpoint:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/gemini/dermo-patient', authenticateToken, async (req, res) => {
    try {
        const { message, history = [], fiche } = req.body;
        if (!fiche) {
            console.error('[DermoPatient] Missing fiche in request body');
            return res.status(400).json({ message: 'Fiche content is required.' });
        }
        const response = await getDermoPatientResponse(history, fiche, message);
        res.json({ message: response });
    } catch (error: any) {
        console.error('CRITICAL: Dermo patient simulation error:', error);
        res.status(500).json({ message: error.message });
    }
});

// NEW: Coach Agent Endpoint
app.post('/api/gemini/coach', authenticateToken, async (req, res) => {
    try {
        const { message, history = [], context = "" } = req.body;
        const response = await getCoachResponse(history, context, message);
        res.json({ message: response });
    } catch (error: any) {
        console.error('CRITICAL: Coach agent error:', error);
        // Return a very detailed message for debugging
        const errorMessage = error.message || "Erreur inconnue";
        res.status(500).json({ message: `Détail technique: ${errorMessage}` });
    }
});

app.post('/api/gemini/evaluate', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { history, topic, ficheId } = req.body;
        const userId = req.user!._id;

        if (!history || !topic) {
            return res.status(400).json({ message: 'History and topic are required.' });
        }

        const evaluation = await evaluateSimulation(history, topic);

        // Save to user profile
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        // Check if user has already read the fiche to determine if it's a post-reading simulation
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        const hasRead = user?.readFiches?.some((rf: any) => rf.ficheId === ficheId);

        const simulationResult: SimulationResult & { ficheId?: string; isPostReading?: boolean } = {
            date: new Date(),
            score: evaluation.score,
            feedback: evaluation.feedback,
            topic: topic,
            ficheId: ficheId,
            isPostReading: !!hasRead,
            conversationHistory: history,
            recommendedFiches: evaluation.recommendedFiches
        };

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { simulationHistory: simulationResult as any } }
        );

        res.json(evaluation);
    } catch (error: any) {
        console.error('Evaluation Error:', error);
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

app.get('/api/gemini/cache-status', (req, res) => {
    res.json({ ready: isCacheReady() });
});

// KONNECT PAYMENT ROUTES
app.post('/api/konnect/initiate-payment', authenticateToken, async (req, res) => {
    try {
        const { amount, planName, firstName, lastName, email, phoneNumber, orderId } = req.body;

        if (!amount || !email || !orderId) {
            return res.status(400).json({ message: 'Missing required payment details.' });
        }

        const KONNECT_API_KEY = process.env.KONNECT_API_KEY;
        const KONNECT_RECEIVER_WALLET_ID = process.env.KONNECT_RECEIVER_WALLET_ID;
        const CLIENT_URL = process.env.CLIENT_URL || 'https://pharmia.tn';

        if (!KONNECT_API_KEY || !KONNECT_RECEIVER_WALLET_ID) {
            console.error('Konnect env vars missing');
            return res.status(500).json({ message: 'Configuration de paiement manquante.' });
        }

        const konnectApiBaseUrl = process.env.KONNECT_API_BASE_URL || 'https://api.konnect.network/api/v2';
        const konnectApiUrl = `${konnectApiBaseUrl}/payments/init-payment`;
        
        const webhookUrl = `${process.env.API_URL || CLIENT_URL}/api/konnect/webhook`; 
        const successUrl = `${CLIENT_URL}/thank-you?orderId=${orderId}&status=success`;
        const failUrl = `${CLIENT_URL}/checkout/${orderId}?error=payment_failed`;

        const konnectRequestBody = {
            receiverWalletId: KONNECT_RECEIVER_WALLET_ID,
            token: "TND",
            amount: Math.round(amount * 1000), 
            type: "immediate",
            description: `Commande ${orderId}`,
            acceptedPaymentMethods: ["bank_card", "e-DINAR"],
            lifespan: 60,
            checkoutForm: true,
            addPaymentFeesToAmount: true,
            firstName: firstName || 'Client',
            lastName: lastName || 'PharmIA',
            phoneNumber: phoneNumber || '99999999',
            email: email,
            orderId: orderId, 
            webhook: webhookUrl,
            successUrl: successUrl,
            failUrl: failUrl,
            theme: "light"
        };

        const konnectHeaders = {
            'x-api-key': KONNECT_API_KEY,
            'Content-Type': 'application/json'
        };

        console.log(`Initiating Konnect payment for Order ${orderId}: ${amount} TND`);

        const konnectResponse = await fetch(konnectApiUrl, {
            method: 'POST',
            headers: konnectHeaders,
            body: JSON.stringify(konnectRequestBody)
        });

        const konnectData: any = await konnectResponse.json();

        if (!konnectResponse.ok) {
            console.error("Konnect Init Error:", konnectData);
            return res.status(konnectResponse.status).json({ message: 'Erreur lors de l\'initialisation du paiement.' });
        }

        res.json({ payUrl: konnectData.payUrl, paymentRef: konnectData.paymentRef });

    } catch (error) {
        console.error('Error initiating Konnect payment:', error);
        res.status(500).json({ message: 'Erreur interne serveur.' });
    }
});

app.get('/api/konnect/webhook', async (req, res) => {
    try {
        const paymentRef = req.query.payment_ref as string;
        if (!paymentRef) return res.status(400).send('Missing payment_ref');

        const KONNECT_API_KEY = process.env.KONNECT_API_KEY;
        const konnectApiUrl = process.env.KONNECT_API_BASE_URL || 'https://api.konnect.network/api/v2';
        
        const response = await fetch(`${konnectApiUrl}/payments/${paymentRef}`, {
            headers: { 'x-api-key': KONNECT_API_KEY! }
        });

        if (!response.ok) {
             console.error(`Konnect Webhook: Failed to verify payment ${paymentRef}`);
             return res.status(400).send('Failed to verify payment');
        }
        
        const data: any = await response.json();
        const { status, orderId } = data.payment;
        
        console.log(`Konnect Webhook: Payment ${paymentRef} for Order ${orderId} is ${status}`);

        if (status === 'completed' || status === 'paid') {
             const db = (await clientPromise).db();
             const orders = db.collection<Order>('orders');
             
             // Update order status
             await orders.updateOne(
                 { _id: new ObjectId(orderId) },
                 { 
                    $set: { 
                        status: OrderStatus.CONFIRMED, 
                        paymentMethod: 'card', 
                        paymentStatus: 'PAID',
                        paidAt: new Date()
                    } 
                 }
             );
             
             // Trigger enrollment logic
             try {
                const order = await orders.findOne({ _id: new ObjectId(orderId) });
                if (order) {
                     const users = db.collection('users');
                     const user = await users.findOne({ _id: new ObjectId(order.userId) });
                     const userEmail = user ? user.email : '';
                     
                     const webinars = db.collection('webinars');

                     const enrollUser = async (wId: string) => {
                         const updateDoc: any = { 
                             $addToSet: { 
                                 attendees: { 
                                     userId: order.userId, 
                                     email: userEmail, 
                                     registrationDate: new Date(), 
                                     paymentStatus: 'PAID',
                                     role: 'ATTENDEE'
                                 }
                             }
                         };
                         await webinars.updateOne({ _id: new ObjectId(wId) }, updateDoc);
                     };

                     for (const item of order.items) {
                         if (item.webinarId) {
                             await enrollUser(item.webinarId.toString());
                         } else if (item.packId) {
                            const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                            if (pack && pack.credits) {
                                await users.updateOne(
                                    { _id: new ObjectId(order.userId) },
                                    { $inc: { masterClassCredits: pack.credits } }
                                );
                            }
                         }
                     }
                }
             } catch (enrollError) {
                 console.error("Error enrolling user after Konnect payment:", enrollError);
             }
        }

        res.send('OK');

    } catch (e) {
        console.error('Webhook Error:', e);
        res.status(500).send('Error');
    }
});
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
        const signature = crypto.createHash('sha256').update(signatureClear).digest('hex');

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
        const expectedSignature = crypto.createHash('sha256').update(signatureClear).digest('hex');

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
app.post('/api/newsletter/send', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    const { subject, htmlContent, roles, cities, statuses, formalGroupIds, webinarId, googleMeetLink, sendToExpired } = req.body;

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

        if (sendToExpired) {
            const now = new Date();
            recipients = await usersCollection.find({
                trialExpiresAt: { $lt: now },
                $or: [
                    { hasActiveSubscription: { $exists: false } },
                    { hasActiveSubscription: false }
                ]
            }).project({ email: 1, firstName: 1, lastName: 1 }).toArray();
        }
        else if (webinarId) {
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

        const validRecipients = recipients.filter(r => {
            if (!r.email || !/\S+@\S+\.\S+/.test(r.email)) {
                console.warn(`Skipping recipient with invalid email: ${r.email || 'N/A'}, ID: ${r._id}`);
                return false;
            }
            return true;
        });

        if (validRecipients.length === 0) {
            return res.status(404).json({ message: 'No recipients with valid email addresses found for the selected criteria.' });
        }

        console.log(`Sending newsletter to ${validRecipients.length} valid recipients (skipped ${recipients.length - validRecipients.length} invalid).`);

        const { sendBulkEmails } = await import('./server/emailService.js');
        
        const emailMessages = validRecipients.map(recipient => {
            const finalHtmlContentWithPlaceholders = htmlContent
                .replace(/{{NOM_DESTINATAIRE}}/g, recipient.firstName || 'cher utilisateur')
                .replace(/{{EMAIL_DESTINATAIRE}}/g, recipient.email);
            
            // Only replace {{USER_ID}} if recipient._id is a valid ObjectId
            const userIdString = ObjectId.isValid(recipient._id) ? recipient._id.toString() : '';
            const contentWithUserId = finalHtmlContentWithPlaceholders.replace(/{{USER_ID}}/g, userIdString);
            
            let finalHtmlContent;
            if (webinarId && fetchedWebinar) { 
                finalHtmlContent = contentWithUserId
                    .replace(/{{LIEN_MEETING}}/g, fetchedWebinar.googleMeetLink || '')
                    .replace(/{{WEBINAR_DESCRIPTION}}/g, fetchedWebinar.description || '');
            } else {
                finalHtmlContent = contentWithUserId;
            }

            return {
                to: [{ email: recipient.email, name: recipient.firstName || '' }],
                subject: finalSubject,
                htmlContent: finalHtmlContent,
            };
        });

        await sendBulkEmails(emailMessages);

        res.status(200).json({ message: `Newsletter successfully sent to ${validRecipients.length} recipients.` });
    } catch (error) {
        console.error('Error sending newsletter:', error);
        res.status(500).json({ message: 'An error occurred while sending the newsletter.' });
    }
});


app.post('/api/newsletter/send-test', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { subject, htmlContent, testEmails, webinarId, sendToExpired } = req.body;

        if (!subject || !htmlContent || !Array.isArray(testEmails) || testEmails.length === 0) {
            return res.status(400).json({ message: 'Le sujet, le contenu HTML et une liste d\'e-mails de test sont requis.' });
        }
        
        let finalHtmlContent = htmlContent;

        // Replace {{USER_ID}} with an empty string for test emails, as actual user IDs are not available
        finalHtmlContent = finalHtmlContent.replace(/{{USER_ID}}/g, '');

        if (webinarId) {
            const client = await clientPromise;
            const db = client.db('pharmia');
            const webinarsCollection = db.collection('webinars');
            const webinar = await webinarsCollection.findOne({ _id: new ObjectId(webinarId) });

            if (webinar && webinar.googleMeetLink) {
                finalHtmlContent = htmlContent.replace(/{{LIEN_MEETING}}/g, webinar.googleMeetLink);
            }
        }

        if (sendToExpired) {
            // Add a test user for the expired trial scenario
            testEmails.push('test.expired@pharmia.com');
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

// SURVEY ROUTES
app.get('/api/survey/rating', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { score } = req.query;
    const userId = req.user?._id; // Get userId from authenticated user

    if (!score || !userId) {
        return res.status(400).redirect(`${process.env.CLIENT_URL}#/`); // Redirect to home on error
    }

    const scoreNum = parseInt(score as string, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
        return res.status(400).redirect(`${process.env.CLIENT_URL}#/`); // Redirect to home on invalid score
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const ratingsCollection = db.collection<Rating>('ratings');
        
        const newRating: Rating = {
            score: scoreNum,
            userId: new ObjectId(userId as string), // userId is already ObjectId or string
            createdAt: new Date(),
        };

        await ratingsCollection.insertOne(newRating);
        // Redirect to a thank you page
        res.redirect(`${process.env.CLIENT_URL}#/thank-you`);

    } catch (error) {
        console.error('Error saving survey rating:', error);
        res.status(500).redirect(`${process.env.CLIENT_URL}#/`); // Redirect to home on server error
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
    // await migrateWebinars();
    // await migrateWebinarGroup();
    console.log(`Server is running on http://localhost:${port}`);
    
    // Initialize Cron Jobs
    initCronJobs();

    // Initial Knowledge Base Generation & Caching (Background)
    if (process.env.NODE_ENV === 'production') {
        console.log('[Startup] Triggering Knowledge Base update...');
        generateKnowledgeBase()
            .then(path => refreshKnowledgeBaseCache(path))
            .then(() => console.log('[Startup] Knowledge Base updated and cached.'))
            .catch(err => console.error('[Startup] Failed to update Knowledge Base:', err));
    }

    // await ensureAdminUserExists();
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