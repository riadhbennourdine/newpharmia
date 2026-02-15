import 'dotenv/config';
import { Client } from 'basic-ftp';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { program } from 'commander';

program
  .option('--host <host>', 'FTP host')
  .option('--port <port>', 'FTP port', '21')
  .option('--user <user>', 'FTP user')
  .option('--password <password>', 'FTP password')
  .parse(process.argv);

const options = program.opts();

if (!options.host || !options.user || !options.password) {
  console.error('Error: --host, --user, and --password are required.');
  process.exit(1);
}

const ftpConfig = {
  host: options.host,
  port: parseInt(options.port, 10),
  user: options.user,
  password: options.password,
  secure: process.env.FTP_SECURE === 'true', // Keep this from env for now
};

const OUTPUT_DIR = './ftp_images_download';
const ZIP_FILE_PATH = './pharmia_images.zip';

async function traverseAndDownload(client: Client, remotePath: string, localPath: string) {
    console.log(`Traversing remote directory: ${remotePath}`);
    const items = await client.list(remotePath);

    for (const item of items) {
        if (item.name.startsWith('.')) continue;

        const newRemotePath = path.posix.join(remotePath, item.name);
        const newLocalPath = path.join(localPath, item.name);

        if (item.isDirectory) {
            await fs.mkdir(newLocalPath, { recursive: true });
            await traverseAndDownload(client, newRemotePath, newLocalPath);
        } else if (item.isFile) {
            console.log(`Downloading ${newRemotePath} to ${newLocalPath}`);
            try {
                await fs.mkdir(path.dirname(newLocalPath), { recursive: true });
                await client.downloadTo(newLocalPath, newRemotePath);
            } catch (error) {
                console.error(`Failed to download or save file ${newRemotePath}:`, error);
            }
        }
    }
}

async function main() {
    console.log('Starting standalone image download and zip process...');
    const client = new Client();
    try {
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        await fs.rm(ZIP_FILE_PATH, { force: true });
        console.log('Cleaned up old files.');

        await fs.mkdir(OUTPUT_DIR, { recursive: true });

        console.log(`Connecting to FTP host ${ftpConfig.host}...`);
        await client.access(ftpConfig);
        console.log('FTP client connected. Starting traversal...');
        
        await traverseAndDownload(client, '/', OUTPUT_DIR);
        console.log('Image download process finished.');

        console.log(`Creating zip file at ${ZIP_FILE_PATH}...`);
        const output = fs.createWriteStream(ZIP_FILE_PATH);
        const archive = archiver('zip', { zlib: { level: 9 } });

        const zipPromise = new Promise<void>((resolve, reject) => {
            output.on('close', () => {
                console.log(archive.pointer() + ' total bytes written.');
                console.log('Zip file has been finalized.');
                resolve();
            });
            archive.on('error', reject);
        });

        archive.pipe(output);
        archive.directory(OUTPUT_DIR, false);
        await archive.finalize();
        await zipPromise;
        
        console.log('Zip file created successfully.');

    } catch (error) {
        console.error('An error occurred during the download and zip process:', error);
    } finally {
        if (!client.closed) {
            console.log('Closing FTP client.');
            client.close();
        }
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        console.log('Cleaned up temporary download directory.');
        console.log(`\n✅ Success! All images have been downloaded and are available in ${ZIP_FILE_PATH}`);
    }
}

main();