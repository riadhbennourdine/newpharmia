import express from 'express';
import { User, UserRole, ClientStatus } from '../types';
import clientPromise from './mongo';
import { ObjectId } from 'mongodb';

const router = express.Router();

// GET all clients (pharmacists)
router.get('/clients', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const clients = await usersCollection.find({ role: UserRole.PHARMACIEN }).toArray();
        res.json(clients);
    } catch (error) {
        console.error('Error fetching CRM clients:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des clients.' });
    }
});

// GET a single client by ID
router.get('/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid client ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });

        if (!user) {
            return res.status(404).json({ message: 'Client not found.' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du client.' });
    }
});

// PUT to update a client
router.put('/clients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid client ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Client not found.' });
        }

        res.json({ message: 'Client updated successfully.' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du client.' });
    }
});

// POST to create a new prospect
router.post('/prospects', async (req, res) => {
    try {
        const { email, firstName, lastName, companyName } = req.body;

        if (!email || !firstName || !lastName) {
            return res.status(400).json({ message: 'Email, first name and last name are required.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        const newUser: Partial<User> = {
            email,
            firstName,
            lastName,
            companyName,
            role: UserRole.PHARMACIEN,
            status: ClientStatus.PROSPECT,
            createdAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser as User);

        // Also add to subscribers list if not already there
        const subscribersCollection = db.collection('subscribers');
        const existingSubscriber = await subscribersCollection.findOne({ email });
        if (!existingSubscriber) {
            await subscribersCollection.insertOne({
                email,
                subscribedAt: new Date(),
            });
        }

        if (result.acknowledged) {
            res.status(201).json({ message: 'Prospect created successfully.' });
        } else {
            res.status(500).json({ message: 'Failed to create prospect.' });
        }

    } catch (error) {
        console.error('Error creating prospect:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création du prospect.' });
    }
});

export default router;