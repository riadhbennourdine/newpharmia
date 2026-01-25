import express from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import clientPromise from '../mongo.js';
import { authenticateToken } from '../authMiddleware.js';
import type { AuthenticatedRequest } from '../authMiddleware.js';
import { UserRole, OrderStatus, Order, User } from '../../types.js';
import { uploadFileToGemini } from '../geminiFileSearchService.js'; // Reusing for file handling utility or just use raw upload
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure Multer for local storage temporarily or memory if we push to a cloud storage/volume
// Based on server.ts patterns, uploads are often handled via specific upload routes or memory.
// Let's use memory storage and then write to the upload directory like the main upload route does.
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/admin/subscriptions
// List active subscribers (Pharmacists) with their latest order status
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Unauthorized.' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const usersCollection = db.collection<User>('users');
    const ordersCollection = db.collection<Order>('orders');

    // Find all pharmacists with active subscription
    const subscribers = await usersCollection
      .find({
        role: UserRole.PHARMACIEN,
        hasActiveSubscription: true,
      })
      .project({
        passwordHash: 0,
        quizHistory: 0,
        simulationHistory: 0,
      })
      .toArray();

    // Enhance with latest order info
    const enhancedSubscribers = await Promise.all(
      subscribers.map(async (user) => {
        const latestOrder = await ordersCollection.findOne(
          { userId: user._id },
          { sort: { createdAt: -1 } },
        );

        return {
          ...user,
          latestOrder: latestOrder
            ? {
                _id: latestOrder._id,
                status: latestOrder.status,
                totalAmount: latestOrder.totalAmount,
                paymentProofUrl: latestOrder.paymentProofUrl,
                createdAt: latestOrder.createdAt,
              }
            : null,
        };
      }),
    );

    res.json(enhancedSubscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/admin/subscriptions/:userId/upload-proof
// Upload a proof file manually for a user
router.post(
  '/:userId/upload-proof',
  authenticateToken,
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const ordersCollection = db.collection<Order>('orders');
      const usersCollection = db.collection<User>('users');

      // Validate User
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Save file to disk (matching server/upload.ts logic)
      // Ensure directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads'); // Assuming standard public/uploads
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      const fileUrl = `/uploads/${fileName}`;

      // Find the latest order to attach to, OR create a dummy one if none exists
      // Prioritize PENDING_PAYMENT or PAYMENT_SUBMITTED orders
      let order = await ordersCollection.findOne(
        {
          userId: new ObjectId(userId),
          status: {
            $in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_SUBMITTED],
          },
        },
        { sort: { createdAt: -1 } },
      );

      if (!order) {
        // Fallback: look for ANY order
        order = await ordersCollection.findOne(
          { userId: new ObjectId(userId) },
          { sort: { createdAt: -1 } },
        );
      }

      let orderId;

      if (order) {
        // Update existing order
        await ordersCollection.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentProofUrl: fileUrl,
              status: OrderStatus.CONFIRMED, // Auto-confirm when admin uploads? Or just attach? Let's assume Confirm.
              updatedAt: new Date(),
            },
          },
        );
        orderId = order._id;
      } else {
        // Create a new "Manual Subscription" order
        const newOrder: any = {
          userId: new ObjectId(userId),
          items: [{ type: 'SUBSCRIPTION', productId: 'MANUAL_ENTRY' }], // Placeholder item
          totalAmount: 0,
          status: OrderStatus.CONFIRMED,
          paymentProofUrl: fileUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await ordersCollection.insertOne(newOrder);
        orderId = result.insertedId;
      }

      res.json({
        message: 'Proof uploaded and linked successfully.',
        fileUrl,
        orderId,
      });
    } catch (error) {
      console.error('Error uploading proof:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;
