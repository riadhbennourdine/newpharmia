import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises'; // Use fs/promises for async file operations
import clientPromise from './mongo.js';
import { Image } from '../types.js';
import { connectAndReturnFtpClient } from './ftp.js'; // Import the FTP connection function

const router = express.Router();

// Configure multer for file storage in memory
const upload = multer({ storage: multer.memoryStorage() });

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

    let ftpClient;
    try {
        ftpClient = await connectAndReturnFtpClient();
        const ftpFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalname)}`;
        await ftpClient.uploadFrom(buffer, ftpFileName);

        const imageUrl = `/api/ftp/view/${ftpFileName}`; // URL to serve from our FTP proxy endpoint

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
        console.error('Error uploading image to FTP or saving metadata:', error);
        res.status(500).json({ message: 'Error uploading image or saving metadata.' });
    } finally {
        if (ftpClient) ftpClient.close();
    }
});

// Generic file upload endpoint
router.post('/file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer } = req.file;
    let ftpClient;
    try {
        ftpClient = await connectAndReturnFtpClient();
        const ftpFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalname)}`;
        await ftpClient.uploadFrom(buffer, ftpFileName);

        const fileUrl = `/api/ftp/view/${ftpFileName}`; // URL to serve from our FTP proxy endpoint
        res.status(201).json({ fileUrl });
    } catch (err) {
        console.error('Error uploading file to FTP:', err);
        res.status(500).json({ message: 'Failed to upload file to FTP.' });
    } finally {
        if (ftpClient) ftpClient.close();
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
