import express from 'express';
import { User, UserRole, ClientStatus, Appointment } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// GET all clients (pharmacists with active subscription)
router.get('/clients', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const clients = await usersCollection.aggregate([
            {
                $match: {
                    role: UserRole.PHARMACIEN,
                    hasActiveSubscription: true,
                    planName: { $ne: 'Trial' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { pharmacist_id: "$_id" },
                    pipeline: [
                        { $match: 
                            { $expr: 
                                { $eq: [ "$pharmacistId", "$$pharmacist_id" ] }
                            }
                        },
                        { $count: "count" }
                    ],
                    as: 'teamInfo'
                }
            },
            {
                $addFields: {
                    teamSize: { $ifNull: [ { $arrayElemAt: ["$teamInfo.count", 0] }, 0 ] }
                }
            },
            {
                $project: {
                    teamInfo: 0
                }
            }
        ]).toArray();
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
            // If user exists, update them to be a prospect with a trial
            const result = await usersCollection.updateOne(
                { _id: existingUser._id },
                { 
                    $set: { 
                        status: ClientStatus.PROSPECT,
                        hasActiveSubscription: true,
                        planName: 'Trial',
                        subscriptionStartDate: new Date(),
                        subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 15)), // 15-day trial
                    } 
                }
            );
            if (result.modifiedCount > 0) {
                return res.status(200).json({ message: 'User updated to prospect with a trial successfully.' });
            } else {
                return res.status(200).json({ message: 'User is already a prospect or no changes were needed.' });
            }
        }

        const newUser: Partial<User> = {
            email,
            firstName,
            lastName,
            companyName,
            role: UserRole.PHARMACIEN,
            status: ClientStatus.PROSPECT,
            createdAt: new Date(),
            hasActiveSubscription: true,
            planName: 'Trial',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 15)), // 15-day trial
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

// GET all prospects
router.get('/prospects', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const prospects = await usersCollection.find({
            role: UserRole.PHARMACIEN,
            $or: [
                { hasActiveSubscription: { $exists: false } },
                { hasActiveSubscription: false },
                { planName: 'Trial' }
            ]
        }).toArray();
        res.json(prospects);
    } catch (error) {
        console.error('Error fetching prospects:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des prospects.' });
    }
});

// GET all contacts (clients and prospects)
router.get('/all-contacts', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection<User>('users');
        const contacts = await usersCollection.find({ role: UserRole.PHARMACIEN }).toArray();
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching all contacts:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des contacts.' });
    }
});

// APPOINTMENTS

// GET all appointments
router.get('/appointments', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const appointmentsCollection = db.collection<Appointment>('appointments');
        const appointments = await appointmentsCollection.find({}).sort({ date: 1 }).toArray();
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des rendez-vous.' });
    }
});

// POST a new appointment
router.post('/appointments', async (req, res) => {
    try {
        const { clientId, clientName, date, title, notes } = req.body;

        if (!clientId || !date || !title) {
            return res.status(400).json({ message: 'Client, date and title are required.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const appointmentsCollection = db.collection<Appointment>('appointments');

        const newAppointment: Omit<Appointment, '_id'> = {
            clientId: new ObjectId(clientId),
            clientName,
            date: new Date(date),
            title,
            notes,
            createdAt: new Date(),
        };

        const result = await appointmentsCollection.insertOne(newAppointment as Appointment);

        if (result.acknowledged) {
            res.status(201).json({ message: 'Appointment created successfully.' });
        } else {
            res.status(500).json({ message: 'Failed to create appointment.' });
        }

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création du rendez-vous.' });
    }
});

// PUT to update an appointment (add notes)
router.put('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid appointment ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const appointmentsCollection = db.collection<Appointment>('appointments');

        const result = await appointmentsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { notes } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        res.json({ message: 'Appointment updated successfully.' });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du rendez-vous.' });
    }
});

// GET all appointments for a client
router.get('/clients/:id/appointments', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid client ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const appointmentsCollection = db.collection<Appointment>('appointments');
        const appointments = await appointmentsCollection.find({ clientId: new ObjectId(id) }).sort({ date: -1 }).toArray();
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching client appointments:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des rendez-vous du client.' });
    }
});

export default router;