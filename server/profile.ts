import express from 'express';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import clientPromise from './mongo.js';
import { User } from '../types.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Update user profile
router.put('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { city, phoneNumber } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { usersCollection } = await getCollections();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { city, phoneNumber } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Update user password
router.put(
  '/password',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Current and new passwords are required' });
    }

    try {
      const { usersCollection } = await getCollections();
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { passwordHash, passwordIsTemporary: false } },
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  },
);

async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    usersCollection: db.collection<User>('users'),
  };
}

export default router;
