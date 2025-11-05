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

export default router;
