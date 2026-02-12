import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from '../authMiddleware.js';
import clientPromise from '../mongo.js';
import { ResourcePage, UserRole, Webinar } from '../../types.js'; // Changed PharmiaEvent to Webinar

const router = express.Router();

// Helper to get collection
const getCollection = async () => {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return db.collection<ResourcePage>('resourcePages');
};

// GET all resource pages
router.get('/', async (req, res) => {
  try {
    const resourcePagesCollection = await getCollection();
    const resourcePages = await resourcePagesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(resourcePages);
  } catch (error) {
    res.status(500).json({
      message:
        'Erreur serveur lors de la récupération des pages de ressources.',
    });
  }
});

// GET a single resource page by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id as string)) {
      return res
        .status(400)
        .json({ message: 'ID de page de ressource invalide.' });
    }
    const resourcePagesCollection = await getCollection();
    const resourcePage = await resourcePagesCollection.findOne({
      _id: new ObjectId(id as string)
    });
    if (!resourcePage) {
      return res
        .status(404)
        .json({ message: 'Page de ressource non trouvée.' });
    }
    res.json(resourcePage);
  } catch (error) {
    res.status(500).json({
      message:
        'Erreur serveur lors de la récupération de la page de ressource.',
    });
  }
});

// POST a new resource page (admin only)
router.post(
  '/',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const resourcePagesCollection = await getCollection();
      const { title, subtitle, coverImageUrl, resources, eventId } = req.body;

      if (!title || !resources) {
        return res
          .status(400)
          .json({ message: 'Le titre et les ressources sont requis.' });
      }

      const newResourcePage: Omit<ResourcePage, '_id'> = {
        title,
        subtitle,
        coverImageUrl,
        resources,
        eventId: eventId ? new ObjectId(eventId as string) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await resourcePagesCollection.insertOne(
        newResourcePage as ResourcePage,
      );
      const newResourcePageId = result.insertedId;

      if (eventId && newResourcePageId) {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars'); // Changed eventsCollection to webinarsCollection
        await webinarsCollection.updateOne(
          { _id: new ObjectId(eventId) },
          { $set: { resourcePageId: newResourcePageId } },
        );
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({
        message: 'Erreur serveur lors de la création de la page de ressource.',
      });
    }
  },
);

// PUT to update a resource page (admin only)
router.put(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id as string)) {
        return res
          .status(400)
          .json({ message: 'ID de page de ressource invalide.' });
      }

      const resourcePagesCollection = await getCollection();
      const { title, subtitle, coverImageUrl, resources, eventId } = req.body;

      const oldResourcePage = await resourcePagesCollection.findOne({
        _id: new ObjectId(id as string)
      });

      const updateData: Partial<ResourcePage> = {
        title,
        subtitle,
        coverImageUrl,
        resources,
        eventId: eventId ? new ObjectId(eventId as string) : undefined,
        updatedAt: new Date(),
      };

      const result = await resourcePagesCollection.updateOne(
        { _id: new ObjectId(id as string) },
        { $set: updateData },
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Page de ressource non trouvée.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const webinarsCollection = db.collection<Webinar>('webinars'); // Changed eventsCollection to webinarsCollection

      if (oldResourcePage && oldResourcePage.eventId?.toString() !== eventId) {
        if (oldResourcePage.eventId) {
          await webinarsCollection.updateOne(
            { _id: new ObjectId(oldResourcePage.eventId as string) },
            { $unset: { resourcePageId: '' } },
          );
        }
        if (eventId) {
          await webinarsCollection.updateOne(
            { _id: new ObjectId(eventId as string) },
            { $set: { resourcePageId: new ObjectId(id as string) } },
          );
        }
      }

      res.json({ message: 'Page de ressource mise à jour avec succès.' });
    } catch (error) {
      res.status(500).json({
        message:
          'Erreur serveur lors de la mise à jour de la page de ressource.',
      });
    }
  },
);

// DELETE a resource page (admin only)
router.delete(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id as string)) {
        return res
          .status(400)
          .json({ message: 'ID de page de ressource invalide.' });
      }
      const resourcePagesCollection = await getCollection();
      const resourcePageToDelete = await resourcePagesCollection.findOne({
        _id: new ObjectId(id as string)
      });

      const result = await resourcePagesCollection.deleteOne({
        _id: new ObjectId(id as string)
      });

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ message: 'Page de ressource non trouvée.' });
      }

      if (resourcePageToDelete && resourcePageToDelete.eventId) {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars'); // Changed eventsCollection to webinarsCollection
        await webinarsCollection.updateOne(
          { _id: new ObjectId(resourcePageToDelete.eventId) },
          { $unset: { resourcePageId: '' } },
        );
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        message:
          'Erreur serveur lors de la suppression de la page de ressource.',
      });
    }
  },
);

export default router;
