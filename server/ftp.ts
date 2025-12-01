import express from 'express';
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

const MAX_CONNECTIONS = 5;
const pool: Client[] = [];
const queue: ((client: Client) => void)[] = [];
let activeConnections = 0;

async function createClient(): Promise<Client> {
    const client = new Client();
    client.ftp.verbose = false;
    try {
        await client.access(getFtpConfig());
        activeConnections++;
        console.log(`FTP connected. Active connections: ${activeConnections}`);
        return client;
    } catch (err) {
        console.error('FTP connection error:', err);
        throw err;
    }
}

export async function getFtpClient(): Promise<Client> {
    if (pool.length > 0) {
        const client = pool.pop()!;
        try {
            // A simple NOOP command to check if the connection is still alive.
            await client.send('NOOP');
            return client;
        } catch (err) {
            console.warn('Stale FTP connection found, creating a new one.');
            activeConnections--;
            return createClient();
        }
    }

    if (activeConnections < MAX_CONNECTIONS) {
        return createClient();
    }

    // Wait for a client to be released.
    return new Promise(resolve => {
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
        res.status(201).json({ message: 'File uploaded successfully.', filename: originalname, remotePath: remotePath });
    } catch (err) {
        console.error('FTP upload error:', err);
        res.status(500).json({ message: 'Failed to upload file to FTP.' });
    } finally {
        // Supprimer le fichier temporaire créé par Multer
        await fs.unlink(tempFilePath);
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
        const filteredList = list.filter(item => {
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

        res.json(filteredList.map(item => ({
            name: item.name,
            type: item.type === 1 ? 'file' : 'directory',
            size: item.size,
            modifyTime: item.rawModifiedAt, // Use rawModifiedAt as per basic-ftp FileInfo
        })));
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
        return res.status(400).json({ message: 'File path and item type are required.' });
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

// GET /api/ftp/view/*
router.get('/view/:path(*)', async (req, res) => {
    let ftpClient;
    const filePath = req.params.path;
    if (!filePath) {
        return res.status(400).json({ message: 'File path is required.' });
    }

    // Create a temporary local file to download to
    const tempDir = path.join(__dirname, 'downloads_temp');
    // Ensure the filename is safe to use in a path
    const safeFilename = path.basename(filePath);
    const tempFilePath = path.join(tempDir, safeFilename);

    try {
        ftpClient = await getFtpClient();
        console.log(`[FTP View Debug] Téléchargement du fichier FTP: /${filePath} vers ${tempFilePath}`);
        await fs.mkdir(tempDir, { recursive: true });
        await ftpClient.downloadTo(tempFilePath, `/${filePath}`);
        console.log(`[FTP View Debug] Fichier /${filePath} téléchargé avec succès vers ${tempFilePath}`);

        // Stream the file back to the client
        res.sendFile(tempFilePath, {}, async (err) => {
            if (err) {
                console.error('[FTP View Debug] Erreur lors de l\'envoi du fichier au client:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to send file.' });
                }
            } else {
                console.log(`[FTP View Debug] Fichier ${tempFilePath} envoyé avec succès.`);
            }
            // Clean up temporary file after sending or on error
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupErr) {
                // Silently ignore cleanup errors
            }
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
        res.status(201).json({ message: `Directory '${newDirPath}' created successfully.` });
    } catch (err) {
        console.error('FTP mkdir error:', err);
        res.status(500).json({ message: 'Failed to create directory on FTP.' });
    } finally {
        if (ftpClient) releaseFtpClient(ftpClient);
    }
});

export default router;