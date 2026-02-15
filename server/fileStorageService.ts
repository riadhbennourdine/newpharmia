import express from 'express';
import os from 'os';
import multer from 'multer';
import path, { dirname } from 'path';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const upload = multer({ dest: 'uploads_temp/' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCAL_STORAGE_BASE_DIR = path.join(process.cwd(), 'uploads');

async function ensureLocalStorageDir() {
    await fsPromises.mkdir(LOCAL_STORAGE_BASE_DIR, { recursive: true });
}

interface FileStorageClient {
    uploadFrom(localPath: string, remotePath: string): Promise<void>;
    list(remotePath: string): Promise<any[]>;
    remove(remotePath: string): Promise<void>;
    removeDir(remotePath: string, recursive: boolean): Promise<void>;
    ensureDir(remotePath: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    downloadTo(localPath: string, remotePath: string): Promise<void>;
}

const localFileStorageClient: FileStorageClient = {
    async uploadFrom(localFilePath: string, remoteFilePath: string): Promise<void> {
        await ensureLocalStorageDir();
        const destinationPath = path.join(LOCAL_STORAGE_BASE_DIR, remoteFilePath);
        const destinationDir = path.dirname(destinationPath);
        await fsPromises.mkdir(destinationDir, { recursive: true });
        await fsPromises.copyFile(localFilePath, destinationPath);
        console.log(`LocalFS: Uploaded ${localFilePath} to ${destinationPath}`);
    },

    async list(remoteDirPath: string): Promise<any[]> {
        await ensureLocalStorageDir();
        const targetPath = path.join(LOCAL_STORAGE_BASE_DIR, remoteDirPath);
        try {
            const dirents = await fsPromises.readdir(targetPath, { withFileTypes: true });
            const items = await Promise.all(dirents.map(async (dirent) => {
                const fullPath = path.join(targetPath, dirent.name);
                let stats;
                try {
                    stats = await fsPromises.stat(fullPath);
                } catch (statErr) {
                    return null;
                }

                return {
                    name: dirent.name,
                    type: dirent.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    rawModifiedAt: stats.mtime.toISOString(),
                };
            }));
            return items.filter(item => item !== null);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    },

    async remove(remotePath: string): Promise<void> {
        await ensureLocalStorageDir();
        const targetPath = path.join(LOCAL_STORAGE_BASE_DIR, remotePath);
        try {
            const stats = await fsPromises.stat(targetPath);
            if (stats.isDirectory()) {
                await fsPromises.rmdir(targetPath);
            } else {
                await fsPromises.unlink(targetPath);
            }
            console.log(`LocalFS: Removed ${targetPath}`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.warn(`LocalFS: Attempted to remove non-existent item: ${targetPath}`);
                return;
            }
            throw error;
        }
    },

    async removeDir(remoteDirPath: string, recursive: boolean = false): Promise<void> {
        await ensureLocalStorageDir();
        const targetPath = path.join(LOCAL_STORAGE_BASE_DIR, remoteDirPath);
        try {
            await fsPromises.rm(targetPath, { recursive: recursive, force: true });
            console.log(`LocalFS: Removed directory ${targetPath} (recursive: ${recursive})`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.warn(`LocalFS: Attempted to remove non-existent directory: ${targetPath}`);
                return;
            }
            throw error;
        }
    },

    async ensureDir(remoteDirPath: string): Promise<void> {
        await ensureLocalStorageDir();
        const targetPath = path.join(LOCAL_STORAGE_BASE_DIR, remoteDirPath);
        await fsPromises.mkdir(targetPath, { recursive: true });
        console.log(`LocalFS: Ensured directory ${targetPath}`);
    },

    async rename(oldRemotePath: string, newRemotePath: string): Promise<void> {
        await ensureLocalStorageDir();
        const oldFullPath = path.join(LOCAL_STORAGE_BASE_DIR, oldRemotePath);
        const newFullPath = path.join(LOCAL_STORAGE_BASE_DIR, newRemotePath);
        const newParentDir = path.dirname(newFullPath);
        await fsPromises.mkdir(newParentDir, { recursive: true });
        await fsPromises.rename(oldFullPath, newFullPath);
        console.log(`LocalFS: Renamed ${oldFullPath} to ${newFullPath}`);
    },

    async downloadTo(localFilePath: string, remoteFilePath: string): Promise<void> {
        await ensureLocalStorageDir();
        const sourcePath = path.join(LOCAL_STORAGE_BASE_DIR, remoteFilePath);
        try {
            await fsPromises.copyFile(sourcePath, localFilePath);
            console.log(`LocalFS: Downloaded ${sourcePath} to ${localFilePath}`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`LocalFS: File not found for download: ${sourcePath}`);
            }
            throw error;
        }
    }
};

export function getFileStorageClient(): FileStorageClient {
    console.log('LocalFS: Providing local file system client.');
    return localFileStorageClient;
}

export function releaseFileStorageClient(client: FileStorageClient): void {
    console.log('LocalFS: Releasing local file system client (no-op).');
}

router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, path: tempFilePath } = req.file;
    const { destinationPath = '/' } = req.body;

    try {
        await localFileStorageClient.uploadFrom(tempFilePath, path.posix.join(destinationPath, originalname));
        res.status(201).json({
            message: 'File uploaded successfully.',
            filename: originalname,
            remotePath: path.posix.join(destinationPath, originalname),
        });
    } catch (err) {
        console.error('File storage upload error:', err);
        res.status(500).json({ message: 'Failed to upload file.' });
    } finally {
        try {
            await fsPromises.unlink(tempFilePath);
        } catch (unlinkErr) {
            console.error(
                `[CRITICAL] Failed to delete temporary upload file: ${tempFilePath}`,
                unlinkErr,
            );
        }
    }
});

router.get('/list', async (req, res) => {
    try {
        const { path: dirPath = '/' } = req.query;
        const list = await localFileStorageClient.list(dirPath as string);
        const filteredList = list.filter((item) => !item.name.startsWith('.'));
        res.json(filteredList.map((item) => ({
            name: item.name,
            type: item.type,
            size: item.size,
            modifyTime: item.rawModifiedAt,
        })));
    } catch (err) {
        console.error('File storage list error:', err);
        res.status(500).json({ message: 'Failed to list files.' });
    }
});

router.delete('/delete', async (req, res) => {
    const { path: filePath, itemType } = req.body;

    if (!filePath || !itemType) {
        return res
            .status(400)
            .json({ message: 'File path and item type are required.' });
    }

    try {
        if (itemType === 'file') {
            await localFileStorageClient.remove(filePath);
        } else if (itemType === 'directory') {
            await localFileStorageClient.removeDir(filePath, true);
        } else {
            return res.status(400).json({ message: 'Invalid item type.' });
        }
        res.status(200).json({ message: 'Item deleted successfully.' });
    } catch (err) {
        console.error('File storage delete error:', err);
        res.status(500).json({ message: `Failed to delete ${itemType}.` });
    }
});

router.get('/view', async (req, res) => {
    const fullPath = req.query.filePath as string;

    if (!fullPath) {
        return res
            .status(400)
            .json({ message: 'filePath query parameter is required.' });
    }

    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.svg', '.webp', '.bmp',
    ];
    const fileExtension = path.extname(fullPath).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        return res.status(403).json({ message: 'File type not allowed.' });
    }

    const actualLocalFilePath = path.join(LOCAL_STORAGE_BASE_DIR, fullPath);

    try {
        console.log(`[LOCAL STORAGE View SPY] Request for filePath: "${fullPath}"`);
        console.log(`[LOCAL STORAGE View Debug] Serving local file: ${actualLocalFilePath}`);

        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());


        return res.sendFile(actualLocalFilePath, {}, async (err) => {
            if (err) {
                console.error(
                    "[LOCAL STORAGE View Debug] Erreur lors de l'envoi du fichier local au client:",
                    err,
                );
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Failed to send local file.' });
                }
            } else {
                console.log(
                    `[LOCAL STORAGE View Debug] Fichier local ${actualLocalFilePath} envoyé avec succès.`,
                );
            }
        });

    } catch (err) {
        console.error('Local storage download/view error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to retrieve file.' });
        }
    }
});

router.post('/mkdir', async (req, res) => {
    const { path: newDirPath } = req.body;

    if (!newDirPath) {
        return res.status(400).json({ message: 'Directory path is required.' });
    }

    try {
        await localFileStorageClient.ensureDir(newDirPath);
        res
            .status(201)
            .json({ message: `Directory '${newDirPath}' created successfully.` });
    } catch (err) {
        console.error('File storage mkdir error:', err);
        res.status(500).json({ message: 'Failed to create directory.' });
    }
});

import clientPromise from './mongo.js';

router.post('/rename', async (req, res) => {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath) {
        return res
            .status(400)
            .json({ message: 'Old path and new path are required.' });
    }

    try {
        await localFileStorageClient.rename(oldPath, newPath);

        try {
            const mongoClient = await clientPromise;
            const db = mongoClient.db('pharmia');
            const imagesCollection = db.collection('images');

            const cleanOldPath = oldPath.startsWith('/')
                ? oldPath.substring(1)
                : oldPath;
            const cleanNewPath = newPath.startsWith('/')
                ? newPath.substring(1)
                : newPath;

            const oldUrl = `/uploads/${cleanOldPath}`;
            const newUrl = `/uploads/${cleanNewPath}`;

            const updateResult = await imagesCollection.updateMany(
                { url: oldUrl },
                { $set: { url: newUrl } },
            );
            console.log(
                `Updated ${updateResult.modifiedCount} image records in DB from ${oldUrl} to ${newUrl}`,
            );

            const memofichesCollection = db.collection('memofiches');
            await memofichesCollection.updateMany(
                { coverImageUrl: oldUrl },
                { $set: { coverImageUrl: newUrl } },
            );
            await memofichesCollection.updateMany(
                { 'media.url': oldUrl },
                { $set: { 'media.$.url': newUrl } },
            );

            const escapeRegExp = (string: string) =>
                string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const urlRegex = new RegExp(escapeRegExp(oldUrl), 'g');

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
                const replaceInText = (text: any) => {
                    if (typeof text === 'string' && text.includes(oldUrl)) {
                        modified = true;
                        return text.replace(urlRegex, newUrl);
                    }
                    return text;
                };

                doc.patientSituation = replaceInText(doc.patientSituation);
                doc.pathologyOverview = replaceInText(doc.pathologyOverview);
                doc.sourceText = replaceInText(doc.sourceText);

                if (doc.sections && Array.isArray(doc.sections)) {
                    doc.sections = doc.sections.map((section: any) => {
                        if (section.content && Array.isArray(section.content)) {
                            section.content = section.content.map((contentItem: any) => {
                                if (contentItem.value && typeof contentItem.value === 'string') {
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
                'Failed to update image URL in database after file storage rename:',
                dbError,
            );
        }

        res.status(200).json({ message: 'Item renamed/moved successfully.' });
    } catch (err) {
        console.error('File storage rename error:', err);
        res.status(500).json({ message: 'Failed to rename/move item.' });
    }
});

export default router;