import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import { generateBriefingScript } from './geminiService.js';
import { User, UserRole, Group, Webinar, WebinarStatus } from '../types.js';

const router = express.Router();

async function getCollections() {
  const client = await clientPromise;
  const db = client.db('pharmia');
  return {
    groupsCollection: db.collection<Group>('groups'),
    webinarsCollection: db.collection<Webinar>('webinars'),
    usersCollection: db.collection<User>('users'),
    memofichesCollection: db.collection('memofiches'),
  };
}

// Get the daily briefing for the user's group (always available if it exists)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const user = req.user!;
        const { groupsCollection } = await getCollections();

        if (!user.groupId) {
            return res.status(404).json({ message: 'User has no group.' });
        }

        const group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
        
        if (group && group.dailyBriefing) {
            const briefingDate = new Date(group.dailyBriefing.date);
            const today = new Date();
            const isToday = briefingDate.toDateString() === today.toDateString();
            
            return res.json({ 
                script: group.dailyBriefing.script, 
                date: group.dailyBriefing.date,
                isToday: isToday
            });
        }

        res.json({ script: null });

    } catch (error) {
        console.error('Error fetching briefing:', error);
        res.status(500).json({ message: 'Error fetching briefing.' });
    }
});

// Generate a daily briefing script for the user's group
router.post('/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
        const user = req.user!;
        // Only pharmacists (and admins) can generate briefings
        if (user.role !== UserRole.PHARMACIEN && user.role !== UserRole.ADMIN && user.role !== UserRole.ADMIN_WEBINAR) {
             return res.status(403).json({ message: 'Only pharmacists can generate briefings.' });
        }

        const { groupsCollection, webinarsCollection, memofichesCollection } = await getCollections();

        if (!user.groupId) {
             return res.status(400).json({ message: 'User not in a group.' });
        }

        const group = await groupsCollection.findOne({ _id: new ObjectId(user.groupId) });
        
        // 0. Check if already generated today
        if (group && group.dailyBriefing) {
            const briefingDate = new Date(group.dailyBriefing.date);
            const today = new Date();
            if (briefingDate.toDateString() === today.toDateString()) {
                // If force-regenerate flag isn't set (future feature), return existing
                return res.json({ script: group.dailyBriefing.script, alreadyExists: true });
            }
        }

        // 1. Get Group Info
        let groupName = "PharmIA";
        let instruction = "";
        
        if (group) {
            groupName = group.name;
            instruction = group.instruction || "";
        }

        // 2. Get Upcoming Webinars (Next 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const upcomingWebinars = await webinarsCollection.find({
            date: { $gte: now, $lte: nextWeek }
        }).sort({ date: 1 }).limit(2).toArray();

        const webinarTexts = upcomingWebinars.map(w => 
            `${w.title} le ${new Date(w.date).toLocaleDateString('fr-FR', { weekday: 'long' })}`
        );

        // 3. Get a Random Clinical Tip (from a random MemoFiche)
        const randomFiche = await memofichesCollection.aggregate([
            { $sample: { size: 1 } },
            { $project: { title: 1, keyPoints: 1 } }
        ]).toArray();

        let tip = "";
        if (randomFiche.length > 0 && randomFiche[0].keyPoints && randomFiche[0].keyPoints.length > 0) {
            // Take the first key point
            tip = `Sur le sujet "${randomFiche[0].title}" : ${randomFiche[0].keyPoints[0]}`;
        }

        // 4. Generate Script with Gemini
        const script = await generateBriefingScript({
            groupName,
            instruction,
            webinars: webinarTexts,
            tip
        });

        // 5. Save to Group
        await groupsCollection.updateOne(
            { _id: new ObjectId(user.groupId) },
            { $set: { dailyBriefing: { script, date: new Date() } } }
        );

        res.json({ script });

    } catch (error) {
        console.error('Error generating briefing:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du briefing.' });
    }
});

export default router;
