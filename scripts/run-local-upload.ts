// scripts/run-local-upload.ts

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// This script uploads files from a local directory to the migration endpoint on the live server.

// Load environment variables from .env file
dotenv.config();

// --- CONFIGURATION ---

// The local directory containing the files downloaded from FTP.
const LOCAL_SOURCE_DIR = path.resolve(process.cwd(), 'public/uploads_migration');

// The base URL of your live application.
const MIGRATION_TARGET_URL = process.env.MIGRATION_TARGET_URL || 'https://newpharmia-production.up.railway.app';

// An admin user's JWT. You must get a valid token for an admin user and place it in your .env file.
const MIGRATION_ADMIN_TOKEN = process.env.MIGRATION_ADMIN_TOKEN;

// Number of files to upload in parallel.
const CONCURRENT_UPLOADS = 5;

// --- SCRIPT ---

interface UploadTask {
  filePath: string;
  destinationPath: string;
}

async function uploadFile(task: UploadTask, token: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(task.filePath));
  form.append('destinationPath', task.destinationPath);

  try {
    process.stdout.write(`- Uploading: ${task.destinationPath} ... `);
    await axios.post(`${MIGRATION_TARGET_URL}/api/migrate/upload`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    process.stdout.write('Done\n');
  } catch (error: any) {
    process.stdout.write('Failed\n');
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`  ❌ Failed to upload ${task.destinationPath}: ${errorMessage}`);
  }
}

async function getFileTasks(dir: string, baseDir: string): Promise<UploadTask[]> {
  let tasks: UploadTask[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      tasks = tasks.concat(await getFileTasks(fullPath, baseDir));
    } else {
      tasks.push({
        filePath: fullPath,
        destinationPath: path.relative(baseDir, fullPath),
      });
    }
  }
  return tasks;
}

async function runUpload() {
  if (!MIGRATION_ADMIN_TOKEN) {
    console.error('❌ MIGRATION_ADMIN_TOKEN is not defined in your .env file.');
    console.error('Please log in as an admin, get the JWT from your browser\'s local storage, and add it to .env.');
    return;
  }

  console.log(`Starting upload from "${LOCAL_SOURCE_DIR}" to "${MIGRATION_TARGET_URL}"...`);
  
  const allTasks = await getFileTasks(LOCAL_SOURCE_DIR, LOCAL_SOURCE_DIR);
  
  if (allTasks.length === 0) {
    console.log('No files found to upload.');
    return;
  }

  console.log(`Found ${allTasks.length} files to upload. Starting in batches of ${CONCURRENT_UPLOADS}...`);

  for (let i = 0; i < allTasks.length; i += CONCURRENT_UPLOADS) {
    const chunk = allTasks.slice(i, i + CONCURRENT_UPLOADS);
    const promises = chunk.map(task => uploadFile(task, MIGRATION_ADMIN_TOKEN));
    await Promise.all(promises);
  }

  console.log('\n✅ Local upload script finished.');
  console.log('➡️ Next step: Verify a few files are accessible via their new URLs, then run the database migration script.');
}

runUpload();
