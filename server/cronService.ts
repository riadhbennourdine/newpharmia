import cron from 'node-cron';
import { generateKnowledgeBase } from './generateKnowledgeBase.js';
import { refreshKnowledgeBaseCache } from './geminiService.js';

export function initCronJobs() {
  console.log('Initializing cron jobs...');

  // Run at 3:00 AM every day
  // Format: Minute Hour DayOfMonth Month DayOfWeek
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Starting daily Knowledge Base generation...');
    try {
      const filePath = await generateKnowledgeBase();
      console.log(`[Cron] Knowledge Base generated at ${filePath}`);

      await refreshKnowledgeBaseCache(filePath);
    } catch (error) {
      console.error('[Cron] Error generating Knowledge Base:', error);
    }
  });

  console.log(
    'Cron jobs initialized: Knowledge Base generation scheduled for 03:00 AM daily.',
  );
}
