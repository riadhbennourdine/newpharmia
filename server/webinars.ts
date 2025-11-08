import express from 'express';
import { Webinar, UserRole, WebinarGroup } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole, softAuthenticateToken } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

const router = express.Router();

// GET all webinars, optionally filtered by group
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        
        const { group } = req.query;
        
        const query: any = {};
        if (group) {
            query.group = group;
        }

        const webinars = await webinarsCollection.find(query).sort({ date: -1 }).toArray();
        res.json(webinars);
    } catch (error) {
        console.error('Error fetching webinars:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des webinaires.' });
    }
});

// GET a single webinar by ID
router.get('/:id', softAuthenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        const webinar = await webinarsCollection.findOne({ _id: new ObjectId(id) }, { readPreference: 'primary' });

        if (!webinar) {
            return res.status(404).json({ message: 'Webinaire non trouvé.' });
        }

        console.log('[Webinar Debug] Entering GET /:id handler.');
        const webinarResponse = { ...webinar } as Partial<Webinar> & { isRegistered?: boolean; registrationStatus?: string | null };

        const authReq = req as AuthenticatedRequest;
        if (authReq.user) {
            const userIdString = authReq.user._id.toString();
            console.log(`[Webinar Debug] Authenticated user ID: ${userIdString}`);
            console.log('[Webinar Debug] Webinar attendees:', JSON.stringify(webinar.attendees, null, 2));

            const attendee = webinar.attendees.find(
                att => att.userId.toString() === userIdString
            );

            if (attendee) {
                console.log(`[Webinar Debug] Match found! Attendee status: ${attendee.status}`);
            } else {
                console.log('[Webinar Debug] No match found for user in attendees list.');
            }

            webinarResponse.isRegistered = !!attendee;
            webinarResponse.registrationStatus = attendee?.status || null;

            // Hide the meet link if the user is not confirmed
            if (attendee?.status !== 'CONFIRMED') {
                delete webinarResponse.googleMeetLink;
            }
        } else {
            console.log('[Webinar Debug] No authenticated user found.');
            // User is not logged in
            webinarResponse.isRegistered = false;
            webinarResponse.registrationStatus = null;
            delete webinarResponse.googleMeetLink;
        }

        // Admins can see the full list of attendees, others cannot.
        if (authReq.user?.role !== UserRole.ADMIN) {
            delete webinarResponse.attendees;
        }
        
        res.setHeader('Cache-Control', 'no-store');
        res.json(webinarResponse);

    } catch (error) {
        console.error('Error fetching webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du webinaire.' });
    }
});

// POST to create a new webinar (Admin only)
router.post('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { title, description, date, presenter, registrationLink, imageUrl, googleMeetLink, group } = req.body;

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
            imageUrl: imageUrl || '',
            googleMeetLink: googleMeetLink || '',
            group: group || WebinarGroup.PHARMIA,
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

        // Remove fields that should not be updated from the payload
        delete updates._id;
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
router.post('/:id/register', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
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
        
                const webinar = await webinarsCollection.findOne({ _id: new ObjectId(id) }, { readPreference: 'primary' });
        
                if (!webinar) {
                    return res.status(404).json({ message: 'Webinaire non trouvé.' });
                }        
                // Check if user is already registered
                const isRegistered = webinar.attendees.some(att => att.userId.toString() === userId.toString());
        if (isRegistered) {
            return res.status(409).json({ message: 'Vous êtes déjà inscrit à ce webinaire.' });
        }

        const newAttendee = {
            userId: new ObjectId(userId),
            status: 'PENDING' as 'PENDING' | 'CONFIRMED',
            registeredAt: new Date()
        };

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $push: { attendees: newAttendee } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar not found.' });
        }

        res.json({ message: 'Successfully registered for the webinar. Please submit payment to confirm.' });
    } catch (error) {
        console.error('Error registering for webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de l\'inscription au webinaire.' });
    }
});

// POST for a user to submit their proof of payment
router.post('/:id/submit-payment', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const { proofUrl } = req.body;
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user._id;

        if (!proofUrl) {
            return res.status(400).json({ message: 'Proof of payment URL is required.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id), "attendees.userId": new ObjectId(userId) },
            { $set: { "attendees.$.proofUrl": proofUrl, "attendees.$.status": 'PAYMENT_SUBMITTED' as any } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar or registration not found.' });
        }

        res.json({ message: 'Proof of payment submitted successfully.' });

    } catch (error) {
        console.error('Error submitting payment proof:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// POST for an admin to confirm a payment
router.post('/:webinarId/attendees/:userId/confirm', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { webinarId, userId } = req.params;

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(webinarId), "attendees.userId": new ObjectId(userId) },
            { $set: { "attendees.$.status": 'CONFIRMED' } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar or registration not found.' });
        }

        res.json({ message: 'Payment confirmed successfully.' });

    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


export default router;
