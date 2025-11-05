import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
router.post('/image', upload.single('webinarImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // The file is saved by multer. We return the public URL.
    // Note: The server must be configured to serve the 'public' directory statically.
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Endpoint to get all uploaded images
router.get('/images', (req, res) => {
    const uploadDirectory = '/data/uploads/';

    fs.readdir(uploadDirectory, (err, files) => {
        if (err) {
            // If the directory doesn't exist, return an empty array
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error("Failed to read upload directory:", err);
            return res.status(500).json({ message: 'Failed to list images.' });
        }

        const imageUrls = files
            .filter(file => /\.(jpe?g|png|gif|webp)$/i.test(file)) // Filter for common image extensions
            .map(file => `/uploads/${file}`)
            .sort((a, b) => b.localeCompare(a)); // Sort by name, newest first if filenames are timestamped

        res.json(imageUrls);
    });
});

export default router;
