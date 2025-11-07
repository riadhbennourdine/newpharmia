import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import clientPromise from './mongo.js';
import { Image } from '../types.js';

const router = express.Router();

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destPath = '/data/uploads/';
        fs.mkdirSync(destPath, { recursive: true });
        cb(null, destPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// The upload endpoint
router.post('/image', upload.single('imageFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const { name, theme } = req.body;
    if (!name || !theme) {
        // Clean up the uploaded file if metadata is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Name and theme are required.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
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
        console.error('Error saving image metadata:', error);
        // Clean up the uploaded file if db insertion fails
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error saving image metadata.' });
    }
});

// Generic file upload endpoint
router.post('/file', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ fileUrl });
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
