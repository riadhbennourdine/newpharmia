import fetch from 'node-fetch';
import * as fs from 'fs'; // Use * as fs for both promises and stream methods
import path from 'path';
import archiver from 'archiver';
import { getFileStorageClient, releaseFileStorageClient } from './fileStorageService.js';
import { MakeDirectoryOptions, RmOptions } from 'fs'; // Import types for fs options

// Define the FileStorageClient interface locally to ensure type compatibility
interface FileStorageClient {
  uploadFrom(localPath: string, remotePath: string): Promise<void>;
  list(remotePath: string): Promise<any[]>;
  remove(remotePath: string): Promise<void>;
  removeDir(remotePath: string, recursive: boolean): Promise<void>;
  ensureDir(remotePath: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  downloadTo(localPath: string, remotePath: string): Promise<void>;
}

const OUTPUT_DIR = './downloaded_images';
const ZIP_FILE_PATH = './pharmia_images.zip';

interface FtpItem { // This interface seems unused after refactor, but kept for context if needed
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifyTime: string;
}

async function listDirectory(client: FileStorageClient, remotePath: string): Promise<any[]> {
    try {
        const list = await client.list(remotePath);
        return list;
    } catch (error) {
        console.error(`Failed to list directory ${remotePath}:`, error);
        return [];
    }
}

async function downloadFile(client: FileStorageClient, remotePath: string, localPath: string): Promise<void> {
    console.log(`Downloading ${remotePath} to ${localPath}`);
    try {
        await fs.promises.mkdir(path.dirname(localPath), { recursive: true } as MakeDirectoryOptions);
        await client.downloadTo(localPath, remotePath);
    } catch (error) {
        console.error(`Failed to download or save file ${remotePath}:`, error);
    }
}

async function traverseAndDownload(client: FileStorageClient, remotePath: string, localPath: string) {
    console.log(`Traversing remote directory: ${remotePath}`);
    const items = await listDirectory(client, remotePath);

    for (const item of items) {
        // Ignore hidden files/directories
        if (item.name.startsWith('.')) {
            continue;
        }

        const newRemotePath = path.posix.join(remotePath, item.name);
        const newLocalPath = path.join(localPath, item.name);

        if (item.type === 'directory') {
            await fs.promises.mkdir(newLocalPath, { recursive: true } as MakeDirectoryOptions);
            await traverseAndDownload(client, newRemotePath, newLocalPath);
        } else if (item.type === 'file') {
            await downloadFile(client, newRemotePath, newLocalPath);
        }
    }
}

export async function downloadAllImages() {
    console.log('Starting image download and zip process...');
    let fileStorageClientInstance; // Renamed from ftpClient
    try {
        // 1. Cleanup previous artifacts
        await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true } as RmOptions);
        await fs.promises.rm(ZIP_FILE_PATH, { force: true } as RmOptions);
        console.log('Cleaned up old files.');

        // 2. Ensure output directory exists
        await fs.promises.mkdir(OUTPUT_DIR, { recursive: true } as MakeDirectoryOptions);

        // 3. Connect to File Storage and download
        console.log('Getting File Storage client...');
        fileStorageClientInstance = await getFileStorageClient();
        console.log('File Storage client obtained. Starting traversal...');
        await traverseAndDownload(fileStorageClientInstance, '/', OUTPUT_DIR); // Corrected client name
        console.log('Image download process finished.');

        // 4. Zip the directory
        console.log(`Creating zip file at ${ZIP_FILE_PATH}...`);
        const output = fs.createWriteStream(ZIP_FILE_PATH);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        await new Promise<void>((resolve, reject) => {
            output.on('close', () => {
                console.log(archive.pointer() + ' total bytes');
                console.log('Archiver has been finalized and the output file descriptor has closed.');
                resolve();
            });

            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    console.warn('Archiver warning: ', err);
                } else {
                    reject(err);
                }
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(OUTPUT_DIR, false);
            archive.finalize();
        });

        console.log('Zip file created successfully.');
        return { success: true, path: ZIP_FILE_PATH };

    } catch (error) {
        console.error('An error occurred during the download and zip process:', error);
        return { success: false, error: error };
    } finally {
        if (fileStorageClientInstance) {
            console.log('Releasing File Storage client.');
            releaseFileStorageClient(fileStorageClientInstance);
        }
        // 5. Cleanup the temporary download directory
        await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true } as RmOptions); // Corrected to fs.promises.rm
        console.log('Cleaned up temporary download directory.');
    }
}