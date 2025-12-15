import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { WebinarGroup } from '../types'; // Assuming WebinarGroup is defined in types.ts
import fs from 'fs';
import path from 'path';

dotenv.config({ path: './.env' }); // Explicitly load from .env

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error('MONGO_URL is not defined in .env');
    process.exit(1);
}

// Read masterClassData from mc.json
let masterClassData: any[] = [];
try {
    const mcJsonPath = path.join(process.cwd(), 'mc.json');
    const mcJsonContent = fs.readFileSync(mcJsonPath, 'utf-8');
    masterClassData = JSON.parse(mcJsonContent);
    console.log(`Loaded ${masterClassData.length} MasterClasses from mc.json.`);
} catch (error) {
    console.error('Error loading mc.json:', error);
    process.exit(1);
}

const parseDate = (dateStr: string, timeStr: string): Date | null => {
    // dateStr example: "Jeudi 18/12/2025"
    // timeStr example: "09:00"

    const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!parts) return null;

    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[3], 10);

    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create date in UTC to avoid timezone issues when comparing with MongoDB ISODate
    const date = new Date(Date.UTC(year, month, day, hours, minutes, 0));
    
    // Validate if the date is valid
    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
};

const insertMasterClasses = async () => {
    let client: MongoClient | undefined;
    try {
        console.log('Connecting to MongoDB...');
        client = await MongoClient.connect(MONGO_URL);
        const db = client.db();
        const webinarsCollection = db.collection('webinars');

        console.log(`Attempting to insert ${masterClassData.length} MasterClasses...`);
        let insertedCount = 0;
        let skippedCount = 0;

        for (const mc of masterClassData) {
            const parsedDate = parseDate(mc.date, mc.time); // Parse date and time
            if (!parsedDate) {
                console.error(`Skipping MasterClass "${mc.title}" due to invalid date format: ${mc.date}`);
                skippedCount++;
                continue;
            }

            const newWebinar = {
                group: mc.group as WebinarGroup, // Cast to WebinarGroup
                date: parsedDate,
                title: mc.title,
                description: mc.description,
                objectives: mc.objectives || [], // Ensure objectives is an array
                cta: mc.cta || '', // Ensure cta is a string
                time: mc.time, // Also store time as a separate field if needed
                createdAt: new Date(),
                updatedAt: new Date(),
                attendees: [], // Initialize empty attendees array
                // Add any other default fields required by your Webinar schema
            };

            // Check if a webinar with the same title and date already exists
            const existingWebinar = await webinarsCollection.findOne({
                title: newWebinar.title,
                group: newWebinar.group,
                date: newWebinar.date, // Exact date match now that it's a Date object
            });

            if (existingWebinar) {
                console.log(`MasterClass already exists, skipping insertion: "${newWebinar.title}" (${newWebinar.date.toLocaleDateString()})`);
                skippedCount++;
            } else {
                const result = await webinarsCollection.insertOne(newWebinar);
                if (result.acknowledged) {
                    console.log(`Inserted: "${newWebinar.title}" (${newWebinar.date.toLocaleDateString()})`);
                    insertedCount++;
                } else {
                    console.error(`Failed to insert: "${newWebinar.title}"`);
                    skippedCount++;
                }
            }
        }
        console.log(`Insertion complete. Successfully inserted ${insertedCount} new MasterClasses, skipped ${skippedCount}.`);

    } catch (error) {
        console.error('Error inserting MasterClasses:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
};

(async () => {
    await insertMasterClasses();
})();