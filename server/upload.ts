import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import clientPromise from './mongo.js';
import { Image } from '../types.js';

const router = express.Router();

// Configure multer for file storage in memory
const upload = multer({ storage: multer.memoryStorage() });

// The base path inside the container where the volume is mounted
const VOLUME_BASE_PATH = '/app/public/uploads';

// The upload endpoint
router.post('/image', upload.single('imageFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer } = req.file;
    const { name, theme } = req.body;

    if (!name || !theme) {
        return res.status(400).json({ message: 'Name and theme are required.' });
    }

    try {
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalname)}`;
        const localPath = path.join(VOLUME_BASE_PATH, uniqueFilename);

        // Ensure the base directory exists
        await fs.mkdir(VOLUME_BASE_PATH, { recursive: true });
        
        // Write the file to the volume
        await fs.writeFile(localPath, buffer);

        // The public URL path to the file
        const imageUrl = `/uploads/${uniqueFilename}`;

        const client = await clientPromise;
        const db = client.db('pharmia');
        const imagesCollection = db.collection<Image>('images');

        const newImage: Omit<Image, '_id'> = {
            name,
            theme,
            url: imageUrl,
            createdAt: new Date(),
        };

        await imagesCollection.insertOne(newImage as Image);

        res.status(201).json({ imageUrl });

    } catch (error) {
        console.error('Error saving file to volume or metadata:', error);
        res.status(500).json({ message: 'Error saving file or metadata.' });
    }
});

// Generic file upload endpoint
router.post('/file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer } = req.file;
    try {
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalname)}`;
        const localPath = path.join(VOLUME_BASE_PATH, uniqueFilename);
        
        // Ensure the base directory exists
        await fs.mkdir(VOLUME_BASE_PATH, { recursive: true });
        
        // Write the file to the volume
        await fs.writeFile(localPath, buffer);
        
        // The public URL path to the file
        const fileUrl = `/uploads/${uniqueFilename}`;

        res.status(201).json({ fileUrl });
    } catch (err) {
        console.error('Error saving file to volume:', err);
        res.status(500).json({ message: 'Failed to save file.' });
    }
});

// Endpoint to get all uploaded images
router.get('/images', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db('pharmia');
        const imagesCollection = db.collection<Image>('images');

        const images = await imagesCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.json(images);
    } catch (error) {
        console.error("Failed to fetch images from db:", error);
        return res.status(500).json({ message: 'Failed to list images.' });
    }
});

export default router;
