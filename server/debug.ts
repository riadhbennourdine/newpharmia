// server/debug.ts
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware.js';
import { UserRole } from '../types.js';
import clientPromise from './mongo.js';

const router = express.Router();

const VOLUME_BASE_PATH = '/app/public/uploads';

const BROKEN_URL_PATTERNS = ['/api/ftp/view', 'https://pharmaconseilbmb.com'];

interface BrokenLink {
  type: 'Webinar' | 'Proof of Payment' | 'MemoFiche';
  id: string;
  name: string;
  field: string;
  brokenUrl: string;
}

// Endpoint to find all documents with old/broken URLs
router.get(
  '/broken-links',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== UserRole.ADMIN) {
      return res
        .status(403)
        .json({
          message: 'Unauthorized. Only admins can perform this action.',
        });
    }

    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const brokenLinks: BrokenLink[] = [];

      // 1. Scan Webinars for imageUrl
      const webinarsCollection = db.collection('webinars');
      const brokenWebinars = await webinarsCollection
        .find({
          imageUrl: { $regex: BROKEN_URL_PATTERNS.join('|') },
        })
        .toArray();
      brokenWebinars.forEach((w) => {
        brokenLinks.push({
          type: 'Webinar',
          id: w._id.toString(),
          name: w.title,
          field: 'imageUrl',
          brokenUrl: w.imageUrl,
        });
      });

      // 2. Scan Users (Clients) for paymentProofUrl
      const usersCollection = db.collection('users');
      const brokenProofs = await usersCollection
        .find({
          paymentProofUrl: { $regex: BROKEN_URL_PATTERNS.join('|') },
        })
        .toArray();
      brokenProofs.forEach((u) => {
        brokenLinks.push({
          type: 'Proof of Payment',
          id: u._id.toString(),
          name: `Client: ${u.firstName} ${u.lastName}`,
          field: 'paymentProofUrl',
          brokenUrl: u.paymentProofUrl!,
        });
      });

      // 3. Scan Memofiches for coverImageUrl, infographicImageUrl, and content images
      /*
        const memofichesCollection = db.collection('memofiches');
        const brokenFiches = await memofichesCollection.find({
            $or: [
                { coverImageUrl: { $regex: BROKEN_URL_PATTERNS.join('|') } },
                { infographicImageUrl: { $regex: BROKEN_URL_PATTERNS.join('|') } },
                { "memoSections.content.value": { $regex: BROKEN_URL_PATTERNS.join('|') } },
                { "customSections.content.value": { $regex: BROKEN_URL_PATTERNS.join('|') } },
            ]
        }).toArray();

        brokenFiches.forEach(f => {
            if (f.coverImageUrl && BROKEN_URL_PATTERNS.some(p => f.coverImageUrl.includes(p))) {
                brokenLinks.push({ type: 'MemoFiche', id: f._id.toString(), name: f.title, field: 'coverImageUrl', brokenUrl: f.coverImageUrl });
            }
            if (f.infographicImageUrl && BROKEN_URL_PATTERNS.some(p => f.infographicImageUrl.includes(p))) {
                brokenLinks.push({ type: 'MemoFiche', id: f._id.toString(), name: f.title, field: 'infographicImageUrl', brokenUrl: f.infographicImageUrl });
            }
            const findBrokenContent = (sections: any[], sectionType: string) => {
                sections?.forEach(s => {
                    s.content?.forEach((c: any, i: number) => {
                        if (c.type === 'image' && c.value && BROKEN_URL_PATTERNS.some(p => c.value.includes(p))) {
                            brokenLinks.push({ type: 'MemoFiche', id: f._id.toString(), name: f.title, field: `${sectionType}[${s.id || ''}].content[${i}]`, brokenUrl: c.value });
                        }
                    });
                });
            };
            findBrokenContent(f.memoSections, 'memoSections');
            findBrokenContent(f.customSections, 'customSections');
        });
        */

      res.json(brokenLinks);
    } catch (error: any) {
      console.error('[Debug] Error finding broken links:', error);
      res
        .status(500)
        .json({
          message: 'Failed to find broken links.',
          error: error.message,
        });
    }
  },
);

// This endpoint is for debugging purposes to list files in the volume.
// It should be removed after use.
router.get(
  '/list-volume',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    // Ensure only an admin can run this
    if (req.user?.role !== UserRole.ADMIN) {
      return res
        .status(403)
        .json({
          message: 'Unauthorized. Only admins can perform this action.',
        });
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
      res
        .status(500)
        .json({
          message: 'Failed to list files from volume.',
          error: error.message,
        });
    }
  },
);

// This endpoint allows an admin to download a specific file from the volume.
// It should be removed after use.
router.get(
  '/download-file',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    // Ensure only an admin can run this
    if (req.user?.role !== UserRole.ADMIN) {
      return res
        .status(403)
        .json({
          message: 'Unauthorized. Only admins can perform this action.',
        });
    }

    const { filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).send('A "filePath" query parameter is required.');
    }

    try {
      const sanitizedPath = path
        .normalize(filePath)
        .replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(VOLUME_BASE_PATH, sanitizedPath);

      // Use res.download() which handles headers and prompts the user to save the file.
      res.download(fullPath, (err) => {
        if (err) {
          // Handle errors, such as file not found
          if (!res.headersSent) {
            console.error(`[Debug] Failed to download file: ${fullPath}`, err);
            res.status(404).send('File not found.');
          }
        }
      });
    } catch (error: any) {
      console.error('[Debug] Error preparing file for download:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal server error.');
      }
    }
  },
);

export default router;
