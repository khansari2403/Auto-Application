import { getDatabase, runQuery } from '../database';
import * as SecretaryService from './secretary-service';

/**
 * MAIN SCHEDULER
 * Runs every 60 seconds to check for scheduled tasks.
 */
export function startHuntingScheduler(userId: number, startHunterSearch: Function, callAI: Function) {
  return setInterval(async () => {
    const db = getDatabase();
    
    // 1. Check global setting for Job Hunting
    // Only proceed if the toggle in Settings is set to ON (1)
    const settings = db.settings[0];
    if (settings && settings.job_hunting_active === 1) {
      const websites = db.job_websites.filter((w: any) => w.is_active === 1);
      const now = new Date();
      
      for (const website of websites) {
        const lastChecked = website.last_checked ? new Date(website.last_checked) : new Date(0);
        const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
        
        // Career pages check every 24h, others use custom frequency (default 4h)
        const frequency = website.site_type === 'career_page' ? 24 : (website.check_frequency || 4);
        
        if (hoursSinceLastCheck >= frequency) {
          console.log(`Scheduler: Checking ${website.website_name}...`);
          await startHunterSearch(userId, callAI);
          await runQuery('UPDATE job_websites', { id: website.id, last_checked: now.toISOString() });
        }
      }
    } else {
      console.log('Scheduler: Job hunting is currently turned OFF.');
    }

    // 2. Always run Secretary monitoring for confirmations
    // This runs independently of the job hunting toggle
    try {
      await SecretaryService.monitorConfirmations(userId);
    } catch (e) {
      console.error('Scheduler: Secretary monitoring failed', e);
    }

  }, 60000); // Check every minute
}