
import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { authenticateToken } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';
import { Order, OrderStatus, Webinar, WebinarTimeSlot, WebinarGroup, ProductType } from '../types.js';
import { WEBINAR_PRICE, MASTER_CLASS_PRICE, MASTER_CLASS_PACKS, TAX_RATES } from '../constants.js';

const router = express.Router();

// POST /api/orders/checkout
// Creates a new order from the user's cart items.
// Force Rebuild Trigger: 2025-12-12
router.post('/checkout', authenticateToken, async (req: AuthenticatedRequest, res) => {
    // items can now contain webinarId OR packId
    const { items } = req.body as { items: { webinarId?: string, packId?: string, type?: ProductType, slots?: WebinarTimeSlot[] }[] };
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

        let totalAmount = 0;
        const processedItems: any[] = [];

        // Process Webinar Items
        const webinarItems = items.filter(i => !i.type || i.type === ProductType.WEBINAR || i.webinarId);
        if (webinarItems.length > 0) {
            const webinarIds = webinarItems.map(item => new ObjectId(item.webinarId));
            const webinars = await webinarsCollection.find({ _id: { $in: webinarIds } }).toArray();

            if (webinars.length !== webinarItems.length) {
                return res.status(404).json({ message: 'One or more webinars not found.' });
            }

            const webinarsTotal = webinars.reduce((sum, webinar) => {
                if (webinar.price !== undefined) {
                    return sum + webinar.price;
                }
                if (webinar.group === WebinarGroup.MASTER_CLASS) {
                    return sum + MASTER_CLASS_PRICE;
                }
                return sum + WEBINAR_PRICE;
            }, 0);
            
            totalAmount += webinarsTotal;
            processedItems.push(...webinarItems.map(item => ({
                type: ProductType.WEBINAR,
                webinarId: new ObjectId(item.webinarId!),
                slots: item.slots
            })));
        }

        // Process Pack Items
        const packItems = items.filter(i => i.type === ProductType.PACK || i.packId);
        for (const item of packItems) {
            const packDef = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
            if (!packDef) {
                return res.status(400).json({ message: `Invalid pack ID: ${item.packId}` });
            }
            // Calculate Pack Price TTC: (HT * (1 + TVA)) + Timbre
            const priceTTC = (packDef.priceHT * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
            totalAmount += priceTTC;
            
            processedItems.push({
                type: ProductType.PACK,
                packId: item.packId,
                productId: item.packId // Unified ID access
            });
        }

        const newOrder: Omit<Order, '_id'> = {
            userId: new ObjectId(userId),
            items: processedItems,
            totalAmount, // Rounded to 3 decimals implicitly by JS number, but good to handle on frontend
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

// GET /api/orders (Admin Only)
// Lists orders, optionally filtered by status.
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const userRole = req.user?.role;
    const { status } = req.query;

    if (userRole !== 'ADMIN' && userRole !== 'ADMIN_WEBINAR') {
        return res.status(403).json({ message: 'Unauthorized.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const ordersCollection = db.collection<Order>('orders');
        const usersCollection = db.collection('users');

        const filter: any = {};
        if (status) {
            filter.status = status;
        }

        const orders = await ordersCollection.find(filter).sort({ createdAt: -1 }).toArray();

        // Populate user details for each order
        const userIds = orders.map(o => o.userId).filter(id => id);
        const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))].map(id => new ObjectId(id));
        
        const users = await usersCollection.find(
            { _id: { $in: uniqueUserIds } },
            { projection: { firstName: 1, lastName: 1, email: 1 } }
        ).toArray();

        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        const ordersWithUsers = orders.map(order => ({
            ...order,
            user: userMap.get(order.userId.toString()) || { email: 'Unknown' }
        }));

        res.json(ordersWithUsers);

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Internal server error while fetching orders.' });
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

        const orderUserId = new ObjectId(order.userId);
        const requestUserId = new ObjectId(userId);

        if (!orderUserId.equals(requestUserId)) {
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
        // Use a loop to check for existing attendees to avoid duplicates
        for (const item of order.items) {
            if (item.webinarId) {
                const webinarId = new ObjectId(item.webinarId);
                const webinar = await webinarsCollection.findOne({ _id: webinarId });
                
                const alreadyRegistered = webinar?.attendees.some(att => 
                    (typeof att.userId === 'string' ? att.userId : att.userId.toString()) === userId.toString()
                );

                if (!alreadyRegistered) {
                    await webinarsCollection.updateOne(
                        { _id: webinarId },
                        { 
                            $push: { 
                                attendees: {
                                    userId: new ObjectId(userId),
                                    status: 'PAYMENT_SUBMITTED' as const,
                                    proofUrl: proofUrl,
                                    registeredAt: new Date(),
                                    timeSlots: item.slots,
                                } 
                            } 
                        }
                    );
                } else {
                    // Update existing pending registration with new proof
                    await webinarsCollection.updateOne(
                        { 
                            _id: webinarId, 
                            "attendees.userId": new ObjectId(userId),
                            "attendees.status": { $ne: 'CONFIRMED' } // Don't overwrite confirmed status
                        },
                        { 
                            $set: { 
                                "attendees.$.proofUrl": proofUrl,
                                "attendees.$.status": 'PAYMENT_SUBMITTED'
                            } 
                        }
                    );
                }
            }
        }

        res.json({ message: 'Payment proof submitted and registrations are pending confirmation.' });

    } catch (error) {
        console.error('Error submitting payment proof for order:', error);
        res.status(500).json({ message: 'Internal server error while submitting payment proof.' });
    }
});

// POST /api/orders/:orderId/confirm (Admin Only)
// Confirms payment for an order, updates status, and grants credits if applicable.
router.post('/:orderId/confirm', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN' && userRole !== 'ADMIN_WEBINAR') {
        return res.status(403).json({ message: 'Unauthorized.' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const ordersCollection = db.collection<Order>('orders');
        const usersCollection = db.collection('users');
        const webinarsCollection = db.collection<Webinar>('webinars');

        const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        if (order.status === OrderStatus.CONFIRMED) {
            return res.status(409).json({ message: 'Order is already confirmed.' });
        }

        // 1. Update Order Status
        await ordersCollection.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: OrderStatus.CONFIRMED, updatedAt: new Date() } }
        );

        // 2. Process Items (Grant Credits or Confirm Webinar Seats)
        let creditsToAdd = 0;

        for (const item of order.items) {
            if (item.type === ProductType.PACK && item.packId) {
                const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                if (pack) {
                    creditsToAdd += pack.credits;
                }
            } else if (!item.type || item.type === ProductType.WEBINAR) {
                 // For standard webinars, we update the attendee status to CONFIRMED
                 // This mirrors the logic in webinars.ts but handles it at the order level
                 if (item.webinarId) {
                     await webinarsCollection.updateOne(
                        { 
                            _id: new ObjectId(item.webinarId), 
                            "attendees.userId": new ObjectId(order.userId) 
                        },
                        { $set: { "attendees.$.status": 'CONFIRMED' } }
                     );
                 }
            }
        }

        // 3. Grant Credits to User
        if (creditsToAdd > 0) {
            await usersCollection.updateOne(
                { _id: new ObjectId(order.userId) },
                { $inc: { masterClassCredits: creditsToAdd } }
            );
        }

        res.json({ message: 'Order confirmed and credits/seats updated.', creditsAdded: creditsToAdd });

    } catch (error) {
        console.error('Error confirming order:', error);
        res.status(500).json({ message: 'Internal server error while confirming order.' });
    }
});

export default router;
