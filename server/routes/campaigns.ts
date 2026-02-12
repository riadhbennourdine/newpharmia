import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from '../mongo.js';
import { AdCampaign, UserRole } from '../../types.js';
import { authenticateToken, checkRole } from '../authMiddleware.js';

const router = express.Router();

// Helper to get collection
const getCampaignsCollection = async () => {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return db.collection<AdCampaign>('campaigns');
};

// GET /api/campaigns - List all campaigns (Admin only)
router.get(
  '/',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const collection = await getCampaignsCollection();
      const campaigns = await collection.find({}).toArray();
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ message: 'Error fetching campaigns' });
    }
  },
);

// GET /api/campaigns/active - List active campaigns (Public/User)
router.get('/active', async (req, res) => {
  try {
    const collection = await getCampaignsCollection();
    const campaigns = await collection.find({ active: true }).toArray();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    res.status(500).json({ message: 'Error fetching active campaigns' });
  }
});

// POST /api/campaigns - Create a new campaign (Admin only)
router.post(
  '/',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const newCampaign: AdCampaign = {
        ...req.body,
        impressions: 0,
        clicks: 0,
        createdAt: new Date(),
      };
      const collection = await getCampaignsCollection();
      const result = await collection.insertOne(newCampaign);
      res.status(201).json({ ...newCampaign, _id: result.insertedId });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: 'Error creating campaign' });
    }
  },
);

// PUT /api/campaigns/:id - Update a campaign (Admin only)
router.put(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      delete updates._id; // Prevent updating _id

      const collection = await getCampaignsCollection();
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id as string) },
        { $set: updates },
        { returnDocument: 'after' },
      );

      if (!result) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ message: 'Error updating campaign' });
    }
  },
);

// DELETE /api/campaigns/:id - Delete a campaign (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  checkRole([UserRole.ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const collection = await getCampaignsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id as string) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ message: 'Error deleting campaign' });
    }
  },
);

// POST /api/campaigns/:id/track - Track impressions/clicks
router.post('/:id/track', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'impression' or 'click'

    if (!['impression', 'click'].includes(type)) {
      return res.status(400).json({ message: 'Invalid track type' });
    }

    const updateField = type === 'impression' ? 'impressions' : 'clicks';
    const collection = await getCampaignsCollection();

    await collection.updateOne(
      { _id: new ObjectId(id as string) },
      { $inc: { [updateField]: 1 } },
    );

    res.status(200).json({ message: 'Tracked successfully' });
  } catch (error) {
    console.error('Error tracking campaign:', error);
    res.status(500).json({ message: 'Error tracking campaign' });
  }
});

export default router;
