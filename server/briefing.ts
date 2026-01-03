import express from 'express';
import { ObjectId } from 'mongodb';
import clientPromise from './mongo.js';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import { generateBriefingScript } from './geminiService.js';
import { User, UserRole, Group, Webinar, WebinarStatus, WebinarGroup } from '../types.js';

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
                actions: group.dailyBriefing.actions || [],
                isToday: isToday
            });
        }

        res.json({ script: null, actions: [] });

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
        // Removed to allow regeneration


        // 1. Get Group Info
        let groupName = "PharmIA";
        let instruction = "";
        
        if (group) {
            groupName = group.name;
            instruction = group.instruction || "";
        }

        // 2. Get Upcoming Specific Webinars
        const now = new Date();
        const actions: { label: string; url: string; }[] = [];
        
        // A. Next Preparator Webinar (CROP)
        const nextCrop = await webinarsCollection.findOne(
            { date: { $gte: now }, group: WebinarGroup.CROP_TUNIS },
            { sort: { date: 1 } }
        );
        
        // B. Next Pharmacist Webinar (Master Class)
        const nextMasterClass = await webinarsCollection.findOne(
            { date: { $gte: now }, group: WebinarGroup.MASTER_CLASS },
            { sort: { date: 1 } }
        );

        // C. Upcoming Weekend Seminars (Friday - Sunday of the *next* weekend relative to now)
        // Calculate next Friday
        const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, find next Friday (7 days)
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        nextFriday.setHours(0, 0, 0, 0);

        const nextSunday = new Date(nextFriday);
        nextSunday.setDate(nextFriday.getDate() + 2); // Friday + 2 days = Sunday
        nextSunday.setHours(23, 59, 59, 999);

        const weekendSeminars = await webinarsCollection.find({
            date: { $gte: nextFriday, $lte: nextSunday }
        }).sort({ date: 1 }).toArray();


        // Format strings for Gemini & Actions
        let cropText = undefined;
        if (nextCrop) {
            cropText = `${nextCrop.title} le ${new Date(nextCrop.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
            actions.push({ label: `📅 CROP : ${nextCrop.title}`, url: `/webinars/${nextCrop._id}` });
        }

        let mcText = undefined;
        if (nextMasterClass) {
            mcText = `${nextMasterClass.title} le ${new Date(nextMasterClass.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
            actions.push({ label: `🎓 MasterClass : ${nextMasterClass.title}`, url: `/webinars/${nextMasterClass._id}` });
        }

        let weekendText = undefined;
        if (weekendSeminars.length > 0) {
            weekendText = weekendSeminars.map(w => `${w.title} (${new Date(w.date).toLocaleDateString('fr-FR', { weekday: 'long' })})`).join(", ");
            weekendSeminars.forEach(w => {
                 actions.push({ label: `🗓️ ${w.title}`, url: `/webinars/${w._id}` });
            });
        }

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
            nextPreparatorWebinar: cropText,
            nextPharmacistWebinar: mcText,
            weekendProgram: weekendText,
            tip
        });

        // 5. Save to Group
        await groupsCollection.updateOne(
            { _id: new ObjectId(user.groupId) },
            { $set: { dailyBriefing: { script, date: new Date(), actions } } }
        );

        res.json({ script, actions });

    } catch (error) {
        console.error('Error generating briefing:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du briefing.' });
    }
});

export default router;
