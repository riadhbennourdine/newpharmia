// server/migration.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import { UserRole } from '../types.js';

const router = express.Router();

// Configure multer for memory storage to handle the file buffer
const upload = multer({ storage: multer.memoryStorage() });

// The base path inside the container where the volume is mounted
const VOLUME_BASE_PATH = '/app/public/uploads';

// This endpoint is temporary and should be removed or disabled after the migration is complete.
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  // 1. Authorization: Ensure only an admin can run this
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Unauthorized. Only admins can perform this action.' });
  }

  // 2. Validate request
  if (!req.file) {
    return res.status(400).json({ message: 'No file was uploaded.' });
  }
  const destinationPath = req.body.destinationPath as string;
  if (!destinationPath) {
    return res.status(400).json({ message: 'A "destinationPath" is required in the request body.' });
  }

  try {
    // Ensure destinationPath doesn't contain directory traversal attempts
    const sanitizedDestinationPath = path.normalize(destinationPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const finalPath = path.join(VOLUME_BASE_PATH, sanitizedDestinationPath);
    const finalDir = path.dirname(finalPath);

    // 3. Ensure the destination directory exists within the volume
    await fs.mkdir(finalDir, { recursive: true });

    // 4. Write the file from buffer to the volume
    await fs.writeFile(finalPath, req.file.buffer);

    console.log(`[Migration] Successfully saved ${req.file.originalname} to ${finalPath}`);
    res.status(201).json({ message: 'File migrated successfully.', path: finalPath });

  } catch (error: any) {
    console.error(`[Migration] Error saving file ${req.file.originalname}:`, error);
    res.status(500).json({ message: 'Failed to save file to volume.', error: error.message });
  }
});

export default router;
