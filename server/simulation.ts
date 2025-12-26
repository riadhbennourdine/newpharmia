import express from 'express';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { User } from '../types.js';

const router = express.Router();

// Récupérer la simulation active (pour restauration après refresh)
router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user!._id;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        res.json(user?.activeSimulation || null);
    } catch (error) {
        console.error('Error fetching active simulation:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Journaliser un nouveau message (User ou IA)
router.post('/log', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { role, text, topic } = req.body;
        const userId = req.user!._id;

        if (!role || !text) return res.status(400).json({ message: 'Données manquantes.' });

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const timestamp = new Date();
        const messageEntry = { role, text, timestamp };

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user?.activeSimulation || user.activeSimulation.topic !== topic) {
            // Initialisation d'une nouvelle simulation active
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        activeSimulation: {
                            topic: topic || 'Discussion',
                            messages: [messageEntry],
                            lastUpdated: timestamp
                        }
                    } 
                }
            );
        } else {
            // Ajout du message à la simulation existante
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $push: { "activeSimulation.messages": messageEntry } as any,
                    $set: { "activeSimulation.lastUpdated": timestamp }
                }
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error logging simulation message:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Nettoyer la simulation active (après évaluation)
router.delete('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user!._id;
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $unset: { activeSimulation: "" } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing active simulation:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;
