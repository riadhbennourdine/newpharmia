import './server/env.js';
import express from 'express';
import path from 'path';
import cors from 'cors';
// FIX: Added imports for ES module scope __dirname
import { fileURLToPath } from 'url';
import { handleSubscription, handleUnsubscription } from './server/subscribe.js';
import { generateCaseStudyDraft, generateLearningTools, getChatResponse } from './server/geminiService.js';
import { User, UserRole, CaseStudy, Group } from './types.js';
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

import crypto from 'crypto';
import { sendBrevoEmail } from './server/emailService.js';
import multer from 'multer';

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

        console.log('User found:', user);

        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(password, user.passwordHash);

            if (isMatch) {
                // Passwords match, generate a token (using a mock for now)
                // TODO: Replace with a real JWT implementation
                const token = 'mock-jwt-token'; 
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

        await sendBrevoEmail({
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

// USER ROUTES
app.post('/api/users/:userId/read-fiches', async (req, res) => {
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

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) as any }, // Cast to any to satisfy TS if _id is string in type
            { $addToSet: { readFicheIds: ficheId } as any } // Cast to any for the same reason
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

app.post('/api/users/:userId/quiz-history', async (req, res) => {
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

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

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

// USER ROUTES
app.get('/api/users/pharmacists', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const pharmacists = await usersCollection.find({ role: UserRole.PHARMACIEN }).toArray();
        res.json(pharmacists);
    } catch (error) {
        console.error('Error fetching pharmacists:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des pharmaciens.' });
    }
});

app.get('/api/users/preparateurs', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const preparateurs = await usersCollection.find({ role: UserRole.PREPARATEUR }).toArray();
        res.json(preparateurs);
    } catch (error) {
        console.error('Error fetching preparateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des préparateurs.' });
    }
});

app.get('/api/users/subscribers', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const subscribers = await usersCollection.find({
            role: UserRole.PHARMACIEN
        }).toArray();
        res.json(subscribers);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des abonnés.' });
    }
});

// ===============================================
// CRM API ROUTES
// ===============================================



import crmRoutes from './server/crm.js';
import groupsRoutes from './server/groups.js';

// ===============================================
// CRM API ROUTES
// ===============================================
app.use('/api/admin/crm', crmRoutes);
app.use('/api/admin/groups', groupsRoutes);


app.put('/api/users/preparateurs/:preparateurId/assign-pharmacist', async (req, res) => {
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

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

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

app.get('/api/users/pharmacists/:pharmacistId/team', async (req, res) => {
    try {
        const { pharmacistId } = req.params;
        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(pharmacistId)) {
            return res.status(400).json({ message: 'Invalid pharmacistId.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const team = await usersCollection.find({ role: UserRole.PREPARATEUR, pharmacistId: new ObjectId(pharmacistId) as any }).toArray();
        res.json(team);
    } catch (error) {
        console.error('Error fetching pharmacist team:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de l\'équipe.' });
    }
});

app.put('/api/users/:userId/subscription', async (req, res) => {
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

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

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
            sortBy = 'default' // 'newest'
        } = req.query as { [key: string]: string };

        const userId = req.headers['x-user-id'] as string; // THIS IS A TEMPORARY, INSECURE SOLUTION
        console.log('x-user-id:', userId);

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');
        const usersCollection = db.collection<User>('users');
        const groupsCollection = db.collection<Group>('groups');

        let user: User | null = null;
        let group: Group | null = null;

        if (userId && ObjectId.isValid(userId)) {
            user = await usersCollection.findOne({ _id: new ObjectId(userId) });
            console.log('User from DB:', user);
            if (user && user.groupId) {
                group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
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
                if(user.role === UserRole.ADMIN) {
                    hasAccess = true;
                } else {
                    const trialExpiresAt = user.trialExpiresAt || (user.createdAt ? new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null);
                    if (user.hasActiveSubscription || (trialExpiresAt && new Date(trialExpiresAt) > new Date())) {
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
            return res.json({ ...fiche, isLocked: false });
        }

        let user: User | null = null;
        if (userId && ObjectId.isValid(userId)) {
            user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        }

        let hasAccess = false;
        if (user) {
            if(user.role === UserRole.ADMIN) {
                hasAccess = true;
            } else {
                console.log('User object for access check:', JSON.stringify(user, null, 2));
                const trialExpiresAt = user.trialExpiresAt || (user.createdAt ? new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null);
                console.log('Calculated trialExpiresAt:', trialExpiresAt);
                console.log('Is trial still valid?:', trialExpiresAt && new Date(trialExpiresAt) > new Date());

                if (user.hasActiveSubscription || (trialExpiresAt && new Date(trialExpiresAt) > new Date())) {
                    hasAccess = true;
                }

                if (!hasAccess && user.groupId) {
                    const group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
                    if (group && group.assignedFiches.some(f => f.ficheId === id)) {
                        hasAccess = true;
                    }
                }
            }
        }

        if (hasAccess) {
            res.json({ ...fiche, isLocked: false });
        } else {
            res.status(403).json({ message: 'Accès non autorisé. Veuillez vous abonner.', isLocked: true });
        }

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
            const insertedFiche = { _id: result.insertedId, ...ficheData, creationDate: new Date().toISOString() };
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

        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Mémofiche non trouvée' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error('Error deleting memofiche:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression de la mémofiche.' });
    }
});


// GEMINI ROUTES
app.post('/api/gemini/generate-draft', async (req, res) => {
    try {
        const { prompt, memoFicheType } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required.' });
        }
        console.log('Calling generateCaseStudyDraft with prompt:', prompt);
        const draft = await generateCaseStudyDraft(prompt, memoFicheType);
        console.log('generateCaseStudyDraft returned draft:', draft);
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

app.post('/api/gemini/chat', async (req, res) => {
    try {
        const { messages, context } = req.body;

        if (!messages || !context) {
            return res.status(400).json({ message: 'Messages and context are required.' });
        }

        const history = messages.slice(0, -1);
        const question = messages[messages.length - 1].text;
        const caseStudy = JSON.parse(context);
        const title = caseStudy.title;

        const text = await getChatResponse(history, context, question, title);
        res.json({ message: text });

    } catch (error: any) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ message: error.message });
    }
});

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
});

app.post('/api/newsletter/send', async (req, res) => {
    try {
        const { subject, htmlContent, roles, cities, statuses } = req.body;

        if (!subject || !htmlContent) {
            return res.status(400).json({ message: 'Le sujet et le contenu HTML sont requis.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        let query: any = {
            email: { $exists: true, $ne: null }
        };

        const finalRoles = [];
        if (roles && roles.length > 0) {
            if (roles.includes('Staff PharmIA')) {
                finalRoles.push(UserRole.ADMIN, UserRole.FORMATEUR);
            }
            const otherRoles = roles.filter(r => r !== 'Staff PharmIA');
            finalRoles.push(...otherRoles);
        }

        if (finalRoles.length > 0) {
            query.role = { $in: finalRoles };
        }

        if (cities && cities.length > 0) {
            query.city = { $in: cities };
        }

        if (statuses && statuses.length > 0) {
            query.status = { $in: statuses };
        }

        console.log('Query:', JSON.stringify(query, null, 2));
        const subscribers = await usersCollection.find(query).toArray();
        console.log('Subscribers found:', subscribers.length);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validSubscribers = subscribers.filter(s => s.email && emailRegex.test(s.email));

        console.log('Valid subscribers found:', validSubscribers.length);
        console.log('Valid subscriber emails:', validSubscribers.map(s => s.email));


        if (validSubscribers.length === 0) {
            return res.status(404).json({ message: 'Aucun abonné valide trouvé pour les critères spécifiés.' });
        }

        const sendPromises = validSubscribers.map(async (subscriber) => {
            const personalizedHtmlContent = htmlContent
                .replace('{{NOM_DESTINATAIRE}}', subscriber.firstName || subscriber.email)
                .replace('{{EMAIL_DESTINATAIRE}}', subscriber.email);
            return sendBrevoEmail({
                to: subscriber.email,
                subject: `${subject} - ${new Date().toLocaleDateString()}`,
                htmlContent: personalizedHtmlContent,
            });
        });

        await Promise.all(sendPromises);

        res.json({ message: `Newsletter envoyée à ${validSubscribers.length} abonnés.` });

    } catch (error) {
        console.error('Error sending newsletter:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'envoi de la newsletter.' });
    }
});

app.post('/api/newsletter/send-test', async (req, res) => {
    try {
        const { subject, htmlContent, testEmail } = req.body;

        if (!subject || !htmlContent || !testEmail) {
            return res.status(400).json({ message: 'Le sujet, le contenu HTML et l\'e-mail de test sont requis.' });
        }

        if (!/\S+@\S+\.\S+/.test(testEmail)) {
            return res.status(400).json({ message: 'Adresse e-mail de test invalide.' });
        }

        await sendBrevoEmail({
            to: testEmail,
            subject: subject,
            htmlContent,
        });

        res.json({ message: `E-mail de test envoyé à ${testEmail}.` });

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

        await sendBrevoEmail({
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


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});