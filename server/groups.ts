
import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { Group, User, UserRole } from '../types.js';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';

const adminRouter = express.Router();
const nonAdminRouter = express.Router();

// Get the database and collection
async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    groupsCollection: db.collection<Group>('groups'),
    usersCollection: db.collection<User>('users'),
  };
}

// NON-ADMIN ROUTES

// Get group for the current user
nonAdminRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
    console.log('GET /api/groups hit for non-admin user');
    const user = req.user!; // Authenticated user is guaranteed

    try {
        const { usersCollection, groupsCollection } = await getCollections();
        
        if (!user.groupId) {
            return res.status(404).json({ message: 'Group not found for this user.' });
        }

        const group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération du groupe.", error });
    }
});


// Update planning for a group
nonAdminRouter.put('/:id/planning', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const { planning, isPlanningEnabled } = req.body;
        const groupId = req.params.id;
        const user = req.user!;
        const { groupsCollection } = await getCollections();

        // 1. Verify Permission
        const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
        if (!group) return res.status(404).json({ message: "Groupe non trouvé." });

        const isPharmacistInGroup = group.pharmacistIds.some(id => id.toString() === user._id.toString());
        const isManager = group.managedBy && group.managedBy.toString() === user._id.toString();
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.ADMIN_WEBINAR;

        if (!isPharmacistInGroup && !isManager && !isAdmin) {
             return res.status(403).json({ message: "Non autorisé à modifier le planning de ce groupe." });
        }

        // 2. Validate & Sanitize Planning Data
        const updateData: any = {};
        
        if (planning !== undefined) {
            if (!Array.isArray(planning)) return res.status(400).json({ message: "Format de planning invalide." });
            updateData.planning = planning.map((item: any) => ({
                ficheId: item.ficheId,
                startDate: new Date(item.startDate),
                endDate: item.endDate ? new Date(item.endDate) : undefined,
                active: item.active !== false
            }));
        }

        if (isPlanningEnabled !== undefined) {
            updateData.isPlanningEnabled = !!isPlanningEnabled;
        }

        // 3. Update Database
        await groupsCollection.updateOne(
            { _id: new ObjectId(groupId) },
            { $set: updateData }
        );

        res.status(200).json({ message: "Planning mis à jour avec succès.", ...updateData });

    } catch (error) {
        console.error("Erreur lors de la mise à jour du planning:", error);
        res.status(500).json({ message: "Erreur lors de la mise à jour du planning.", error });
    }
});

// Update instruction for a group
nonAdminRouter.put('/:id/instruction', async (req, res) => {
    try {
        const { instruction, primaryMemoFicheId, additionalMemoFicheIds } = req.body;
        const { groupsCollection } = await getCollections();

        const updateFields: any = {
            instruction,
            instructionDate: new Date(),
        };

        if (primaryMemoFicheId) {
            updateFields.primaryMemoFicheId = new ObjectId(primaryMemoFicheId);
        } else {
            updateFields.primaryMemoFicheId = undefined; // Clear if not provided
        }

        if (additionalMemoFicheIds && Array.isArray(additionalMemoFicheIds)) {
            updateFields.instructionFiches = additionalMemoFicheIds.map((id: string) => new ObjectId(id));
        } else {
            updateFields.instructionFiches = []; // Clear if not provided or invalid
        }

        const result = await groupsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Groupe non trouvé ou consigne non modifiée." });
        }

        res.status(200).json({ message: "Consigne mise à jour avec succès." });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la consigne:", error);
        res.status(500).json({ message: "Erreur lors de la mise à jour de la consigne.", error });
    }
});

// ADMIN ROUTES

// Create a new group
adminRouter.post('/', async (req, res) => {
  try {
    const { name, pharmacistIds, preparatorIds, managedBy, subscriptionAmount } = req.body;
    const { groupsCollection, usersCollection } = await getCollections();

    // Validate that there is at least one member
    if ((pharmacistIds?.length || 0) === 0 && (preparatorIds?.length || 0) === 0) {
      return res.status(400).json({ message: 'Le groupe doit contenir au moins un membre.' });
    }

    const pharmacistObjectIds = pharmacistIds.map((id: string) => new ObjectId(id));
    const pharmacists = await usersCollection.find({ _id: { $in: pharmacistObjectIds }, role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } }).toArray();

    if (pharmacists.length !== pharmacistIds.length) {
      return res.status(400).json({ message: 'Un ou plusieurs pharmaciens sont invalides ou n\'existent pas.' });
    }

    const newGroup: Group = {
      _id: new ObjectId(),
      name,
      pharmacistIds: pharmacistObjectIds, // Utiliser le tableau d'ObjectIds
      preparatorIds: preparatorIds.map((id: string) => new ObjectId(id)),
      assignedFiches: [],
      managedBy: managedBy ? new ObjectId(managedBy) : undefined,
      subscriptionAmount,
    };

    const result = await groupsCollection.insertOne(newGroup);

    // Update users with the new group ID
    const userIdsToUpdate = [...pharmacistObjectIds, ...preparatorIds.map((id: string) => new ObjectId(id))];
    await usersCollection.updateMany(
      { _id: { $in: userIdsToUpdate } },
      { $set: { groupId: newGroup._id } }
    );

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Erreur lors de la création du groupe:", error);
    res.status(500).json({ message: "Erreur lors de la création du groupe.", error });
  }
});

// Get all groups
adminRouter.get('/', async (req, res) => {
  try {
    const { groupsCollection, usersCollection } = await getCollections();
    
    // Fetch all groups, pharmacists, and managers concurrently
    const [groups, pharmacists, managers] = await Promise.all([
      groupsCollection.find({}).toArray(),
      usersCollection.find({ role: { $in: [UserRole.PHARMACIEN, UserRole.ADMIN_WEBINAR] } }).toArray(),
      usersCollection.find({ role: { $in: [UserRole.ADMIN, UserRole.FORMATEUR] } }).toArray(),
    ]);

    // Combine all users who could potentially be a manager
    const allPotentialManagers = [...pharmacists, ...managers];

    // Create a map of pharmacists for easy lookup
    const pharmacistMap = new Map(pharmacists.map(p => [
      (p._id as ObjectId).toString(),
      `${p.firstName} ${p.lastName}`
    ]));

    // Create a map of managers for easy lookup
    const managerMap = new Map(managers.map(m => [
        (m._id as ObjectId).toString(),
        `${m.firstName} ${m.lastName}`
    ]));

    // Add pharmacistNames, managerName, and subscriptionEndDate to each group
    const populatedGroups = groups.map(group => {
      const pharmacistNames = (group.pharmacistIds || [])
        .map(id => pharmacistMap.get(id.toString()))
        .filter(name => name) as string[];

      let managerName = 'Non assigné';
      let groupSubscriptionEndDate: Date | undefined = undefined;

      // Find the earliest subscriptionEndDate among all pharmacists in the group
      if (group.pharmacistIds && group.pharmacistIds.length > 0) {
        const pharmacistSubscriptionDates: Date[] = [];
        for (const pharmacistId of group.pharmacistIds) {
          const pharmacist = pharmacists.find(p => (p._id as ObjectId).toString() === pharmacistId.toString());
          if (pharmacist && pharmacist.subscriptionEndDate) {
            pharmacistSubscriptionDates.push(pharmacist.subscriptionEndDate);
          }
        }
        if (pharmacistSubscriptionDates.length > 0) {
          groupSubscriptionEndDate = new Date(Math.min(...pharmacistSubscriptionDates.map(date => date.getTime())));
        }
      }

      if (group.managedBy && ObjectId.isValid(group.managedBy.toString())) {
        const managerId = group.managedBy.toString();
        // Use the combined map for name lookup for simplicity, or create a combined one
        const tempManagerName = allPotentialManagers.find(m => (m._id as ObjectId).toString() === managerId);
        managerName = tempManagerName ? `${tempManagerName.firstName} ${tempManagerName.lastName}` : 'Non assigné';
      }

      return {
        ...group,
        pharmacistNames: pharmacistNames,
        managedByName: managerName,
        preparatorIds: group.preparatorIds || [],
        subscriptionEndDate: groupSubscriptionEndDate,
      };
    });

    res.json(populatedGroups);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des groupes.", error });
  }
});

// Get a single group
adminRouter.get('/:id', async (req, res) => {
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
adminRouter.put('/:id', async (req, res) => {
  try {
    const { name, pharmacistIds, preparatorIds, managedBy, subscriptionAmount, subscriptionEndDate, primaryMemoFicheId, instructionFiches } = req.body;
    const { groupsCollection, usersCollection } = await getCollections();
    const groupId = new ObjectId(req.params.id);



    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (pharmacistIds !== undefined) updateFields.pharmacistIds = (pharmacistIds as string[]).map(id => new ObjectId(id));
    if (preparatorIds !== undefined) updateFields.preparatorIds = (preparatorIds as string[]).map(id => new ObjectId(id));
    if (subscriptionAmount) updateFields.subscriptionAmount = subscriptionAmount;
    
    if (managedBy) {
      updateFields.managedBy = new ObjectId(managedBy);
    } else if (managedBy === '' || managedBy === null) {
      updateFields.managedBy = null; // Explicitly set to null to clear
    }

    // Handle primaryMemoFicheId
    if (primaryMemoFicheId) {
        updateFields.primaryMemoFicheId = new ObjectId(primaryMemoFicheId);
    } else if (primaryMemoFicheId === null) {
        updateFields.primaryMemoFicheId = null; // Explicitly set to null to clear
    }

    // Handle instructionFiches
    if (instructionFiches && Array.isArray(instructionFiches)) {
        updateFields.instructionFiches = instructionFiches.map((id: string) => new ObjectId(id));
    } else if (instructionFiches === null || instructionFiches === undefined) {
        updateFields.instructionFiches = []; // Explicitly set to empty array to clear
    }

    const updatedGroup = await groupsCollection.findOneAndUpdate(
      { _id: groupId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!updatedGroup) {
      return res.status(404).json({ message: "Groupe non trouvé." });
    }

    // Update users' groupId
    const oldGroupUsers = await usersCollection.find({ groupId: groupId }).toArray();
    const oldUserIds = oldGroupUsers.map(u => u._id);

    const newUserIds = [
      ...(updateFields.pharmacistIds || []),
      ...(updateFields.preparatorIds || [])
    ];

    const usersToRemove = oldUserIds.filter(id => !newUserIds.some(newId => newId.toString() === id.toString()));
    const usersToAdd = newUserIds.filter(id => !oldUserIds.some(oldId => oldId.toString() === id.toString()));

    if (usersToRemove.length > 0) {
      await usersCollection.updateMany(
        { _id: { $in: usersToRemove } },
        { $unset: { groupId: "" } }
      );
    }

    if (usersToAdd.length > 0) {
      await usersCollection.updateMany(
        { _id: { $in: usersToAdd } },
        { $set: { groupId: groupId } }
      );
    }

    res.json(updatedGroup);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du groupe:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du groupe.", error });
  }
});

// Delete a group
adminRouter.delete('/:id', async (req, res) => {
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
adminRouter.post('/:id/assign-fiche', async (req, res) => {
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

export { adminRouter, nonAdminRouter };
