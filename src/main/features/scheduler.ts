import { getDatabase, runQuery } from '../database';

export function startHuntingScheduler(userId: number, startHunterSearch: Function, callAI: Function) {
  return setInterval(async () => {
    const db = getDatabase();
    const websites = db.job_websites.filter((w: any) => w.is_active === 1);
    const now = new Date();
    for (const website of websites) {
      const lastChecked = website.last_checked ? new Date(website.last_checked) : new Date(0);
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
      const frequency = website.site_type === 'career_page' ? 24 : (website.check_frequency || 4);
      if (hoursSinceLastCheck >= frequency) {
        await startHunterSearch(userId, callAI);
        await runQuery('UPDATE job_websites', { id: website.id, last_checked: now.toISOString() });
      }
    }
  }, 60000);
}