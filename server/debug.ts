// server/debug.ts
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import { UserRole } from '../types.js';

const router = express.Router();

const VOLUME_BASE_PATH = '/app/public/uploads';

// This endpoint is for debugging purposes to list files in the volume.
// It should be removed after use.
router.get('/list-volume', authenticateToken, async (req: AuthenticatedRequest, res) => {
  // Ensure only an admin can run this
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Unauthorized. Only admins can perform this action.' });
  }

  const fileList: string[] = [];

  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(VOLUME_BASE_PATH, fullPath);
        fileList.push(relativePath);
        if (entry.isDirectory()) {
          await walk(fullPath);
        }
      }
    } catch (error: any) {
      // If the directory doesn't exist, just return an empty list.
      if (error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  try {
    await walk(VOLUME_BASE_PATH);
    res.json({
      message: `Found ${fileList.length} files/directories in volume.`,
      files: fileList.sort(),
    });
  } catch (error: any) {
    console.error('[Debug] Error listing volume files:', error);
    res.status(500).json({ message: 'Failed to list files from volume.', error: error.message });
  }
});

export default router;
