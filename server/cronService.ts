import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const FTP_DOWNLOAD_CACHE_DIR = path.join(os.tmpdir(), 'pharmia_ftp_downloads');
const MAX_AGE_HOURS = 24; // Max age of a cached file in hours

/**
 * Deletes files from a directory that are older than a specified maximum age.
 * @param directory The directory to clean up.
 * @param maxAgeInHours The maximum age of a file in hours before it's deleted.
 */
async function cleanupDirectory(directory: string, maxAgeInHours: number) {
  console.log(`[CRON] Starting cleanup of ${directory}...`);
  try {
    // Ensure directory exists
    await fs.access(directory);
  } catch (error) {
    // If directory doesn't exist, there's nothing to clean up.
    console.log(
      `[CRON] Cleanup directory ${directory} does not exist. Nothing to do.`,
    );
    return;
  }

  try {
    const files = await fs.readdir(directory);
    const now = Date.now();
    const maxAgeInMs = maxAgeInHours * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      try {
        const stats = await fs.stat(filePath);
        const fileAgeInMs = now - stats.mtime.getTime();

        if (fileAgeInMs > maxAgeInMs) {
          await fs.unlink(filePath);
          console.log(`[CRON] Deleted old cached file: ${filePath}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`[CRON] Error processing file ${filePath}:`, err);
      }
    }
    console.log(
      `[CRON] Cleanup finished. Deleted ${deletedCount} files from ${directory}.`,
    );
  } catch (err) {
    console.error(
      `[CRON] Failed to read directory ${directory} for cleanup:`,
      err,
    );
  }
}

/**
 * Schedules a cron job to clean up the FTP download cache directory.
 * The job runs once every day at midnight.
 */
export function initCronJobs() {
  // Runs every day at 00:00 (midnight)
  cron.schedule(
    '0 0 * * *',
    () => {
      console.log('[CRON] Running scheduled FTP download cache cleanup...');
      cleanupDirectory(FTP_DOWNLOAD_CACHE_DIR, MAX_AGE_HOURS);
    },
    {
      timezone: 'UTC',
    },
  );

  console.log(
    '[CRON] FTP download cache cleanup job scheduled to run daily at midnight (UTC).',
  );
}
