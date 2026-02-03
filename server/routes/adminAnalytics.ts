
import express from 'express';
import { authenticateToken, checkRole } from '../authMiddleware.js';
import clientPromise from '../mongo.js';
import { UserRole } from '../../types.js';

const router = express.Router();

router.get('/', authenticateToken, checkRole([UserRole.ADMIN]), async (req, res) => {
  const { eventType, period = 'daily' } = req.query;

  if (!eventType) {
    return res.status(400).json({ message: "Le paramètre 'eventType' est requis." });
  }

  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const analyticsCollection = db.collection('analytics_events');

    const endDate = new Date();
    let startDate = new Date();
    let groupByFormat = '%Y-%m-%d'; // Daily by default

    switch (period) {
      case 'weekly':
        startDate.setDate(endDate.getDate() - 7 * 12); // Last 12 weeks
        groupByFormat = '%Y-%U'; // Group by year and week number
        break;
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 12); // Last 12 months
        groupByFormat = '%Y-%m';
        break;
      case 'daily':
      default:
        startDate.setDate(endDate.getDate() - 30); // Last 30 days
        break;
    }
    
    const aggregation = await analyticsCollection.aggregate([
      {
        $match: {
          type: eventType,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(aggregation);

  } catch (error) {
    console.error(`Error fetching analytics for ${eventType}:`, error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

export default router;
