import express from 'express';
import jwt from 'jsonwebtoken';
import { addToNewsletterGroup } from './subscribe.js';
import { Webinar, UserRole, WebinarGroup, WebinarStatus, ClientStatus } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole, softAuthenticateToken } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

const router = express.Router();

function getWebinarCalculatedStatus(webinarDate: Date): WebinarStatus {
    const now = new Date();
    const webinarStart = new Date(webinarDate);
    
    // Normalize dates to compare only the day
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const webinarDay = new Date(webinarStart.getFullYear(), webinarStart.getMonth(), webinarStart.getDate());

    if (webinarDay.getTime() === today.getTime()) {
        // If it's today, check the time
        if (now >= webinarStart) {
            return WebinarStatus.LIVE;
        } else {
            return WebinarStatus.UPCOMING;
        }
    } else if (webinarDay < today) {
        return WebinarStatus.PAST;
    } else {
        return WebinarStatus.UPCOMING;
    }
}

function standardizeProofUrl(url: string | undefined): string {
    if (!url) return '';

    // If it's already an external URL, keep it as is
    if (url.startsWith('https://') || url.startsWith('http://')) {
        return url;
    }

    // Handle /api/ftp/view?filePath=/path/from/ftp.jpg
    if (url.includes('/api/ftp/view?filePath=')) {
        try {
            const urlObj = new URL(`http://dummy.com${url}`); // Use a dummy base for URL parsing
            const filePath = urlObj.searchParams.get('filePath');
            if (filePath) {
                // Ensure it's a clean path relative to /uploads
                return `/uploads/${filePath.replace(/^\/uploads\//, '').replace(/^\//, '')}`;
            }
        } catch (e) {
            console.error('Error parsing filePath from proofUrl:', url, e);
            return url; // Fallback to original if parsing fails
        }
    }
    
    // Handle /api/ftp/view/file-name.jpg
    if (url.startsWith('/api/ftp/view/')) {
        const path = url.replace('/api/ftp/view/', '');
        return `/uploads/${path.replace(/^\/uploads\//, '').replace(/^\//, '')}`;
    }

    // If it starts with /uploads/ and potentially has /uploads/uploads/, clean it
    if (url.startsWith('/uploads/')) {
        return url.replace('/uploads/uploads/', '/uploads/');
    }

    return url; // Default: return as is if no specific pattern matched
}

// GET all webinars, optionally filtered by group
router.get('/', softAuthenticateToken, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        const usersCollection = db.collection('users');
        
        const { group } = req.query;
        
        const query: any = {};
        if (group) {
            query.group = group;
        }

        const webinars = await webinarsCollection.find(query).sort({ date: -1 }).toArray();

        const authReq = req as AuthenticatedRequest;
        const userIdString = authReq.user?._id.toString();
        
        // Safer, case-insensitive role check
        const userRole = authReq.user?.role?.trim().toUpperCase();
        const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.ADMIN_WEBINAR;

        const webinarsWithStatus = webinars.map(webinar => {
            const webinarResponse = { ...webinar } as Partial<Webinar> & { isRegistered?: boolean; registrationStatus?: string | null; calculatedStatus?: WebinarStatus };
            webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar.date);

            if (isAdmin) {
                // Admins can see everything, so we don't delete anything.
            } else if (userIdString) {
                const attendee = webinar.attendees.find(
                    att => att.userId.toString() === userIdString
                );
                webinarResponse.isRegistered = !!attendee;
                webinarResponse.registrationStatus = attendee?.status || null;
                // Keep googleMeetLink if user is CONFIRMED AND (webinar is LIVE or UPCOMING)
                if (attendee?.status === 'CONFIRMED' && (webinarResponse.calculatedStatus === WebinarStatus.LIVE || webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)) {
                    // Do nothing, keep the link
                } else {
                    delete webinarResponse.googleMeetLink;
                }
            } else {
                webinarResponse.isRegistered = false;
                webinarResponse.registrationStatus = null;
                delete webinarResponse.googleMeetLink;
            }
            return webinarResponse;
        });

        // If the user is an admin or webinar admin, populate attendee details
        if (isAdmin) {
            const allUserIds = webinars.flatMap(w => w.attendees.map(a => new ObjectId(a.userId as string)));
            const uniqueUserIds = [...new Set(allUserIds.map(id => id.toHexString()))].map(hex => new ObjectId(hex));

            if (uniqueUserIds.length > 0) {
                const users = await usersCollection.find(
                    { _id: { $in: uniqueUserIds } },
                    { projection: { firstName: 1, lastName: 1, username: 1, email: 1 } }
                ).toArray();

                const userMap = new Map(users.map(u => [u._id.toHexString(), u]));

                webinarsWithStatus.forEach(webinar => {
                    webinar.attendees.forEach(attendee => {
                        const userDetails = userMap.get(new ObjectId(attendee.userId as string).toHexString());
                        if (userDetails) {
                            attendee.userId = userDetails;
                        }
                    });
                });
            }
        } else {
            // For non-admins, don't send attendee details
            webinarsWithStatus.forEach(webinar => {
                delete (webinar as Partial<Webinar>).attendees;
            });
        }

        res.json(webinarsWithStatus);
    } catch (error) {
        console.error('Error fetching webinars:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération des webinaires.' });
    }
});

// GET the webinars the current user is registered for
router.get('/my-webinars', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user._id;
        const userRole = req.user.role;

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        let webinars;
        if (userRole === UserRole.ADMIN || userRole === UserRole.ADMIN_WEBINAR) {
            webinars = await webinarsCollection.find({}).sort({ date: -1 }).toArray();
        } else {
            webinars = await webinarsCollection.find({ "attendees.userId": new ObjectId(userId) }).sort({ date: -1 }).toArray();
        }

        const webinarsWithStatus = webinars.map(webinar => {
            const webinarResponse = { ...webinar } as Partial<Webinar> & { isRegistered?: boolean; registrationStatus?: string | null; calculatedStatus?: WebinarStatus };
            webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar.date);

            const attendee = webinar.attendees.find(
                att => att.userId.toString() === userId.toString()
            );
            webinarResponse.isRegistered = !!attendee;
            webinarResponse.registrationStatus = attendee?.status || null;
            
            if (attendee?.status === 'CONFIRMED' && (webinarResponse.calculatedStatus === WebinarStatus.LIVE || webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)) {
                // Keep the googleMeetLink
            } else {
                delete webinarResponse.googleMeetLink;
            }
            
            // For non-admins, don't send the full attendees list for privacy
            if (userRole !== UserRole.ADMIN && userRole !== UserRole.ADMIN_WEBINAR) {
                delete webinarResponse.attendees;
            }

            return webinarResponse;
        });

        res.json(webinarsWithStatus);
    } catch (error) {
        console.error('Error fetching my-webinars:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération de vos webinaires.' });
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
        const webinarResponse = { ...webinar } as Partial<Webinar> & { isRegistered?: boolean; registrationStatus?: string | null; calculatedStatus?: WebinarStatus };
        webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar.date);

        const authReq = req as AuthenticatedRequest;
        
        // Safer, case-insensitive role check
        const userRole = authReq.user?.role?.trim().toUpperCase();
        const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.ADMIN_WEBINAR;

        if (isAdmin) {
            // Admins can see everything.
        } else if (authReq.user) {
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

            // Keep googleMeetLink if user is CONFIRMED AND (webinar is LIVE or UPCOMING)
            if (attendee?.status === 'CONFIRMED' && (webinarResponse.calculatedStatus === WebinarStatus.LIVE || webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)) {
                // Do nothing, keep the link
            } else {
                delete webinarResponse.googleMeetLink;
            }
        } else {
            console.log('[Webinar Debug] No authenticated user found.');
            // User is not logged in
            webinarResponse.isRegistered = false;
            webinarResponse.registrationStatus = null;
            delete webinarResponse.googleMeetLink;
        }

        // Admins and webinar admins can see the full list of attendees, others cannot.
        if (isAdmin) {
            const userIds = webinar.attendees.map(a => new ObjectId(a.userId as string));
            if (userIds.length > 0) {
                const usersCollection = db.collection('users');
                const users = await usersCollection.find(
                    { _id: { $in: userIds } },
                    { projection: { firstName: 1, lastName: 1, username: 1, email: 1 } }
                ).toArray();
                const userMap = new Map(users.map(u => [u._id.toHexString(), u]));
                webinarResponse.attendees.forEach(attendee => {
                    const userDetails = userMap.get(new ObjectId(attendee.userId as string).toHexString());
                    if (userDetails) {
                        attendee.userId = userDetails;
                    }
                });
            }
        } else {
            delete webinarResponse.attendees;
        }
        
        res.setHeader('Cache-Control', 'no-store');
        res.json(webinarResponse);

    } catch (error) {
        console.error('Error fetching webinar:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la récupération du webinaire.' });
    }
});

// POST to get multiple webinars by their IDs
router.post('/by-ids', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'An array of webinar IDs is required.' });
        }

        const validObjectIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

        if (validObjectIds.length === 0) {
            return res.status(400).json({ message: 'No valid webinar IDs provided.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const webinars = await webinarsCollection.find({ _id: { $in: validObjectIds } }).toArray();
        
        res.json(webinars);

    } catch (error) {
        console.error('Error fetching webinars by IDs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// POST to create a new webinar (Admin only)
router.post('/', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
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
            googleMeetLink: googleMeetLink ? (googleMeetLink.startsWith('https://') ? googleMeetLink : `https://${googleMeetLink.trim()}`) : '',
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
router.put('/:id', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
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

                if (updates.googleMeetLink !== undefined) {

                    updates.googleMeetLink = updates.googleMeetLink ? (updates.googleMeetLink.startsWith('https://') ? updates.googleMeetLink : `https://${updates.googleMeetLink.trim()}`) : '';

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
router.delete('/:id', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
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
        const { timeSlots } = req.body; // Expect an array of time slots

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Validate that timeSlots is a non-empty array
        if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
            return res.status(400).json({ message: 'At least one time slot is required.' });
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
            registeredAt: new Date(),
            timeSlots: timeSlots, // Add the array of selected time slots
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

// POST for a PUBLIC user to register for a webinar
router.post('/:id/public-register', async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, timeSlots } = req.body;

        // --- Validation ---
        if (!firstName || !lastName || !email || !timeSlots) {
            return res.status(400).json({ message: 'First name, last name, email, and time slots are required.' });
        }
        if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
            return res.status(400).json({ message: 'At least one time slot is required.' });
        }
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid webinar ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const usersCollection = db.collection('users');
        const webinarsCollection = db.collection<Webinar>('webinars');

        // --- Find or Create User ---
        let user;
        try {
            user = await usersCollection.findOneAndUpdate(
                { email: email.toLowerCase() },
                {
                    $setOnInsert: {
                        email: email.toLowerCase(),
                        firstName,
                        lastName,
                        username: new ObjectId().toHexString(),
                        role: UserRole.VISITEUR,
                        status: ClientStatus.PROSPECT,
                        createdAt: new Date(),
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (!user) {
                console.error('Failed to upsert user. The database returned a nullish value.');
                return res.status(500).json({ message: 'Failed to find or create user.' });
            }

        } catch (dbError) {
            console.error('Database error during user upsert:', dbError);
            return res.status(500).json({ message: 'A database error occurred.' });
        }
        
        const userId = user._id;

        // --- Add to Newsletter Group ---
        try {
            await addToNewsletterGroup(email, 'Webinar Participants');
        } catch (newsletterError) {
            console.error("Could not add user to newsletter group:", newsletterError);
            // Non-fatal error, so we continue with the registration
        }

        // --- Register for Webinar ---
        const webinar = await webinarsCollection.findOne({ _id: new ObjectId(id) });
        if (!webinar) {
            return res.status(404).json({ message: 'Webinaire non trouvé.' });
        }

        const isRegistered = webinar.attendees.some(att => att.userId.toString() === userId.toString());
        if (isRegistered) {
            return res.status(409).json({ message: 'Vous êtes déjà inscrit à ce webinaire.' });
        }

        const newAttendee = {
            userId: new ObjectId(userId),
            status: 'PENDING' as 'PENDING',
            registeredAt: new Date(),
            timeSlots: timeSlots,
        };

        const updateResult = await webinarsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $push: { attendees: newAttendee } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar not found during update.' });
        }

        // --- Generate Guest Token ---
        const guestToken = jwt.sign(
            { id: userId.toString(), role: user.role },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' } // Guest token is valid for 24 hours
        );

        res.status(200).json({
            message: 'Successfully registered for the webinar. Please submit payment to confirm.',
            guestToken,
        });

    } catch (error) {
        console.error('Error in public registration for webinar:', error);
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

        const standardizedProofUrl = standardizeProofUrl(proofUrl);

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id), "attendees.userId": new ObjectId(userId) },
            { $set: { "attendees.$.proofUrl": standardizedProofUrl, "attendees.$.status": 'PAYMENT_SUBMITTED' as any } }
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
router.post('/:webinarId/attendees/:userId/confirm', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
    try {
        const { webinarId, userId } = req.params;
        const client = await clientPromise;
                const db = client.db('pharmia');
                const webinarsCollection = db.collection<Webinar>('webinars');
        
                const result = await webinarsCollection.updateOne(
                    {
                        _id: new ObjectId(webinarId), 
                        attendees: { 
                            $elemMatch: { 
                                userId: new ObjectId(userId), 
                                status: 'PAYMENT_SUBMITTED' 
                            } 
                        } 
                    },
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

// PUT for an admin to update a payment proof for a specific attendee
router.put('/:webinarId/attendees/:userId/payment-proof', authenticateToken, checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]), async (req, res) => {
    try {
        const { webinarId, userId } = req.params;
        const { proofUrl } = req.body;

        if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid webinar or user ID.' });
        }
        if (!proofUrl || typeof proofUrl !== 'string') {
            return res.status(400).json({ message: 'proofUrl is required and must be a string.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const standardizedProofUrl = standardizeProofUrl(proofUrl);

        const result = await webinarsCollection.updateOne(
            { 
                _id: new ObjectId(webinarId), 
                "attendees.userId": new ObjectId(userId) 
            },
            { $set: { "attendees.$.proofUrl": standardizedProofUrl } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar or attendee registration not found.' });
        }

        res.json({ message: 'Payment proof URL updated successfully.' });

    } catch (error) {
        console.error('Error updating payment proof:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// DELETE an attendee from a webinar (Admin only)
router.delete('/:webinarId/attendees/:attendeeUserId', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { webinarId, attendeeUserId } = req.params;

        if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(attendeeUserId)) {
            return res.status(400).json({ message: 'Invalid webinar ID or attendee user ID.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(webinarId) },
            { $pull: { attendees: { userId: new ObjectId(attendeeUserId) } } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar or attendee not found.' });
        }

        res.json({ message: 'Attendee removed successfully.' });

    } catch (error) {
        console.error('Error removing attendee:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// PUT to update time slots for an attendee (User or Admin)
router.put('/:webinarId/attendees/:userId/slots', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { webinarId, userId } = req.params;
        const { newSlots } = req.body;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        // Authorization check: User can only modify their own slots, unless they are an ADMIN
        if (req.user._id.toString() !== userId.toString() && req.user.role !== UserRole.ADMIN) {
            return res.status(403).json({ message: 'Unauthorized to modify these slots.' });
        }

        if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid webinar ID or user ID.' });
        }

        if (!Array.isArray(newSlots) || newSlots.length === 0) {
            return res.status(400).json({ message: 'At least one time slot is required.' });
        }

        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(webinarId), "attendees.userId": new ObjectId(userId) },
            { $set: { "attendees.$.timeSlots": newSlots, "attendees.$.updatedAt": new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Webinar or attendee not found.' });
        }

        res.json({ message: 'Time slots updated successfully.' });

    } catch (error) {
        console.error('Error updating attendee time slots:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour des créneaux horaires.' });
    }
});

// PUT to manage resources for a webinar (Admin only for past, Admin & Webinar Admin for others)
router.put('/:id/resources', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const { resources } = req.body; // Expect an array of WebinarResource objects

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

        // Authorization Logic
        const userRole = req.user?.role;
        const webinarStatus = getWebinarCalculatedStatus(webinar.date);

        if (userRole !== UserRole.ADMIN) {
            if (userRole === UserRole.ADMIN_WEBINAR) {
                if (webinarStatus === WebinarStatus.PAST) {
                    return res.status(403).json({ message: 'Webinar admins cannot edit resources for past webinars.' });
                }
            } else {
                return res.status(403).json({ message: 'You do not have permission to perform this action.' });
            }
        }

        // The rest of the logic remains the same
        if (!Array.isArray(resources)) {
            return res.status(400).json({ message: 'Resources must be an array.' });
        }

        // Basic validation for each resource
        for (const resource of resources) {
            if (!resource.type) {
                return res.status(400).json({ message: 'Each resource must have a type.' });
            }
            if (typeof resource.url !== 'string') {
                return res.status(400).json({ message: 'Resource URL must be a string.' });
            }
            if (!['Replay', 'Diaporama', 'Infographie', 'pdf', 'link', 'youtube'].includes(resource.type)) {
                return res.status(400).json({ message: `Invalid resource type: ${resource.type}` });
            }
        }

        const result = await webinarsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { resources: resources, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            // This case should theoretically not be hit due to the check above, but it's good practice
            return res.status(404).json({ message: 'Webinar not found.' });
        }

        res.json({ message: 'Webinar resources updated successfully.' });

    } catch (error) {
        console.error('Error updating webinar resources:', error);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la mise à jour des ressources du webinaire.' });
    }
});

export default router;
