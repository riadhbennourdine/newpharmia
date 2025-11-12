
import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { authenticateToken } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';
import { Order, OrderStatus, Webinar } from '../types.js';
import { WEBINAR_PRICE } from '../constants.js';

const router = express.Router();

// POST /api/orders/checkout
// Creates a new order from the user's cart items.
router.post('/checkout', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { items } = req.body as { items: { webinarId: string, slots: WebinarTimeSlot[] }[] };
    const userId = req.user?._id;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Cart items are required.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const webinarsCollection = db.collection<Webinar>('webinars');
        const ordersCollection = db.collection<Order>('orders');

        const webinarIds = items.map(item => new ObjectId(item.webinarId));

        // Fetch all webinars in the cart to validate them
        const webinarsCount = await webinarsCollection.countDocuments({ _id: { $in: webinarIds } });

        if (webinarsCount !== items.length) {
            return res.status(404).json({ message: 'One or more webinars not found.' });
        }

        const totalAmount = items.length * WEBINAR_PRICE;

        const newOrder: Omit<Order, '_id'> = {
            userId: new ObjectId(userId),
            items: items.map(item => ({ ...item, webinarId: new ObjectId(item.webinarId) })),
            totalAmount,
            status: OrderStatus.PENDING_PAYMENT,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await ordersCollection.insertOne(newOrder as Order);

        res.status(201).json({
            message: 'Order created successfully.',
            orderId: result.insertedId,
            totalAmount: totalAmount,
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Internal server error while creating order.' });
    }
});

// GET /api/orders/:orderId
// Retrieves a specific order, ensuring the user is authorized to view it.
router.get('/:orderId', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const ordersCollection = db.collection<Order>('orders');

        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Ensure the user is the owner of the order or an admin
        if (order.userId.toString() !== userId?.toString() && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'You are not authorized to view this order.' });
        }

        res.json(order);

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Internal server error while fetching order.' });
    }
});

// POST /api/orders/:orderId/submit-payment
// Associates a proof of payment with an order and registers the user for all webinars in that order.
router.post('/:orderId/submit-payment', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;
    const { proofUrl } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    if (!ObjectId.isValid(orderId)) {
        return res.status(400).json({ message: 'Invalid order ID.' });
    }
    if (!proofUrl) {
        return res.status(400).json({ message: 'Proof of payment URL is required.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const ordersCollection = db.collection<Order>('orders');
        const webinarsCollection = db.collection<Webinar>('webinars');

        // First, find the order and verify it belongs to the user
        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this order.' });
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
            return res.status(409).json({ message: `Order is already in status: ${order.status}` });
        }

        // Update the order status and add the proof URL
        await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { 
                $set: { 
                    status: OrderStatus.PAYMENT_SUBMITTED,
                    paymentProofUrl: proofUrl,
                    updatedAt: new Date()
                }
            }
        );

        // Now, register the user for each webinar in the order
        const bulkUpdateOps = order.items.map(item => {
            const newAttendee = {
                userId: new ObjectId(userId),
                status: 'PAYMENT_SUBMITTED' as const,
                proofUrl: proofUrl,
                registeredAt: new Date(),
                timeSlots: item.slots, // Use the slots from the order item
            };
            return {
                updateOne: {
                    filter: { _id: new ObjectId(item.webinarId) },
                    update: { $push: { attendees: newAttendee } }
                }
            };
        });

        if (bulkUpdateOps.length > 0) {
            await webinarsCollection.bulkWrite(bulkUpdateOps);
        }

        res.json({ message: 'Payment proof submitted and registrations are pending confirmation.' });

    } catch (error) {
        console.error('Error submitting payment proof for order:', error);
        res.status(500).json({ message: 'Internal server error while submitting payment proof.' });
    }
});

export default router;
