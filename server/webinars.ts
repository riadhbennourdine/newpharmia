import express from 'express';
import { Webinar, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from './users.js';

const router = express.Router();

// GET all webinars
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        const webinars = await webinarsCollection.find({}).sort({ date: -1 }).toArray();
        res.json(webinars);
    } catch (error) {
        console.error('Error fetching webinars:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des webinaires.' });
    }
});

// GET a single webinar by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        const webinar = await webinarsCollection.findOne({ _id: new ObjectId(id) });

        if (!webinar) {
            return res.status(404).json({ message: 'Webinar not found.' });
        }
        res.json(webinar);
    } catch (error) {
        console.error('Error fetching webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du webinaire.' });
    }
});

// POST to create a new webinar (Admin only)
router.post('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { title, description, date, presenter, registrationLink } = req.body;

        if (!title || !description || !date || !presenter) {
            return res.status(400).json({ message: 'Title, description, date, and presenter are required.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const newWebinar: Omit<Webinar, '_id'> = {
            title,
            description,
            date: new Date(date),
            presenter,
            registrationLink: registrationLink || '',
            attendees: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await webinarsCollection.insertOne(newWebinar as Webinar);

        if (result.acknowledged) {
            res.status(201).json({ message: 'Webinar created successfully.', webinarId: result.insertedId });
        } else {
            res.status(500).json({ message: 'Failed to create webinar.' });
        }

    } catch (error) {
        console.error('Error creating webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la création du webinaire.' });
    }
});

// PUT to update a webinar (Admin only)
router.put('/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID.' });
        }

        // Remove attendees from updates, should be handled by register/unregister endpoints
        delete updates.attendees; 
        updates.updatedAt = new Date();
        if(updates.date) {
            updates.date = new Date(updates.date);
        }


        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar not found.' });
        }

        res.json({ message: 'Webinar updated successfully.' });
    } catch (error) {
        console.error('Error updating webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour du webinaire.' });
    }
});

// DELETE a webinar (Admin only)
router.delete('/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection('webinars');

        const result = await webinarsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Webinar not found' });
        }

        res.status(200).json({ message: 'Webinar deleted successfully' });
    } catch (error) {
        console.error('Error deleting webinar:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// POST to register the current user for a webinar
router.post('/:id/register', authenticateToken, async (req: any, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID.' });
        }

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $addToSet: { attendees: new ObjectId(userId) } } // Use $addToSet to prevent duplicate registrations
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar not found.' });
        }

        res.json({ message: 'Successfully registered for the webinar.' });
    } catch (error) {
        console.error('Error registering for webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'inscription au webinaire.' });
    }
});


export default router;
