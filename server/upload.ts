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

import sharp from 'sharp';

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
    // Optimize the image with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true }) // Resize to max 1920px width, don't enlarge
      .webp({ quality: 80 }) // Convert to WEBP with 80% quality
      .toBuffer();

    const originalExtension = path.extname(originalname);
    const originalFilename = path.basename(originalname, originalExtension);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${originalFilename}.webp`;
    const localPath = path.join(VOLUME_BASE_PATH, uniqueFilename);

    // Ensure the base directory exists
    await fs.mkdir(VOLUME_BASE_PATH, { recursive: true });

    // Write the optimized file to the volume
    await fs.writeFile(localPath, optimizedBuffer);

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
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalname)}`;
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

// Endpoint to get all uploaded images with pagination
router.get('/images', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const imagesCollection = db.collection<Image>('images');

    const totalImages = await imagesCollection.countDocuments();
    const images = await imagesCollection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    res.json({
      images,
      totalPages: Math.ceil(totalImages / limit),
      currentPage: page,
      totalImages,
    });
  } catch (error) {
    console.error('Failed to fetch images from db:', error);
    return res.status(500).json({ message: 'Failed to list images.' });
  }
});

export default router;
