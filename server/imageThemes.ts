import express from 'express';
import { ImageTheme, UserRole } from '../types.js';
import clientPromise from './mongo.js';
import { ObjectId } from 'mongodb';
import { authenticateToken, checkRole } from './authMiddleware.js';

const router = express.Router();

// POST to create a new image theme (Admin only)
router.post(
  '/',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { name, category } = req.body;

      if (!name || !category) {
        return res
          .status(400)
          .json({ message: 'Name and category are required.' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const imageThemesCollection = db.collection<ImageTheme>('imagethemes');

      const newTheme: Omit<ImageTheme, '_id'> = {
        name,
        category,
      };

      const result = await imageThemesCollection.insertOne(
        newTheme as ImageTheme,
      );

      if (result.acknowledged) {
        res.status(201).json({
          message: 'Image theme created successfully.',
          themeId: result.insertedId,
        });
      } else {
        res.status(500).json({ message: 'Failed to create image theme.' });
      }
    } catch (error) {
      console.error('Error creating image theme:', error);
      res.status(500).json({
        message:
          "Erreur interne du serveur lors de la création du thème d'image.",
      });
    }
  },
);

// GET all image themes
router.get('/', async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const imageThemesCollection = db.collection<ImageTheme>('imagethemes');
    const themes = await imageThemesCollection
      .find({})
      .sort({ name: 1 })
      .toArray();
    res.json(themes);
  } catch (error) {
    console.error('Error fetching image themes:', error);
    res.status(500).json({
      message:
        "Erreur interne du serveur lors de la récupération des thèmes d'image.",
    });
  }
});

// DELETE an image theme (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid theme ID' });
      }

      const client = await clientPromise;
      const db = client.db('pharmia');
      const imageThemesCollection = db.collection<ImageTheme>('imagethemes');

      const result = await imageThemesCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Image theme not found' });
      }

      res.status(200).json({ message: 'Image theme deleted successfully' });
    } catch (error) {
      console.error('Error deleting image theme:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
);

export default router;
