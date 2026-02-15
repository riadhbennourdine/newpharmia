
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const API_BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = './ftp_images';

interface FtpItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifyTime: string;
}

async function listDirectory(remotePath: string): Promise<FtpItem[]> {
  const url = `${API_BASE_URL}/api/ftp/list?path=${encodeURIComponent(remotePath)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error listing directory ${remotePath}: ${response.statusText}`);
      return [];
    }
    const data = await response.json() as FtpItem[];
    return data;
  } catch (error) {
    console.error(`Failed to fetch directory listing for ${remotePath}:`, error);
    return [];
  }
}

async function downloadFile(remotePath: string, localPath: string): Promise<void> {
  const url = `${API_BASE_URL}/api/ftp/view?filePath=${encodeURIComponent(remotePath)}`;
  console.log(`Downloading ${remotePath} to ${localPath}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error downloading file ${remotePath}: ${response.statusText}`);
      return;
    }
    // Ensure the directory exists
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    
    // Get the response body as a ReadableStream
    const body = response.body;
    if (!body) {
        console.error(`No response body for ${remotePath}`);
        return;
    }

    // Create a write stream and pipe the body to it
    const fileStream = await fs.open(localPath, 'w');
    const writable = fileStream.createWriteStream();

    // Correctly type the body to work with pipeline
    const readable = body as unknown as NodeJS.ReadableStream;

    await new Promise((resolve, reject) => {
        readable.pipe(writable);
        readable.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', resolve);
    });

  } catch (error) {
    console.error(`Failed to download or save file ${remotePath}:`, error);
  }
}

async function traverseAndDownload(remotePath: string, localPath: string) {
  console.log(`Traversing remote directory: ${remotePath}`);
  const items = await listDirectory(remotePath);

  for (const item of items) {
    const newRemotePath = path.posix.join(remotePath, item.name);
    const newLocalPath = path.join(localPath, item.name);

    if (item.type === 'directory') {
      await fs.mkdir(newLocalPath, { recursive: true });
      await traverseAndDownload(newRemotePath, newLocalPath);
    } else if (item.type === 'file') {
      await downloadFile(newRemotePath, newLocalPath);
    }
  }
}

async function main() {
  console.log('Starting image download process...');
  // Ensure the root output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await traverseAndDownload('/', OUTPUT_DIR);

  console.log('Image download process finished.');
}

main().catch(console.error);
