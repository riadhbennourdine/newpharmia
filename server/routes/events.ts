import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from '../authMiddleware.js';
import clientPromise from '../mongo.js';
import { PharmiaEvent, UserRole } from '../../types.js';

const router = express.Router();

// Helper to get collection
const getCollection = async () => {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return db.collection<PharmiaEvent>('events');
};

// GET all published events
router.get('/', async (req, res) => {
  try {
    const eventsCollection = await getCollection();
    const events = await eventsCollection.find({ isPublished: true }).sort({ createdAt: -1 }).toArray();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des événements.' });
  }
});

// GET all events (admin only)
router.get('/all', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const eventsCollection = await getCollection();
      const events = await eventsCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur lors de la récupération de tous les événements.' });
    }
});

// GET a single event by slug
router.get('/:slug', async (req, res) => {
  try {
    const eventsCollection = await getCollection();
    const event = await eventsCollection.findOne({ slug: req.params.slug, isPublished: true });
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé.' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'événement.' });
  }
});

// GET a single event by ID (admin only)
router.get('/admin/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID d\'événement invalide.' });
        }
        const eventsCollection = await getCollection();
        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (!event) {
            return res.status(404).json({ message: 'Événement non trouvé.' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'événement.' });
    }
});

// POST a new event (admin only)
router.post('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const eventsCollection = await getCollection();
    const { title, summary, content, imageUrl, slidesUrl, youtubeUrls, artifacts, isPublished } = req.body;

    if (!title || !summary || !content || !imageUrl) {
        return res.status(400).json({ message: 'Titre, résumé, contenu et image sont requis.' });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newEvent: Omit<PharmiaEvent, '_id'> = {
      title,
      slug,
      summary,
      content,
      imageUrl,
      slidesUrl,
      youtubeUrls,
      artifacts,
      isPublished,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.insertOne(newEvent as PharmiaEvent);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'événement.' });
  }
});

// PUT to update an event (admin only)
router.put('/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'événement invalide.' });
    }

    const eventsCollection = await getCollection();
    const { title, summary, content, imageUrl, slidesUrl, youtubeUrls, artifacts, isPublished } = req.body;
    
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const updateData = {
        title,
        slug,
        summary,
        content,
        imageUrl,
        slidesUrl,
        youtubeUrls,
        artifacts,
        isPublished,
        updatedAt: new Date(),
    };

    const result = await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Événement non trouvé.' });
    }
    res.json({ message: 'Événement mis à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'événement.' });
  }
});

// DELETE an event (admin only)
router.delete('/:id', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'événement invalide.' });
    }
    const eventsCollection = await getCollection();
    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Événement non trouvé.' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'événement.' });
  }
});

export default router;
