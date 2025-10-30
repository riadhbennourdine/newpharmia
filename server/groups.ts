
import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { Group, User, UserRole } from '../types.js';

const router = express.Router();

// Get the database and collection
async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    groupsCollection: db.collection<Group>('groups'),
    usersCollection: db.collection<User>('users'),
  };
}

// Create a new group
router.post('/', async (req, res) => {
  try {
    const { name, pharmacistId, preparatorIds, managedBy, subscriptionAmount } = req.body;
    const { groupsCollection, usersCollection } = await getCollections();

    // Validate pharmacist
    const pharmacist = await usersCollection.findOne({ _id: new ObjectId(pharmacistId), role: UserRole.PHARMACIEN });
    if (!pharmacist) {
      return res.status(400).json({ message: 'Pharmacien invalide.' });
    }

    const newGroup: Group = {
      _id: new ObjectId(),
      name,
      pharmacistId,
      preparatorIds,
      assignedFiches: [],
      managedBy,
      subscriptionAmount,
    };

    const result = await groupsCollection.insertOne(newGroup);

    // Update users with the new group ID
    const userIdsToUpdate = [pharmacistId, ...preparatorIds];
    await usersCollection.updateMany(
      { _id: { $in: userIdsToUpdate.map(id => new ObjectId(id)) } },
      { $set: { groupId: newGroup._id } }
    );

    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du groupe.", error });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { groupsCollection, usersCollection } = await getCollections();
    
    // Fetch all groups, pharmacists, and managers concurrently
    const [groups, pharmacists, managers] = await Promise.all([
      groupsCollection.find({}).toArray(),
      usersCollection.find({ role: UserRole.PHARMACIEN }).toArray(),
      usersCollection.find({ role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] } }).toArray(),
    ]);

    // Create a map of pharmacists for easy lookup
    const pharmacistMap = new Map(pharmacists.map(p => [
      (p._id as ObjectId).toString(),
      {
        name: `${p.firstName} ${p.lastName}`,
        createdAt: p.createdAt,
        subscriptionEndDate: p.subscriptionEndDate,
        planName: p.planName,
        hasActiveSubscription: p.hasActiveSubscription,
      }
    ]));

    // Create a map of managers for easy lookup
    const managerMap = new Map(managers.map(m => [
        (m._id as ObjectId).toString(),
        `${m.firstName} ${m.lastName}`
    ]));

    // Add pharmacistName and dates to each group
    const populatedGroups = groups.map(group => {
      const pharmacistInfo = pharmacistMap.get((group.pharmacistId as ObjectId).toString());
      let managerName = 'Non assigné';
      if (group.managedBy && ObjectId.isValid(group.managedBy as string)) {
        managerName = managerMap.get((group.managedBy as ObjectId).toString()) || 'Non assigné';
      }

      return {
        ...group,
        pharmacistName: pharmacistInfo ? pharmacistInfo.name : 'Pharmacien non trouvé',
        pharmacistCreatedAt: pharmacistInfo ? pharmacistInfo.createdAt : undefined,
        pharmacistSubscriptionEndDate: pharmacistInfo ? pharmacistInfo.subscriptionEndDate : undefined,
        pharmacistPlanName: pharmacistInfo ? pharmacistInfo.planName : undefined,
        pharmacistHasActiveSubscription: pharmacistInfo ? pharmacistInfo.hasActiveSubscription : false,
        managedByName: managerName,
      };
    });

    res.json(populatedGroups);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des groupes.", error });
  }
});

// Get a single group
router.get('/:id', async (req, res) => {
  try {
    const { groupsCollection } = await getCollections();
    const group = await groupsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!group) {
      return res.status(404).json({ message: "Groupe non trouvé." });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du groupe.", error });
  }
});

// Update a group
router.put('/:id', async (req, res) => {
  try {
    const { name, pharmacistId, preparatorIds, managedBy, subscriptionAmount } = req.body;
    const { groupsCollection, usersCollection } = await getCollections();

    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (pharmacistId) updateFields.pharmacistId = pharmacistId;
    if (preparatorIds) updateFields.preparatorIds = preparatorIds;
    if (subscriptionAmount) updateFields.subscriptionAmount = subscriptionAmount;

    if (managedBy) {
      updateFields.managedBy = managedBy;
    } else if (managedBy === '') {
      updateFields.managedBy = undefined;
    }

    const updatedGroup = await groupsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!updatedGroup) {
      return res.status(404).json({ message: "Groupe non trouvé." });
    }

    // Update users
    const allUserIds = [pharmacistId, ...preparatorIds];
    await usersCollection.updateMany({ groupId: new ObjectId(req.params.id) }, { $unset: { groupId: '' } });
    await usersCollection.updateMany(
      { _id: { $in: allUserIds.map(id => new ObjectId(id)) } },
      { $set: { groupId: new ObjectId(req.params.id) } }
    );

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du groupe.", error });
  }
});

// Delete a group
router.delete('/:id', async (req, res) => {
  try {
    const { groupsCollection, usersCollection } = await getCollections();
    const groupId = new ObjectId(req.params.id);

    const result = await groupsCollection.deleteOne({ _id: groupId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Groupe non trouvé." });
    }

    // Remove groupId from users
    await usersCollection.updateMany({ groupId }, { $unset: { groupId: '' } });

    res.status(200).json({ message: "Groupe supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du groupe.", error });
  }
});

// Assign a memofiche to a group
router.post('/:id/assign-fiche', async (req, res) => {
  try {
    const { ficheId } = req.body;
    const { groupsCollection } = await getCollections();

    const result = await groupsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { assignedFiches: { ficheId, assignedAt: new Date() } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Groupe non trouvé." });
    }

    res.status(200).json({ message: "Mémofiche assignée avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'assignation de la mémofiche.", error });
  }
});

export default router;
