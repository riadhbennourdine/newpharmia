import express from 'express';
import { Client } from 'basic-ftp';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises'; // Use fs/promises for async file operations
import { Readable } from 'stream'; // Import Readable for converting buffer to stream

const router = express.Router();
const upload = multer({ dest: 'uploads_temp/' }); // Temporary storage for multer

const getFtpConfig = () => {
    return {
        host: process.env.FTP_HOST || 'localhost',
        port: parseInt(process.env.FTP_PORT || '21', 10),
        user: process.env.FTP_USER || 'anonymous',
        password: process.env.FTP_PASSWORD || '',
        secure: process.env.FTP_SECURE === 'true',
        // Add other necessary FTP options
    };
};

export const connectAndReturnFtpClient = async () => {
    const client = new Client();
    client.ftp.verbose = false; // Set to true for debugging FTP commands
    const config = getFtpConfig();
    try {
        await client.access(config);
        console.log('FTP connected successfully.');
        return client;
    } catch (err) {
        console.error('FTP connection error:', err);
        throw err;
    }
};

// POST /api/ftp/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, path: tempFilePath } = req.file;
    const { destinationPath = '/' } = req.body; // Default to root

    let ftpClient;
    try {
        ftpClient = await connectAndReturnFtpClient();
        const remotePath = path.posix.join(destinationPath, originalname);
        await ftpClient.uploadFrom(tempFilePath, remotePath); // Utilisation du chemin du fichier temporaire
        res.status(201).json({ message: 'File uploaded successfully.', filename: originalname, remotePath: remotePath });
    } catch (err) {
        console.error('FTP upload error:', err);
        res.status(500).json({ message: 'Failed to upload file to FTP.' });
    } finally {
        // Supprimer le fichier temporaire créé par Multer
        await fs.unlink(tempFilePath);
        if (ftpClient) ftpClient.close();
    }
});

// GET /api/ftp/list
router.get('/list', async (req, res) => {
    let ftpClient;
    try {
        ftpClient = await connectAndReturnFtpClient();
        const { path: ftpPath = '/' } = req.query;

        const list = await ftpClient.list(ftpPath as string);
        res.json(list.map(item => ({
            name: item.name,
            type: item.type === 1 ? 'file' : 'directory',
            size: item.size,
            modifyTime: item.rawModifiedAt, // Use rawModifiedAt as per basic-ftp FileInfo
        })));
    } catch (err) {
        console.error('FTP list error:', err);
        res.status(500).json({ message: 'Failed to list files from FTP.' });
    } finally {
        if (ftpClient) ftpClient.close();
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
        ftpClient = await connectAndReturnFtpClient();
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
        if (ftpClient) ftpClient.close();
    }
});

// GET /api/ftp/view/:filename
router.get('/view/:filename', async (req, res) => {
    let ftpClient;
    const { filename } = req.params;
    const { path: ftpPath = '/' } = req.query; // Allow specifying a sub-path if needed

    const fullPath = path.posix.join(ftpPath as string, filename); // Use path.posix for FTP paths

    // Create a temporary local file to download to
    const tempDir = 'downloads_temp';
    const tempFilePath = path.join(tempDir, filename);

    try {
        ftpClient = await connectAndReturnFtpClient();
        await fs.mkdir(tempDir, { recursive: true });
        await ftpClient.downloadTo(tempFilePath, fullPath);

        // Stream the file back to the client
        res.sendFile(tempFilePath, {}, async (err) => {
            if (err) {
                console.error('Error sending file to client:', err);
                res.status(500).json({ message: 'Failed to send file.' });
            }
            // Clean up temporary file after sending
            await fs.unlink(tempFilePath);
        });
    } catch (err) {
        console.error('FTP download/view error:', err);
        res.status(500).json({ message: 'Failed to retrieve file from FTP.' });
    } finally {
        if (ftpClient) ftpClient.close(); // Close connection
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
        ftpClient = await connectAndReturnFtpClient();
        await ftpClient.ensureDir(newDirPath); // Utilise ensureDir pour créer récursivement les répertoires
        res.status(201).json({ message: `Directory '${newDirPath}' created successfully.` });
    } catch (err) {
        console.error('FTP mkdir error:', err);
        res.status(500).json({ message: 'Failed to create directory on FTP.' });
    } finally {
        if (ftpClient) ftpClient.close();
    }
});

export default router;