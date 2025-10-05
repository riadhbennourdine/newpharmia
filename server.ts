import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import cors from 'cors';
// FIX: Added imports for ES module scope __dirname
import { fileURLToPath } from 'url';
import { handleSubscription, handleUnsubscription } from './server/subscribe';
import { generateCaseStudyDraft, generateLearningTools, getChatResponse } from './server/geminiService';
import { User, UserRole, CaseStudy } from './types';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

import clientPromise from './server/mongo';

// FIX: Define __filename and __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In production, serve static files from the build directory
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
}



// Mock user data
const mockUsers: User[] = [
    { _id: 'admin1', email: 'admin@pharmia.com', role: UserRole.ADMIN, firstName: 'Admin', lastName: 'User', passwordHash: 'hashedpassword', hasActiveSubscription: true },
    { _id: 'formateur1', email: 'formateur@pharmia.com', role: UserRole.FORMATEUR, firstName: 'Formateur', lastName: 'User', passwordHash: 'hashedpassword' },
    { _id: 'apprenant1', email: 'apprenant@pharmia.com', role: UserRole.APPRENANT, firstName: 'Apprenant', lastName: 'User', passwordHash: 'hashedpassword', profileIncomplete: true },
    { _id: 'pharmacien1', email: 'pharmacien@pharmia.com', role: UserRole.PHARMACIEN, firstName: 'Pharmacien', lastName: 'User', passwordHash: 'hashedpassword' },
];

import crypto from 'crypto';
import { sendBrevoEmail } from './server/emailService';

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

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

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

        res.json({
            data: fiches,
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
        const client = await clientPromise;
        const db = client.db('pharmia');
        const memofichesCollection = db.collection<CaseStudy>('memofiches');

        // MongoDB _id is an ObjectId, so we need to convert the string id
        const { ObjectId } = await import('mongodb');
        if (!ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'ID de mémofiche invalide.' });
        }
        const fiche = await memofichesCollection.findOne({ _id: new ObjectId(id) });

        if (fiche) {
            res.json(fiche);
        } else {
            res.status(404).json({ message: 'Mémofiche non trouvée' });
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
        });

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
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required.' });
        }
        console.log('Calling generateCaseStudyDraft with prompt:', prompt);
        const draft = await generateCaseStudyDraft(prompt);
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

app.post('/api/newsletter/send', async (req, res) => {
    try {
        const { subject, htmlContent, roles, cities } = req.body;

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

        const subscribers = await usersCollection.find(query).toArray();

        if (subscribers.length === 0) {
            return res.status(404).json({ message: 'Aucun abonné trouvé pour les critères spécifiés.' });
        }

        const sendPromises = subscribers.map(async (subscriber) => {
            const personalizedHtmlContent = htmlContent
                .replace(/\{\{NOM_DESTINATAIRE\}\}/g, subscriber.firstName || subscriber.email)
                .replace(/\{\{EMAIL_DESTINATAIRE\}\}/g, subscriber.email);
            return sendBrevoEmail({
                to: subscriber.email,
                subject,
                htmlContent: personalizedHtmlContent,
            });
        });

        await Promise.all(sendPromises);

        res.json({ message: `Newsletter envoyée à ${subscribers.length} abonnés.` });

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

        res.json({ roles: rolesWithCounts, cities: citiesWithCounts, staff: staffGroup });
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
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});