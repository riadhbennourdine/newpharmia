
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
    const { name, pharmacistId, preparatorIds } = req.body;
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
    const { groupsCollection } = await getCollections();
    const groups = await groupsCollection.find({}).toArray();
    res.json(groups);
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
    const { name, pharmacistId, preparatorIds } = req.body;
    const { groupsCollection, usersCollection } = await getCollections();

    const updatedGroup = await groupsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, pharmacistId, preparatorIds } },
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
