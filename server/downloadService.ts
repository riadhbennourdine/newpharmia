
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { getFtpClient, releaseFtpClient } from './ftp.js'; // Assuming ftp service can be used directly

const OUTPUT_DIR = './downloaded_images';
const ZIP_FILE_PATH = './pharmia_images.zip';

interface FtpItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifyTime: string;
}

async function listDirectory(client: any, remotePath: string): Promise<any[]> {
    try {
        const list = await client.list(remotePath);
        return list;
    } catch (error) {
        console.error(`Failed to list FTP directory ${remotePath}:`, error);
        return [];
    }
}

async function downloadFile(client: any, remotePath: string, localPath: string): Promise<void> {
    console.log(`Downloading ${remotePath} to ${localPath}`);
    try {
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await client.downloadTo(localPath, remotePath);
    } catch (error) {
        console.error(`Failed to download or save file ${remotePath}:`, error);
    }
}

async function traverseAndDownload(client: any, remotePath: string, localPath: string) {
    console.log(`Traversing remote directory: ${remotePath}`);
    const items = await listDirectory(client, remotePath);

    for (const item of items) {
        // Ignore hidden files/directories
        if (item.name.startsWith('.')) {
            continue;
        }

        const newRemotePath = path.posix.join(remotePath, item.name);
        const newLocalPath = path.join(localPath, item.name);

        if (item.isDirectory) {
            await fs.mkdir(newLocalPath, { recursive: true });
            await traverseAndDownload(client, newRemotePath, newLocalPath);
        } else if (item.isFile) {
            await downloadFile(client, newRemotePath, newLocalPath);
        }
    }
}

export async function downloadAllImages() {
    console.log('Starting image download and zip process...');
    let ftpClient;
    try {
        // 1. Cleanup previous artifacts
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        await fs.rm(ZIP_FILE_PATH, { force: true });
        console.log('Cleaned up old files.');

        // 2. Ensure output directory exists
        await fs.mkdir(OUTPUT_DIR, { recursive: true });

        // 3. Connect to FTP and download
        console.log('Getting FTP client...');
        ftpClient = await getFtpClient();
        console.log('FTP client obtained. Starting traversal...');
        await traverseAndDownload(ftpClient, '/', OUTPUT_DIR);
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
        if (ftpClient) {
            console.log('Releasing FTP client.');
            releaseFtpClient(ftpClient);
        }
        // 5. Cleanup the temporary download directory
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        console.log('Cleaned up temporary download directory.');
    }
}
