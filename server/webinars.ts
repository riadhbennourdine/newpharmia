import express from 'express';
import { sendSingleEmail } from './emailService.js';
import jwt from 'jsonwebtoken';
import { addToNewsletterGroup } from './subscribe.js';
import {
  Webinar,
  UserRole,
  WebinarGroup,
  WebinarStatus,
  ClientStatus,
  WebinarTimeSlot,
} from '../types.js';
import { MASTER_CLASS_PACKS } from '../constants.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import {
  authenticateToken,
  checkRole,
  softAuthenticateToken,
} from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';

const router = express.Router();

const REGISTRATION_CUTOFF_HOUR = 16; // 4 PM

function getWebinarCalculatedStatus(webinar: Partial<Webinar>): WebinarStatus {
  if (!webinar.date) return WebinarStatus.PAST; // Should not happen

  const now = new Date();
  const webinarStart = new Date(webinar.date);
  const effectiveEndDate = new Date(webinarStart);

  // For PharmIA, the "event" technically lasts until the Replay session (Friday)
  if (webinar.group === WebinarGroup.PHARMIA) {
    // Add 3 days to cover until Friday
    effectiveEndDate.setDate(effectiveEndDate.getDate() + 3);
  }

  // Normalize dates to compare only the day
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(
    effectiveEndDate.getFullYear(),
    effectiveEndDate.getMonth(),
    effectiveEndDate.getDate(),
  );

  if (eventDay.getTime() === today.getTime()) {
    const registrationCutoffTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      REGISTRATION_CUTOFF_HOUR,
      0,
      0,
    );

    if (now < registrationCutoffTime) {
      return WebinarStatus.UPCOMING;
    } else {
      // For PharmIA, we might want to be more specific, but reusing LIVE/REGISTRATION_CLOSED logic is okay for now.
      // If it's Friday afternoon (after cutoff), it's closed.
      if (now >= effectiveEndDate) {
        // Roughly check time
        return WebinarStatus.LIVE; // Or PAST?
      } else {
        return WebinarStatus.REGISTRATION_CLOSED;
      }
    }
  } else if (eventDay < today) {
    return WebinarStatus.PAST;
  } else {
    return WebinarStatus.UPCOMING;
  }
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

    const authReq = req as AuthenticatedRequest;
    const userRole = authReq.user?.role?.trim().toUpperCase();
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.ADMIN_WEBINAR;

    // If not admin, only show PUBLISHED webinars
    if (!isAdmin) {
      query.publicationStatus = 'PUBLISHED';
    }

    const webinars = await webinarsCollection
      .find(query)
      .sort({ date: -1 })
      .toArray();

    // console.log('[Webinar Debug] Raw webinars from DB:', JSON.stringify(webinars, null, 2));

    const userIdString = authReq.user?._id.toString();

    const webinarsWithStatus = webinars.map((webinar) => {
      const webinarResponse = { ...webinar } as Partial<Webinar> & {
        isRegistered?: boolean;
        registrationStatus?: string | null;
        calculatedStatus?: WebinarStatus;
      };
      webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar);

      if (isAdmin) {
        // Admins can see everything, so we don't delete anything.
      } else if (userIdString) {
        const attendee = webinar.attendees.find(
          (att) => att.userId.toString() === userIdString,
        );
        webinarResponse.isRegistered = !!attendee;
        webinarResponse.registrationStatus = attendee?.status || null;
        // Keep googleMeetLink if user is CONFIRMED AND (webinar is LIVE or UPCOMING)
        if (
          attendee?.status === 'CONFIRMED' &&
          (webinarResponse.calculatedStatus === WebinarStatus.LIVE ||
            webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)
        ) {
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
      const allUserIds = webinars.flatMap((w) =>
        w.attendees.map((a) => new ObjectId(a.userId as string)),
      );
      const uniqueUserIds = [
        ...new Set(allUserIds.map((id) => id.toHexString())),
      ].map((hex) => new ObjectId(hex));

      if (uniqueUserIds.length > 0) {
        const users = await usersCollection
          .find(
            { _id: { $in: uniqueUserIds } },
            {
              projection: {
                firstName: 1,
                lastName: 1,
                username: 1,
                email: 1,
                masterClassCredits: 1,
              },
            },
          )
          .toArray();

        const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));

        webinarsWithStatus.forEach((webinar) => {
          webinar.attendees.forEach((attendee) => {
            const userDetails = userMap.get(
              new ObjectId(attendee.userId as string).toHexString(),
            );
            if (userDetails) {
              attendee.userId = userDetails;
            }
          });
        });
      }
    } else {
      // For non-admins, don't send attendee details
      webinarsWithStatus.forEach((webinar) => {
        delete (webinar as Partial<Webinar>).attendees;
      });
    }

    res.json(webinarsWithStatus);
  } catch (error) {
    console.error('Error fetching webinars:', error);
    res
      .status(500)
      .json({
        message:
          'Erreur interne du serveur lors de la récupération des webinaires.',
      });
  }
});

// GET the webinars the current user is registered for
router.get(
  '/my-webinars',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
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
        webinars = await webinarsCollection
          .find({})
          .sort({ date: -1 })
          .toArray();
      } else {
        webinars = await webinarsCollection
          .find({ 'attendees.userId': new ObjectId(userId) })
          .sort({ date: -1 })
          .toArray();
      }

      const webinarsWithStatus = webinars.map((webinar) => {
        const webinarResponse = { ...webinar } as Partial<Webinar> & {
          isRegistered?: boolean;
          registrationStatus?: string | null;
          calculatedStatus?: WebinarStatus;
        };
        webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar);

        const attendee = webinar.attendees.find(
          (att) => att.userId.toString() === userId.toString(),
        );
        webinarResponse.isRegistered = !!attendee;
        webinarResponse.registrationStatus = attendee?.status || null;

        if (
          attendee?.status === 'CONFIRMED' &&
          (webinarResponse.calculatedStatus === WebinarStatus.LIVE ||
            webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)
        ) {
          // Keep the googleMeetLink
        } else {
          delete webinarResponse.googleMeetLink;
        }

        // For non-admins, don't send the full attendees list for privacy
        if (
          userRole !== UserRole.ADMIN &&
          userRole !== UserRole.ADMIN_WEBINAR
        ) {
          delete webinarResponse.attendees;
        }

        return webinarResponse;
      });

      res.json(webinarsWithStatus);
    } catch (error) {
      console.error('Error fetching my-webinars:', error);
      res
        .status(500)
        .json({
          message:
            'Erreur interne du serveur lors de la récupération de vos webinaires.',
        });
    }
  },
);

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
    const webinar = await webinarsCollection.findOne(
      { _id: new ObjectId(id) },
      { readPreference: 'primary' },
    );

    console.log(
      `[DEBUG] Fetched webinar ${id} from DB:`,
      JSON.stringify(webinar, null, 2),
    );

    if (!webinar) {
      return res.status(404).json({ message: 'Webinaire non trouvé.' });
    }

    // NEW: Resolve linked memofiches and add them to resources
    if (webinar.linkedMemofiches && webinar.linkedMemofiches.length > 0) {
      const memofichesCollection = db.collection('memofiches');
      const memoficheIds = webinar.linkedMemofiches.map(
        (id) => new ObjectId(id),
      );

      const linkedFiches = await memofichesCollection
        .find({ _id: { $in: memoficheIds } }, { projection: { title: 1 } })
        .toArray();

      if (linkedFiches.length > 0) {
        const memoficheResources = linkedFiches.map((fiche) => ({
          type: 'link' as const, // Use as const for type safety
          source: `/memofiches/${fiche._id}`,
          title: `Mémofiche: ${fiche.title}`,
        }));

        // Prepend to existing resources, ensuring resources is an array
        webinar.resources = [
          ...memoficheResources,
          ...(webinar.resources || []),
        ];
      }
    }

    const webinarResponse = { ...webinar } as Partial<Webinar> & {
      isRegistered?: boolean;
      registrationStatus?: string | null;
      calculatedStatus?: WebinarStatus;
    };
    webinarResponse.calculatedStatus = getWebinarCalculatedStatus(webinar);

    // Populate price for Master Class webinars
    if (webinar.group === WebinarGroup.MASTER_CLASS) {
      webinarResponse.price = MASTER_CLASS_PACKS[0].priceHT; // Price for 1 Master Class unit
    }

    const authReq = req as AuthenticatedRequest;

    // Safer, case-insensitive role check
    const userRole = authReq.user?.role?.trim().toUpperCase();
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.ADMIN_WEBINAR;

    if (isAdmin) {
      // Admins can see everything.
    } else if (authReq.user) {
      const userIdString = authReq.user._id.toString();
      console.log(`[Webinar Debug] Authenticated user ID: ${userIdString}`);
      console.log(
        '[Webinar Debug] Webinar attendees:',
        JSON.stringify(webinar.attendees, null, 2),
      );

      const attendee = webinar.attendees.find(
        (att) => att.userId.toString() === userIdString,
      );

      if (attendee) {
        console.log(
          `[Webinar Debug] Match found! Attendee status: ${attendee.status}`,
        );
      } else {
        console.log(
          '[Webinar Debug] No match found for user in attendees list.',
        );
      }

      webinarResponse.isRegistered = !!attendee;
      webinarResponse.registrationStatus = attendee?.status || null;

      // Keep googleMeetLink if user is CONFIRMED AND (webinar is LIVE or UPCOMING)
      if (
        attendee?.status === 'CONFIRMED' &&
        (webinarResponse.calculatedStatus === WebinarStatus.LIVE ||
          webinarResponse.calculatedStatus === WebinarStatus.UPCOMING)
      ) {
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
      const userIds = webinar.attendees.map(
        (a) => new ObjectId(a.userId as string),
      );
      if (userIds.length > 0) {
        const usersCollection = db.collection('users');
        const users = await usersCollection
          .find(
            { _id: { $in: userIds } },
            {
              projection: {
                firstName: 1,
                lastName: 1,
                username: 1,
                email: 1,
                masterClassCredits: 1,
              },
            },
          )
          .toArray();
        const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));
        webinarResponse.attendees.forEach((attendee) => {
          const userDetails = userMap.get(
            new ObjectId(attendee.userId as string).toHexString(),
          );
          if (userDetails) {
            attendee.userId = userDetails;
          }
        });
      }
    } else {
      delete webinarResponse.attendees;
    }

    console.log(
      `[DEBUG] Final webinarResponse for ${id}:`,
      JSON.stringify(webinarResponse, null, 2),
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json(webinarResponse);
  } catch (error) {
    console.error('Error fetching webinar:', error);
    res
      .status(500)
      .json({
        message:
          'Erreur interne du serveur lors de la récupération du webinaire.',
      });
  }
});

// POST to get multiple webinars by their IDs
router.post('/by-ids', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ message: 'An array of webinar IDs is required.' });
    }

    const validObjectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (validObjectIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'No valid webinar IDs provided.' });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const webinarsCollection = db.collection<Webinar>('webinars');

    const webinars = await webinarsCollection
      .find({ _id: { $in: validObjectIds } })
      .toArray();

    // Populate price for Master Class webinars
    webinars.forEach((webinar) => {
      if (webinar.group === WebinarGroup.MASTER_CLASS) {
        webinar.price = MASTER_CLASS_PACKS[0].priceHT; // Price for 1 Master Class unit
      }
    });

    res.json(webinars);
  } catch (error) {
    console.error('Error fetching webinars by IDs:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// POST to create a new webinar (Admin only)
router.post(
  '/',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        presenter,
        registrationLink,
        imageUrl,
        googleMeetLink,
        group,
        publicationStatus,
      } = req.body;

      if (!title || !description || !date || !presenter) {
        return res
          .status(400)
          .json({
            message: 'Title, description, date, and presenter are required.',
          });
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
        googleMeetLink: (googleMeetLink || '').trim(),
        group: group || WebinarGroup.PHARMIA,
        publicationStatus: publicationStatus || 'DRAFT', // Default to DRAFT if not provided
        attendees: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await webinarsCollection.insertOne(newWebinar as Webinar);

      if (result.acknowledged) {
        res
          .status(201)
          .json({
            message: 'Webinar created successfully.',
            webinarId: result.insertedId,
          });
      } else {
        res.status(500).json({ message: 'Failed to create webinar.' });
      }
    } catch (error) {
      console.error('Error creating webinar:', error);
      res
        .status(500)
        .json({
          message:
            'Erreur interne du serveur lors de la création du webinaire.',
        });
    }
  },
);

// PUT to update a webinar (Admin only)
router.put(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
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
      if (updates.date) {
        updates.date = new Date(updates.date);
      }

      // Ensure publicationStatus is a valid value if provided
      if (
        updates.publicationStatus &&
        !['DRAFT', 'PUBLISHED'].includes(updates.publicationStatus)
      ) {
        return res
          .status(400)
          .json({ message: 'Invalid publicationStatus provided.' });
      }

      if (updates.googleMeetLink) {
        updates.googleMeetLink = updates.googleMeetLink.trim();
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Webinar not found.' });
      }

      res.json({ message: 'Webinar updated successfully.' });
    } catch (error) {
      console.error('Error updating webinar:', error);
      res
        .status(500)
        .json({
          message:
            'Erreur interne du serveur lors de la mise à jour du webinaire.',
        });
    }
  },
);

// DELETE a webinar (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid webinar ID' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection('webinars');

      const result = await webinarsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Webinar not found' });
      }

      res.status(200).json({ message: 'Webinar deleted successfully' });
    } catch (error) {
      console.error('Error deleting webinar:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

// POST to register the current user for a webinar
router.post(
  '/:id/register',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { timeSlots, useCredit } = req.body; // Expect an array of time slots and optional credit flag

      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // Validate that timeSlots is a non-empty array
      if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
        return res
          .status(400)
          .json({ message: 'At least one time slot is required.' });
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
      const usersCollection = db.collection('users');

      const webinar = await webinarsCollection.findOne(
        { _id: new ObjectId(id) },
        { readPreference: 'primary' },
      );

      if (!webinar) {
        return res.status(404).json({ message: 'Webinaire non trouvé.' });
      }
      // Check if user is already registered
      const isRegistered = webinar.attendees.some(
        (att) => att.userId.toString() === userId.toString(),
      );
      if (isRegistered) {
        return res
          .status(409)
          .json({ message: 'Vous êtes déjà inscrit à ce webinaire.' });
      }

      let status: 'PENDING' | 'CONFIRMED' = 'PENDING';
      let usedCredit = false;
      let isFree = false;

      // Check if Webinar is Free
      if (webinar.price === 0) {
        isFree = true;
        // Validate Phone Number for Free Webinars
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });
        if (!user?.phoneNumber) {
          return res.status(400).json({
            message:
              "Un numéro de téléphone est requis pour l'inscription aux wébinaires gratuits. Veuillez mettre à jour votre profil.",
            code: 'PHONE_REQUIRED',
          });
        }
        status = 'CONFIRMED';
      }

      // Credit Usage Logic (Only if not free)
      if (useCredit && !isFree) {
        if (webinar.group === WebinarGroup.MASTER_CLASS) {
          // Fetch latest user data to check balance
          const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });
          if (
            !user ||
            !user.masterClassCredits ||
            user.masterClassCredits < 1
          ) {
            return res
              .status(402)
              .json({ message: 'Solde de crédits Master Class insuffisant.' });
          }

          // Deduct credit
          const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId), masterClassCredits: { $gte: 1 } },
            { $inc: { masterClassCredits: -1 } },
          );

          if (updateResult.modifiedCount === 0) {
            return res
              .status(409)
              .json({
                message: 'Erreur lors du débit du crédit (concurrence).',
              });
          }

          status = 'CONFIRMED';
          usedCredit = true;
        } else if (webinar.group === WebinarGroup.PHARMIA) {
          // Fetch latest user data to check balance
          const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });
          if (!user || !user.pharmiaCredits || user.pharmiaCredits < 1) {
            return res
              .status(402)
              .json({ message: 'Solde de crédits PharmIA insuffisant.' });
          }

          // Deduct credit
          const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId), pharmiaCredits: { $gte: 1 } },
            { $inc: { pharmiaCredits: -1 } },
          );

          if (updateResult.modifiedCount === 0) {
            return res
              .status(409)
              .json({
                message: 'Erreur lors du débit du crédit (concurrence).',
              });
          }

          status = 'CONFIRMED';
          usedCredit = true; // We can reuse this flag
        } else {
          return res
            .status(400)
            .json({
              message:
                'Les crédits ne sont pas applicables pour ce type de wébinaire.',
            });
        }
      }

      const newAttendee = {
        userId: new ObjectId(userId),
        status: status,
        registeredAt: new Date(),
        timeSlots: timeSlots,
        usedCredit: usedCredit,
      };

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { attendees: newAttendee } },
      );

      if (result.matchedCount === 0) {
        // Rollback credit if update fails (edge case)
        if (usedCredit) {
          if (webinar.group === WebinarGroup.MASTER_CLASS) {
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              { $inc: { masterClassCredits: 1 } },
            );
          } else if (webinar.group === WebinarGroup.PHARMIA) {
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              { $inc: { pharmiaCredits: 1 } },
            );
          }
        }
        return res
          .status(404)
          .json({ message: 'Webinar not found during registration.' });
      }

      // Send Confirmation Email for Free Webinars
      if (isFree && status === 'CONFIRMED') {
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId),
        });
        if (user && user.email) {
          try {
            const meetLink =
              webinar.googleMeetLink ||
              "Le lien sera disponible dans votre espace 'Mes Wébinaires' le jour J.";
            await sendSingleEmail({
              to: user.email,
              subject: `Confirmation d'inscription : ${webinar.title}`,
              htmlContent: `
                            <h1>Inscription Confirmée</h1>
                            <p>Bonjour ${user.firstName || 'Cher participant'},</p>
                            <p>Votre inscription au wébinaire gratuit <strong>"${webinar.title}"</strong> est validée.</p>
                            <p><strong>Date :</strong> ${new Date(webinar.date).toLocaleDateString('fr-FR')} à ${timeSlots.join(', ')}</p>
                            <p><strong>Lien de connexion :</strong> ${meetLink}</p>
                            <p>Cordialement,<br>L'équipe PharmIA</p>
                        `,
            });
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Non-blocking error
          }
        }
      }

      if (usedCredit) {
        if (webinar.group === WebinarGroup.MASTER_CLASS) {
          res.json({
            message:
              'Inscription confirmée avec succès (1 crédit Master Class utilisé).',
          });
        } else if (webinar.group === WebinarGroup.PHARMIA) {
          res.json({
            message:
              'Inscription confirmée avec succès (1 crédit PharmIA utilisé).',
          });
        } else {
          res.json({
            message: 'Inscription confirmée avec succès (1 crédit utilisé).',
          });
        }
      } else if (isFree) {
        res.json({ message: 'Inscription gratuite confirmée avec succès !' });
      } else {
        res.json({
          message:
            'Successfully registered for the webinar. Please submit payment to confirm.',
        });
      }
    } catch (error) {
      console.error('Error registering for webinar:', error);
      res
        .status(500)
        .json({
          message:
            "Erreur interne du serveur lors de l'inscription au webinaire.",
        });
    }
  },
);

// POST for a PUBLIC user to register for a webinar
router.post('/:id/public-register', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, timeSlots } = req.body;

    // --- Validation ---
    if (!firstName || !lastName || !email || !timeSlots) {
      return res
        .status(400)
        .json({
          message:
            'Tous les champs sont obligatoires (Nom, Prénom, Email, Créneaux).',
        });
    }
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res
        .status(400)
        .json({ message: 'Au moins un créneau est requis.' });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de webinaire invalide.' });
    }

    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection('users');
    const webinarsCollection = db.collection<Webinar>('webinars');

    const webinar = await webinarsCollection.findOne({ _id: new ObjectId(id) });
    if (!webinar) {
      return res.status(404).json({ message: 'Webinaire non trouvé.' });
    }

    const isFree = webinar.price === 0;

    // --- FREE WEBINAR LOGIC ---
    if (isFree) {
      if (!phone) {
        return res
          .status(400)
          .json({
            message: 'Le téléphone est requis pour les wébinaires gratuits.',
          });
      }

      // Check if user exists
      const existingUser = await usersCollection.findOne({
        email: email.toLowerCase(),
      });
      if (existingUser) {
        return res.status(409).json({
          message:
            'Un compte existe déjà avec cet email. Veuillez vous connecter pour vous inscrire.',
          code: 'USER_EXISTS',
        });
      }

      // Create new user
      const newUser: any = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        username: email.toLowerCase(),
        phoneNumber: phone,
        role: UserRole.PHARMACIEN, // Default to Pharmacien/Prospect target
        status: ClientStatus.PROSPECT,
        createdAt: new Date(),
        passwordHash: 'PENDING_ACTIVATION',
        hasActiveSubscription: false,
      };

      const userResult = await usersCollection.insertOne(newUser);
      const newUserId = userResult.insertedId;

      // Register to Webinar
      const newAttendee = {
        userId: newUserId,
        status: 'CONFIRMED' as const,
        registeredAt: new Date(),
        timeSlots: timeSlots,
        usedCredit: false,
      };

      await webinarsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { attendees: newAttendee } },
      );

      // Add to Newsletter
      try {
        await addToNewsletterGroup(email, 'Webinar Prospects');
      } catch (e) {
        console.error('Newsletter add failed', e);
      }

      // Send Confirmation Email
      try {
        const meetLink =
          webinar.googleMeetLink ||
          'Le lien sera disponible dans votre espace.';
        await sendSingleEmail({
          to: email,
          subject: `Confirmation d'inscription : ${webinar.title}`,
          htmlContent: `
                        <h1>Bienvenue sur PharmIA !</h1>
                        <p>Bonjour ${firstName},</p>
                        <p>Votre compte a été créé et votre inscription au wébinaire <strong>"${webinar.title}"</strong> est validée.</p>
                        <p><strong>Date :</strong> ${new Date(webinar.date).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Lien de connexion :</strong> ${meetLink}</p>
                        <p><em>Note : Pour accéder à votre compte ultérieurement, veuillez utiliser la fonction "Mot de passe oublié" avec votre email.</em></p>
                        <p>Cordialement,<br>L'équipe PharmIA</p>
                    `,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

      // Token
      const token = jwt.sign(
        {
          _id: newUserId.toString(),
          role: newUser.role,
          email: newUser.email,
        },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' },
      );

      return res.status(201).json({
        message: 'Inscription réussie.',
        token,
        user: {
          _id: newUserId,
          firstName,
          lastName,
          email,
          role: newUser.role,
        },
      });
    }

    // --- PAID WEBINAR LOGIC (Legacy Support) ---
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
          },
        },
        { upsert: true, returnDocument: 'after' },
      );

      if (!user) {
        // Fallback
        user = await usersCollection.findOne({ email: email.toLowerCase() });
      }
    } catch (dbError) {
      console.error('Database error during user upsert:', dbError);
      return res.status(500).json({ message: 'A database error occurred.' });
    }

    const userId = user!._id;

    try {
      await addToNewsletterGroup(email, 'Webinar Participants');
    } catch (newsletterError) {
      // ignore
    }

    const isRegistered = webinar.attendees.some(
      (att) => att.userId.toString() === userId.toString(),
    );
    if (isRegistered) {
      return res
        .status(409)
        .json({ message: 'Vous êtes déjà inscrit à ce webinaire.' });
    }

    const newAttendee = {
      userId: new ObjectId(userId),
      status: 'PENDING' as const,
      registeredAt: new Date(),
      timeSlots: timeSlots,
    };

    const updateResult = await webinarsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { attendees: newAttendee } },
    );

    if (updateResult.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: 'Webinar not found during update.' });
    }

    const guestToken = jwt.sign(
      { id: userId.toString(), role: user!.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' },
    );

    res.status(200).json({
      message:
        'Successfully registered for the webinar. Please submit payment to confirm.',
      guestToken,
    });
  } catch (error) {
    console.error('Error in public registration for webinar:', error);
    res
      .status(500)
      .json({
        message:
          "Erreur interne du serveur lors de l'inscription au webinaire.",
      });
  }
});

// POST for a user to submit their proof of payment
router.post(
  '/:id/submit-payment',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { proofUrl } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const userId = req.user._id;

      if (!proofUrl) {
        return res
          .status(400)
          .json({ message: 'Proof of payment URL is required.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(id), 'attendees.userId': new ObjectId(userId) },
        {
          $set: {
            'attendees.$.proofUrl': proofUrl,
            'attendees.$.status': 'PAYMENT_SUBMITTED' as any,
          },
        },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Webinar or registration not found.' });
      }

      res.json({ message: 'Proof of payment submitted successfully.' });
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// POST for an admin to confirm a payment
router.post(
  '/:webinarId/attendees/:userId/confirm',
  authenticateToken,
  checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]),
  async (req, res) => {
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
              status: 'PAYMENT_SUBMITTED',
            },
          },
        },
        { $set: { 'attendees.$.status': 'CONFIRMED' } },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Webinar or registration not found.' });
      }
      res.json({ message: 'Payment confirmed successfully.' });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// PUT for an admin to update a payment proof for a specific attendee
router.put(
  '/:webinarId/attendees/:userId/payment-proof',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { webinarId, userId } = req.params;
      const { proofUrl } = req.body;

      if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid webinar or user ID.' });
      }
      if (!proofUrl || typeof proofUrl !== 'string') {
        return res
          .status(400)
          .json({ message: 'proofUrl is required and must be a string.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const result = await webinarsCollection.updateOne(
        {
          _id: new ObjectId(webinarId),
          'attendees.userId': new ObjectId(userId),
        },
        { $set: { 'attendees.$.proofUrl': proofUrl } },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Webinar or attendee registration not found.' });
      }

      res.json({ message: 'Payment proof URL updated successfully.' });
    } catch (error) {
      console.error('Error updating payment proof:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// DELETE an attendee from a webinar (Admin only)
router.delete(
  '/:webinarId/attendees/:attendeeUserId',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { webinarId, attendeeUserId } = req.params;

      if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(attendeeUserId)) {
        return res
          .status(400)
          .json({ message: 'Invalid webinar ID or attendee user ID.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(webinarId) },
        { $pull: { attendees: { userId: new ObjectId(attendeeUserId) } } },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Webinar or attendee not found.' });
      }

      res.json({ message: 'Attendee removed successfully.' });
    } catch (error) {
      console.error('Error removing attendee:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// POST to manually add an attendee to a webinar (Admin only)
router.post(
  '/:webinarId/attendees',
  authenticateToken,
  checkRole([UserRole.ADMIN, UserRole.ADMIN_WEBINAR]),
  async (req, res) => {
    try {
      const { webinarId } = req.params;
      const { userId } = req.body;

      if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ message: 'Invalid webinar ID or user ID.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');
      const usersCollection = db.collection('users');

      const webinar = await webinarsCollection.findOne({
        _id: new ObjectId(webinarId),
      });
      if (!webinar) {
        return res.status(404).json({ message: 'Webinar not found.' });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const isRegistered = webinar.attendees.some(
        (att) => att.userId.toString() === userId.toString(),
      );
      if (isRegistered) {
        return res
          .status(409)
          .json({ message: 'User is already registered for this webinar.' });
      }

      const newAttendee = {
        userId: new ObjectId(userId),
        status: 'CONFIRMED' as const,
        registeredAt: new Date(),
        timeSlots: ['ON_DEMAND'],
        usedCredit: false,
        email: user.email, // Include email for reference
      };

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(webinarId) },
        { $push: { attendees: newAttendee as any } },
      );

      if (result.matchedCount === 0) {
        return res
          .status(500)
          .json({ message: 'Failed to add attendee to webinar.' });
      }

      // Return the updated webinar or just a success message
      res.status(201).json({ message: 'Attendee added successfully.' });
    } catch (error) {
      console.error('Error manually adding attendee:', error);
      res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  },
);

// PUT to update time slots for an attendee (User or Admin)
router.put(
  '/:webinarId/attendees/:userId/slots',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { webinarId, userId } = req.params;
      const { newSlots } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      // Authorization check: User can only modify their own slots, unless they are an ADMIN
      if (
        req.user._id.toString() !== userId.toString() &&
        req.user.role !== UserRole.ADMIN
      ) {
        return res
          .status(403)
          .json({ message: 'Unauthorized to modify these slots.' });
      }

      if (!ObjectId.isValid(webinarId) || !ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ message: 'Invalid webinar ID or user ID.' });
      }

      if (!Array.isArray(newSlots) || newSlots.length === 0) {
        return res
          .status(400)
          .json({ message: 'At least one time slot is required.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const result = await webinarsCollection.updateOne(
        {
          _id: new ObjectId(webinarId),
          'attendees.userId': new ObjectId(userId),
        },
        {
          $set: {
            'attendees.$.timeSlots': newSlots,
            'attendees.$.updatedAt': new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Webinar or attendee not found.' });
      }

      res.json({ message: 'Time slots updated successfully.' });
    } catch (error) {
      console.error('Error updating attendee time slots:', error);
      res
        .status(500)
        .json({
          message:
            'Erreur interne du serveur lors de la mise à jour des créneaux horaires.',
        });
    }
  },
);

// PUT to manage resources for a webinar (Admin only for past, Admin & Webinar Admin for others)
router.put(
  '/:id/resources',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      // On récupère les ressources ET les linkedMemofiches du body
      const { resources, linkedMemofiches } = req.body;

      console.log(`[DEBUG] Updating resources for webinar ${id}.`);
      console.log(
        `[DEBUG] Received resources:`,
        JSON.stringify(resources, null, 2),
      );
      console.log(
        `[DEBUG] Received linkedMemofiches:`,
        JSON.stringify(linkedMemofiches, null, 2),
      );

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid webinar ID.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars');

      const webinar = await webinarsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!webinar) {
        return res.status(404).json({ message: 'Webinar not found.' });
      }

      // Authorization Logic
      const userRole = req.user?.role;

      if (userRole !== UserRole.ADMIN) {
        return res
          .status(403)
          .json({
            message: 'You do not have permission to perform this action.',
          });
      }

      // The rest of the logic remains the same
      if (!Array.isArray(resources)) {
        return res.status(400).json({ message: 'Resources must be an array.' });
      }
      // Validation pour linkedMemofiches
      if (linkedMemofiches !== undefined && !Array.isArray(linkedMemofiches)) {
        return res
          .status(400)
          .json({ message: 'Linked memofiches must be an array of IDs.' });
      }
      if (
        linkedMemofiches &&
        linkedMemofiches.some((mfId: any) => !ObjectId.isValid(mfId))
      ) {
        return res
          .status(400)
          .json({ message: 'Invalid ObjectId found in linked memofiches.' });
      }

      // Basic validation for each resource (reste inchangé)
      for (const resource of resources) {
        if (!resource.type) {
          return res
            .status(400)
            .json({ message: 'Each resource must have a type.' });
        }
        if (typeof resource.source !== 'string') {
          return res
            .status(400)
            .json({
              message: `Resource source must be a string, but it is ${typeof resource.source}.`,
            });
        }
        const allowedTypes = [
          'Replay',
          'Vidéo explainer',
          'Infographie',
          'Diaporama',
          'pdf',
          'link',
          'youtube',
        ];
        if (!allowedTypes.includes(resource.type)) {
          return res
            .status(400)
            .json({
              message: `Invalid resource type: '${resource.type}'. Must be one of: ${allowedTypes.join(', ')}`,
            });
        }
      }

      // Mettre à jour les deux champs: resources ET linkedMemofiches
      const updateDoc: any = {
        resources: resources,
        updatedAt: new Date(),
      };
      if (linkedMemofiches !== undefined) {
        updateDoc.linkedMemofiches = linkedMemofiches.map(
          (id: string) => new ObjectId(id),
        );
      }

      console.log(
        `[DEBUG] Update document:`,
        JSON.stringify(updateDoc, null, 2),
      );

      const result = await webinarsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Webinar not found.' });
      }

      res.json({
        message:
          'Webinar resources and linked memofiches updated successfully.',
      });
    } catch (error) {
      console.error('Error updating webinar resources:', error);
      res
        .status(500)
        .json({
          message:
            'Erreur interne du serveur lors de la mise à jour des ressources du webinaire.',
        });
    }
  },
);

export default router;
