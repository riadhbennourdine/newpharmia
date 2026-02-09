import express from 'express';
import os from 'os';
import { Client } from 'basic-ftp';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs/promises'; // Use fs/promises for async file operations
import { Readable } from 'stream'; // Import Readable for converting buffer to stream
import { fileURLToPath } from 'url'; // Import fileURLToPath for __dirname equivalent

const router = express.Router();
const upload = multer({ dest: 'uploads_temp/' }); // Temporary storage for multer

// Définir __filename et __dirname pour le contexte du module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFtpConfig = () => {
  return {
    host: process.env.FTP_HOST || 'localhost',
    port: parseInt(process.env.FTP_PORT || '21', 10),
    user: process.env.FTP_USER || 'anonymous',
    password: process.env.FTP_PASSWORD || '',
    secure: process.env.FTP_SECURE === 'true',
  };
};

const MAX_CONNECTIONS = 3;
const pool: Client[] = [];
const queue: ((client: Client) => void)[] = [];
let activeConnections = 0;

async function createClient(): Promise<Client> {
  const client = new Client();
  client.ftp.verbose = false;
  try {
    await client.access(getFtpConfig());
    console.log(`FTP connected. Active connections: ${activeConnections}`);
    return client;
  } catch (err) {
    console.error('FTP connection error:', err);
    throw err;
  }
}

export async function getFtpClient(): Promise<Client> {
  // 1. Try to get from pool
  while (pool.length > 0) {
    const client = pool.pop()!;
    try {
      // A simple NOOP command to check if the connection is still alive.
      await client.send('NOOP');
      return client;
    } catch (err) {
      console.warn('Stale FTP connection found, discarding.');
      client.close(); // Close the socket
      activeConnections--; // We lost a connection, so decrement
    }
  }

  // 2. Check if we can create a new one
  if (activeConnections < MAX_CONNECTIONS) {
    activeConnections++; // Reserve the slot synchronously
    try {
      return await createClient();
    } catch (err) {
      activeConnections--; // Release the slot if creation failed
      throw err;
    }
  }

  // 3. Wait for a client to be released.
  return new Promise((resolve) => {
    queue.push(resolve);
  });
}

export function releaseFtpClient(client: Client) {
  if (queue.length > 0) {
    const resolve = queue.shift();
    if (resolve) {
      resolve(client);
    }
  } else {
    pool.push(client);
  }
}

// POST /api/ftp/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const { originalname, path: tempFilePath } = req.file;
  const { destinationPath = '/' } = req.body; // Default to root

  let ftpClient;
  try {
    ftpClient = await getFtpClient();
    const remotePath = path.posix.join(destinationPath, originalname);
    await ftpClient.uploadFrom(tempFilePath, remotePath); // Utilisation du chemin du fichier temporaire
    res.status(201).json({
      message: 'File uploaded successfully.',
      filename: originalname,
      remotePath: remotePath,
    });
  } catch (err) {
    console.error('FTP upload error:', err);
    res.status(500).json({ message: 'Failed to upload file to FTP.' });
  } finally {
    // Supprimer le fichier temporaire créé par Multer
    try {
      await fs.unlink(tempFilePath);
    } catch (unlinkErr) {
      console.error(
        `[CRITICAL] Failed to delete temporary upload file: ${tempFilePath}`,
        unlinkErr,
      );
    }
    if (ftpClient) releaseFtpClient(ftpClient);
  }
});

// GET /api/ftp/list
router.get('/list', async (req, res) => {
  let ftpClient;
  try {
    ftpClient = await getFtpClient();
    const { path: ftpPath = '/' } = req.query;

    const list = await ftpClient.list(ftpPath as string);
    const filteredList = list.filter((item) => {
      // Exclure les fichiers cachés/système (commençant par .)
      if (item.name.startsWith('.')) {
        return false;
      }
      // Exclure les répertoires temporaires ou autres éléments non pertinents
      // if (item.name === 'uploads_temp' && item.type === 2) { // type 2 pour directory
      //     return false;
      // }
      return true;
    });

    res.json(
      filteredList.map((item) => ({
        name: item.name,
        type: item.type === 1 ? 'file' : 'directory',
        size: item.size,
        modifyTime: item.rawModifiedAt, // Use rawModifiedAt as per basic-ftp FileInfo
      })),
    );
  } catch (err) {
    console.error('FTP list error:', err);
    res.status(500).json({ message: 'Failed to list files from FTP.' });
  } finally {
    if (ftpClient) releaseFtpClient(ftpClient);
  }
});

// DELETE /api/ftp/delete
router.delete('/delete', async (req, res) => {
  const { path: filePath, itemType } = req.body;

  if (!filePath || !itemType) {
    return res
      .status(400)
      .json({ message: 'File path and item type are required.' });
  }

  let ftpClient;
  try {
    ftpClient = await getFtpClient();
    if (itemType === 'file') {
      await ftpClient.remove(filePath);
    } else if (itemType === 'directory') {
      await ftpClient.removeDir(filePath, true); // Supprime le dossier et son contenu récursivement
    } else {
      return res.status(400).json({ message: 'Invalid item type.' });
    }
    res.status(200).json({ message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('FTP delete error:', err);
    res.status(500).json({ message: `Failed to delete ${itemType} from FTP.` });
  } finally {
    if (ftpClient) releaseFtpClient(ftpClient);
  }
});

// GET /api/ftp/view
router.get('/view', async (req, res) => {
  let ftpClient;
  const fullPath = req.query.filePath as string;

  if (!fullPath) {
    return res
      .status(400)
      .json({ message: 'filePath query parameter is required.' });
  }

  const allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.pdf',
    '.svg',
    '.webp',
    '.bmp',
  ];
  const fileExtension = path.extname(fullPath).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(403).json({ message: 'File type not allowed.' });
  }

  // Create a temporary local file to download to
  const tempDir = path.join(os.tmpdir(), 'pharmia_ftp_downloads');
  // Ensure the filename is safe to use in a path
  const safeFilename = path.basename(fullPath);
  const tempFilePath = path.join(tempDir, safeFilename);

  try {
    console.log(
      `[FTP VIEW SPY] Request for filePath: "${fullPath}" received from page: "${req.headers.referer}"`,
    );

    let fileExists = false;
    try {
      await fs.access(tempFilePath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      ftpClient = await getFtpClient();
      console.log(
        `[FTP View Debug] Téléchargement du fichier FTP: ${fullPath} vers ${tempFilePath}`,
      );
      await fs.mkdir(tempDir, { recursive: true });
      await ftpClient.downloadTo(tempFilePath, fullPath);
      console.log(
        `[FTP View Debug] Fichier ${fullPath} téléchargé avec succès vers ${tempFilePath}`,
      );
    } else {
      console.log(`[FTP View Debug] Serving cached file: ${tempFilePath}`);
    }

    // Stream the file back to the client
    res.sendFile(tempFilePath, {}, async (err) => {
      if (err) {
        console.error(
          "[FTP View Debug] Erreur lors de l'envoi du fichier au client:",
          err,
        );
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to send file.' });
        }
        // Only clean up on error if we suspect corruption, or just leave it.
        // For now, let's leave it to avoid complexity, or maybe unlink if sending failed?
        // Safest to leave it or maybe try to unlink only on error.
      } else {
        console.log(
          `[FTP View Debug] Fichier ${tempFilePath} envoyé avec succès.`,
        );
      }
      // CACHING ENABLED: Do NOT delete the file after sending.
    });
  } catch (err) {
    console.error('FTP download/view error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to retrieve file from FTP.' });
    }
    // Ensure temp file is deleted even if download fails
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupErr) {
      // Silently ignore cleanup errors
    }
  } finally {
    if (ftpClient) {
      releaseFtpClient(ftpClient);
    }
  }
});

// POST /api/ftp/mkdir
router.post('/mkdir', async (req, res) => {
  const { path: newDirPath } = req.body;

  if (!newDirPath) {
    return res.status(400).json({ message: 'Directory path is required.' });
  }

  let ftpClient;
  try {
    ftpClient = await getFtpClient();
    await ftpClient.ensureDir(newDirPath); // Utilise ensureDir pour créer récursivement les répertoires
    res
      .status(201)
      .json({ message: `Directory '${newDirPath}' created successfully.` });
  } catch (err) {
    console.error('FTP mkdir error:', err);
    res.status(500).json({ message: 'Failed to create directory on FTP.' });
  } finally {
    if (ftpClient) releaseFtpClient(ftpClient);
  }
});

import clientPromise from './mongo.js'; // Import clientPromise

// POST /api/ftp/rename
router.post('/rename', async (req, res) => {
  const { oldPath, newPath } = req.body;

  if (!oldPath || !newPath) {
    return res
      .status(400)
      .json({ message: 'Old path and new path are required.' });
  }

  let ftpClient;
  try {
    ftpClient = await getFtpClient();
    await ftpClient.rename(oldPath, newPath);

    // Update MongoDB 'images' collection
    try {
      const client = await clientPromise;
      const db = client.db('pharmia');
      const imagesCollection = db.collection('images');

      // Construct public URLs assuming a standard mapping.
      // Adjust this logic if your FTP structure maps differently to public URLs.
      // Example: FTP path "/folder/image.jpg" -> URL "/uploads/folder/image.jpg"
      // Ensure paths don't start with multiple slashes if joining
      const cleanOldPath = oldPath.startsWith('/')
        ? oldPath.substring(1)
        : oldPath;
      const cleanNewPath = newPath.startsWith('/')
        ? newPath.substring(1)
        : newPath;

      const oldUrl = `/uploads/${cleanOldPath}`;
      const newUrl = `/uploads/${cleanNewPath}`;

      // 1. Update 'images' collection
      const updateResult = await imagesCollection.updateMany(
        { url: oldUrl },
        { $set: { url: newUrl } },
      );
      console.log(
        `Updated ${updateResult.modifiedCount} image records in DB from ${oldUrl} to ${newUrl}`,
      );

      // 2. Update 'memofiches' collection (Direct Fields)
      const memofichesCollection = db.collection('memofiches');
      await memofichesCollection.updateMany(
        { coverImageUrl: oldUrl },
        { $set: { coverImageUrl: newUrl } },
      );
      await memofichesCollection.updateMany(
        { 'media.url': oldUrl },
        { $set: { 'media.$.url': newUrl } },
      );

      // 3. Deep Content Replacement (Markdown fields)
      // Use regex to find any document containing the old URL substring
      const escapeRegExp = (string: string) =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const urlRegex = new RegExp(escapeRegExp(oldUrl), 'g'); // Global replacement

      const fichesToUpdate = await memofichesCollection
        .find({
          $or: [
            { patientSituation: { $regex: escapeRegExp(oldUrl) } },
            { pathologyOverview: { $regex: escapeRegExp(oldUrl) } },
            { 'sections.content.value': { $regex: escapeRegExp(oldUrl) } },
            { sourceText: { $regex: escapeRegExp(oldUrl) } },
          ],
        })
        .toArray();

      for (const doc of fichesToUpdate) {
        let modified = false;

        // Helper to replace in string
        const replaceInText = (text: any) => {
          if (typeof text === 'string' && text.includes(oldUrl)) {
            modified = true;
            return text.replace(urlRegex, newUrl);
          }
          return text;
        };

        // Top-level fields
        doc.patientSituation = replaceInText(doc.patientSituation);
        doc.pathologyOverview = replaceInText(doc.pathologyOverview);
        doc.sourceText = replaceInText(doc.sourceText);

        // Nested Sections
        if (doc.sections && Array.isArray(doc.sections)) {
          doc.sections = doc.sections.map((section: any) => {
            if (section.content && Array.isArray(section.content)) {
              section.content = section.content.map((contentItem: any) => {
                if (
                  contentItem.value &&
                  typeof contentItem.value === 'string'
                ) {
                  return {
                    ...contentItem,
                    value: replaceInText(contentItem.value),
                  };
                }
                return contentItem;
              });
            }
            return section;
          });
        }

        if (modified) {
          await memofichesCollection.updateOne({ _id: doc._id }, { $set: doc });
          console.log(`Deep updated content in memofiche ${doc._id}`);
        }
      }
    } catch (dbError) {
      console.error(
        'Failed to update image URL in database after FTP rename:',
        dbError,
      );
      // We choose not to fail the request here, as the file operation succeeded.
    }

    res.status(200).json({ message: 'Item renamed/moved successfully.' });
  } catch (err) {
    console.error('FTP rename error:', err);
    res.status(500).json({ message: 'Failed to rename/move item on FTP.' });
  } finally {
    if (ftpClient) releaseFtpClient(ftpClient);
  }
});

export default router;
