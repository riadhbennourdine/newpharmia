import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { authenticateToken } from './authMiddleware.js';
import type { AuthenticatedRequest } from './authMiddleware.js';
import {
  Order,
  OrderStatus,
  Webinar,
  WebinarTimeSlot,
  WebinarGroup,
  ProductType,
  UserRole,
} from '../types.js';
import {
  WEBINAR_PRICE,
  MASTER_CLASS_PRICE,
  MASTER_CLASS_PACKS,
  PHARMIA_CREDIT_PACKS,
  TAX_RATES,
  PHARMIA_WEBINAR_PRICE_HT,
} from '../constants.js';

const router = express.Router();

// POST /api/orders/checkout
// Creates a new order from the user's cart items.
// Force Rebuild Trigger: 2025-12-12
router.post(
  '/checkout',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    // items can now contain webinarId OR packId
    const { items } = req.body as {
      items: {
        webinarId?: string;
        packId?: string;
        type?: ProductType;
        slots?: WebinarTimeSlot[];
      }[];
    };
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
      let hasTaxableItems = false;

      // Process Webinar Items
      const webinarItems = items.filter(
        (i) => !i.type || i.type === ProductType.WEBINAR || i.webinarId,
      );
      if (webinarItems.length > 0) {
        const webinarIds = webinarItems.map(
          (item) => new ObjectId(item.webinarId),
        );
        const webinars = await webinarsCollection
          .find({ _id: { $in: webinarIds } })
          .toArray();

        if (webinars.length !== webinarItems.length) {
          return res
            .status(404)
            .json({ message: 'One or more webinars not found.' });
        }

        for (const webinar of webinars) {
          let price = 0;
          if (webinar.group === WebinarGroup.MASTER_CLASS) {
            hasTaxableItems = true;
            // If price is in DB, assume HT. Else derive from constant (TTC) minus Stamp.
            if (webinar.price !== undefined) {
              price = webinar.price * (1 + TAX_RATES.TVA);
            } else {
              price = MASTER_CLASS_PRICE - TAX_RATES.TIMBRE;
            }
          } else if (webinar.group === WebinarGroup.PHARMIA) {
            hasTaxableItems = true;
            const priceHT =
              webinar.price !== undefined
                ? webinar.price
                : PHARMIA_WEBINAR_PRICE_HT;
            price = priceHT * (1 + TAX_RATES.TVA);
          } else if (webinar.group === WebinarGroup.CROP_TUNIS) {
            price = webinar.price !== undefined ? webinar.price : WEBINAR_PRICE;
          } else {
            // Fallback to CROP/Standard price (80.000)
            price = webinar.price !== undefined ? webinar.price : WEBINAR_PRICE;
          }
          totalAmount += price;
        }

        processedItems.push(
          ...webinarItems.map((item) => ({
            type: ProductType.WEBINAR,
            webinarId: new ObjectId(item.webinarId!),
            slots: item.slots,
          })),
        );
      }

      // Process Pack Items
      const packItems = items.filter(
        (i) => i.type === ProductType.PACK || i.packId,
      );
      for (const item of packItems) {
        const mcPackDef = MASTER_CLASS_PACKS.find((p) => p.id === item.packId);
        const piaPackDef = PHARMIA_CREDIT_PACKS.find(
          (p) => p.id === item.packId,
        );

        if (mcPackDef) {
          hasTaxableItems = true;
          const priceTTCNoStamp = mcPackDef.priceHT * (1 + TAX_RATES.TVA);
          totalAmount += priceTTCNoStamp;

          processedItems.push({
            type: ProductType.PACK,
            packId: item.packId,
            productId: item.packId,
          });
        } else if (piaPackDef) {
          hasTaxableItems = true;
          const priceTTCNoStamp = piaPackDef.priceHT * (1 + TAX_RATES.TVA);
          totalAmount += priceTTCNoStamp;

          processedItems.push({
            type: ProductType.PACK,
            packId: item.packId,
            productId: item.packId,
          });
        } else {
          return res
            .status(400)
            .json({ message: `Invalid pack ID: ${item.packId}` });
        }
      }

      if (hasTaxableItems) {
        totalAmount += TAX_RATES.TIMBRE;
      }

      const isAdmin = req.user?.role === 'ADMIN';
      let initialStatus = OrderStatus.PENDING_PAYMENT;

      // Auto-confirm orders for admins or if the total is zero
      if (isAdmin || totalAmount === 0) {
        initialStatus = OrderStatus.CONFIRMED;
      }

      const newOrder: Omit<Order, '_id'> = {
        userId: new ObjectId(userId),
        items: processedItems,
        totalAmount, // Rounded to 3 decimals implicitly by JS number, but good to handle on frontend
        status: initialStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await ordersCollection.insertOne(newOrder as Order);

      // AUTO-CONFIRM LOGIC FOR ADMINS or FREE orders
      if (initialStatus === OrderStatus.CONFIRMED) {
        // 1. Register for Webinars
        const webinarItems = processedItems.filter(
          (i) => i.type === ProductType.WEBINAR && i.webinarId,
        );
        for (const item of webinarItems) {
          await webinarsCollection.updateOne(
            { _id: item.webinarId },
            {
              $push: {
                attendees: {
                  userId: new ObjectId(userId),
                  status: 'CONFIRMED',
                  registeredAt: new Date(),
                  timeSlots: item.slots,
                  proofUrl: 'ADMIN_AUTO_CONFIRM', // Marker for auto-confirmation
                },
              },
            },
          );
        }

        // 2. Grant Credits for Packs
        const packItemsForAdmin = processedItems.filter(
          (i) => i.type === ProductType.PACK && i.packId,
        );
        let masterClassCreditsToAdd = 0;
        let pharmiaCreditsToAdd = 0;
        for (const item of packItemsForAdmin) {
          const mcPackDef = MASTER_CLASS_PACKS.find(
            (p) => p.id === item.packId,
          );
          if (mcPackDef) {
            masterClassCreditsToAdd += mcPackDef.credits;
          }
          const piaPackDef = PHARMIA_CREDIT_PACKS.find(
            (p) => p.id === item.packId,
          );
          if (piaPackDef) {
            pharmiaCreditsToAdd += piaPackDef.credits;
          }
        }

        if (masterClassCreditsToAdd > 0) {
          const usersCollection = db.collection('users');
          await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { masterClassCredits: masterClassCreditsToAdd } },
          );
        }
        if (pharmiaCreditsToAdd > 0) {
          const usersCollection = db.collection('users');
          await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { pharmiaCredits: pharmiaCreditsToAdd } },
          );
        }
      }

      res.status(201).json({
        message: isAdmin
          ? 'Order automatically confirmed (Admin).'
          : 'Order created successfully.',
        orderId: result.insertedId,
        totalAmount: totalAmount,
        status: initialStatus,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res
        .status(500)
        .json({ message: 'Internal server error while creating order.' });
    }
  },
);

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

    const orders = await ordersCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Populate user details for each order
    const userIds = orders.map((o) => o.userId).filter((id) => id);
    const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))].map(
      (id) => new ObjectId(id),
    );

    const users = await usersCollection
      .find(
        { _id: { $in: uniqueUserIds } },
        { projection: { firstName: 1, lastName: 1, email: 1 } },
      )
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const ordersWithUsers = orders.map((order) => ({
      ...order,
      user: userMap.get(order.userId.toString()) || { email: 'Unknown' },
    }));

    res.json(ordersWithUsers);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res
      .status(500)
      .json({ message: 'Internal server error while fetching orders.' });
  }
});

// GET /api/orders/my-orders
// Lists orders for the authenticated user.
router.get(
  '/my-orders',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const ordersCollection = db.collection<Order>('orders');

      const orders = await ordersCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .toArray();

      res.json(orders);
    } catch (error) {
      console.error('Error fetching user orders:', error);
      res
        .status(500)
        .json({ message: 'Internal server error while fetching user orders.' });
    }
  },
);

// GET /api/orders/:orderId
// Retrieves a specific order, ensuring the user is authorized to view it.
router.get(
  '/:orderId',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
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

      const order = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      // Ensure the user is the owner of the order or an admin
      if (
        order.userId.toString() !== userId?.toString() &&
        userRole !== 'ADMIN'
      ) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to view this order.' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res
        .status(500)
        .json({ message: 'Internal server error while fetching order.' });
    }
  },
);

// POST /api/orders/:orderId/submit-payment
// Associates a proof of payment with an order and registers the user for all webinars in that order.
router.post(
  '/:orderId/submit-payment',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
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
      return res
        .status(400)
        .json({ message: 'Proof of payment URL is required.' });
    }

    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const ordersCollection = db.collection<Order>('orders');
      const webinarsCollection = db.collection<Webinar>('webinars');

      // First, find the order and verify it belongs to the user
      const order = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
      });
      if (!order) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      const orderUserId = new ObjectId(order.userId);
      const requestUserId = new ObjectId(userId);

      if (!orderUserId.equals(requestUserId)) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to update this order.' });
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return res
          .status(409)
          .json({ message: `Order is already in status: ${order.status}` });
      }

      // Update the order status and add the proof URL
      await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            status: OrderStatus.PAYMENT_SUBMITTED,
            paymentProofUrl: proofUrl,
            updatedAt: new Date(),
          },
        },
      );

      // Now, register the user for each webinar in the order. If it's a Master Class, register for all sessions of the same theme.
      for (const item of order.items) {
        if (item.webinarId) {
          const primaryWebinarId = new ObjectId(item.webinarId);
          const primaryWebinar = await webinarsCollection.findOne({
            _id: primaryWebinarId,
          });

          if (!primaryWebinar) continue; // Skip if webinar somehow not found

          let webinarsToRegister: Webinar[] = [primaryWebinar];

          // If it's a Master Class with a theme, find all its sessions
          if (
            primaryWebinar.group === WebinarGroup.MASTER_CLASS &&
            primaryWebinar.masterClassTheme
          ) {
            console.log(
              `[Submit Payment] Master Class item detected. Theme: ${primaryWebinar.masterClassTheme}`,
            );
            const themeWebinars = await webinarsCollection
              .find({
                group: WebinarGroup.MASTER_CLASS,
                masterClassTheme: primaryWebinar.masterClassTheme,
              })
              .toArray();

            if (themeWebinars.length > 0) {
              webinarsToRegister = themeWebinars;
              console.log(
                `[Submit Payment] Found ${themeWebinars.length} sessions for this theme.`,
              );
            }
          }

          // Register user for all webinars in the list (either 1 or all themed sessions)
          for (const webinarToRegister of webinarsToRegister) {
            const attendeeIndex = webinarToRegister.attendees.findIndex(
              (att) => att.userId.toString() === userId.toString(),
            );

            if (attendeeIndex === -1) {
              console.log(
                `[Submit Payment] Adding user ${userId} to webinar ${webinarToRegister._id}`,
              );
              await webinarsCollection.updateOne(
                { _id: webinarToRegister._id },
                {
                  $push: {
                    attendees: {
                      userId: new ObjectId(userId),
                      status: 'PAYMENT_SUBMITTED' as const,
                      proofUrl: proofUrl,
                      registeredAt: new Date(),
                      timeSlots: item.slots,
                    },
                  },
                },
              );
            } else {
              // Update existing pending registration with new proof
              console.log(
                `[Submit Payment] Updating user ${userId} in webinar ${webinarToRegister._id}`,
              );
              await webinarsCollection.updateOne(
                {
                  _id: webinarToRegister._id,
                  'attendees.userId': new ObjectId(userId),
                  'attendees.status': { $ne: 'CONFIRMED' }, // Don't overwrite confirmed status
                },
                {
                  $set: {
                    'attendees.$.proofUrl': proofUrl,
                    'attendees.$.status': 'PAYMENT_SUBMITTED',
                  },
                },
              );
            }
          }
        }
      }

      res.json({
        message:
          'Payment proof submitted and registrations are pending confirmation.',
      });
    } catch (error) {
      console.error('Error submitting payment proof for order:', error);
      res.status(500).json({
        message: 'Internal server error while submitting payment proof.',
      });
    }
  },
);

// POST /api/orders/:orderId/confirm (Admin Only)
// Confirms payment for an order, updates status, and grants credits if applicable.
router.post(
  '/:orderId/confirm',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
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

      const order = await ordersCollection.findOne({
        _id: new ObjectId(orderId),
      });

      if (!order) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      if (order.status === OrderStatus.CONFIRMED) {
        return res.status(409).json({ message: 'Order is already confirmed.' });
      }

      // 1. Update Order Status
      await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: OrderStatus.CONFIRMED, updatedAt: new Date() } },
      );

      // 2. Process Items (Grant Credits or Confirm Webinar Seats)
      let masterClassCreditsToAdd = 0;
      let pharmiaCreditsToAdd = 0;

      for (const item of order.items) {
        if (item.type === ProductType.PACK && item.packId) {
          const mcPack = MASTER_CLASS_PACKS.find((p) => p.id === item.packId);
          if (mcPack) {
            masterClassCreditsToAdd += mcPack.credits;
          }
          const piaPack = PHARMIA_CREDIT_PACKS.find(
            (p) => p.id === item.packId,
          );
          if (piaPack) {
            pharmiaCreditsToAdd += piaPack.credits;
          }
        } else if (!item.type || item.type === ProductType.WEBINAR) {
          if (item.webinarId) {
            const primaryWebinarId = new ObjectId(item.webinarId);
            console.log(
              `[Confirm Order] Processing webinar item: ${primaryWebinarId}`,
            );

            const primaryWebinar = await webinarsCollection.findOne({
              _id: primaryWebinarId,
            });

            if (!primaryWebinar) {
              console.warn(
                `[Confirm Order] Webinar ${primaryWebinarId} not found. Skipping.`,
              );
              continue;
            }

            let webinarsToConfirm: Webinar[] = [primaryWebinar];

            // If it's a Master Class with a theme, find all its sessions
            if (
              primaryWebinar.group === WebinarGroup.MASTER_CLASS &&
              primaryWebinar.masterClassTheme
            ) {
              console.log(
                `[Confirm Order] Master Class item detected. Theme: ${primaryWebinar.masterClassTheme}`,
              );
              const themeWebinars = await webinarsCollection
                .find({
                  group: WebinarGroup.MASTER_CLASS,
                  masterClassTheme: primaryWebinar.masterClassTheme,
                })
                .toArray();

              if (themeWebinars.length > 0) {
                webinarsToConfirm = themeWebinars;
                console.log(
                  `[Confirm Order] Found ${themeWebinars.length} sessions for this theme.`,
                );
              }
            }

            for (const webinar of webinarsToConfirm) {
              const attendeeIndex = webinar.attendees.findIndex(
                (att) => att.userId.toString() === order.userId.toString(),
              );

              if (attendeeIndex > -1) {
                // User is already in the list, update their status
                console.log(
                  `[Confirm Order] Updating user ${order.userId} to CONFIRMED for webinar ${webinar._id}`,
                );
                await webinarsCollection.updateOne(
                  {
                    _id: webinar._id,
                    'attendees.userId': new ObjectId(order.userId),
                  },
                  { $set: { 'attendees.$.status': 'CONFIRMED' } },
                );
              } else {
                // User is not in the list, add them
                console.log(
                  `[Confirm Order] Adding user ${order.userId} as CONFIRMED to webinar ${webinar._id}`,
                );
                await webinarsCollection.updateOne(
                  { _id: webinar._id },
                  {
                    $push: {
                      attendees: {
                        userId: new ObjectId(order.userId),
                        status: 'CONFIRMED' as const,
                        registeredAt: new Date(),
                        proofUrl: 'ADMIN_CONFIRM', // Confirmed by admin
                        timeSlots: item.slots, // Use slots from the purchased item
                      },
                    },
                  },
                );
              }
            }
          }
        }
      }

      // 3. Grant Credits to User
      if (masterClassCreditsToAdd > 0) {
        await usersCollection.updateOne(
          { _id: new ObjectId(order.userId) },
          { $inc: { masterClassCredits: masterClassCreditsToAdd } },
        );
      }
      if (pharmiaCreditsToAdd > 0) {
        await usersCollection.updateOne(
          { _id: new ObjectId(order.userId) },
          { $inc: { pharmiaCredits: pharmiaCreditsToAdd } },
        );
      }

      res.json({
        message: 'Order confirmed and credits/seats updated.',
        creditsAdded: masterClassCreditsToAdd + pharmiaCreditsToAdd,
      });
    } catch (error) {
      console.error('Error confirming order:', error);
      res
        .status(500)
        .json({ message: 'Internal server error while confirming order.' });
    }
  },
);

// PUT /api/orders/:orderId/invoiceUrl (Admin Only)
// Updates the invoiceUrl for a specific order.
router.put(
  '/:orderId/invoiceUrl',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const { orderId } = req.params;
    const { invoiceUrl } = req.body;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN' && userRole !== 'ADMIN_WEBINAR') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID.' });
    }

    if (
      typeof invoiceUrl !== 'string' &&
      invoiceUrl !== null &&
      invoiceUrl !== undefined
    ) {
      return res
        .status(400)
        .json({ message: 'invoiceUrl must be a string, null, or undefined.' });
    }

    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const ordersCollection = db.collection<Order>('orders');

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { invoiceUrl: invoiceUrl, updatedAt: new Date() } },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      res.json({ message: 'Invoice URL updated successfully.' });
    } catch (error) {
      console.error('Error updating invoice URL:', error);
      res
        .status(500)
        .json({ message: 'Internal server error while updating invoice URL.' });
    }
  },
);

export default router;
