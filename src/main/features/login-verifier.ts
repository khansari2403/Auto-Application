import puppeteer from 'puppeteer';
import { getDatabase, runQuery, logAction } from '../database';
import { handleLoginRoadblock } from './automated-login';

export async function verifyWebsiteLogin(websiteId: number, userId: number) {
  const db = getDatabase();
  const website = db.job_websites.find((w: any) => w.id === websiteId);
  if (!website || !website.email || !website.password) return;

  await logAction(userId, 'ai_hunter', `🧪 Testing login for ${website.website_name}...`, 'in_progress');
  await runQuery('UPDATE job_websites', { id: websiteId, login_status: 'verifying' });

  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'] });
    const page = await browser.newPage();
    await page.goto(website.website_url, { waitUntil: 'networkidle2' });

    const result = await handleLoginRoadblock(page, { email: website.email, password: website.password }, userId);
    await runQuery('UPDATE job_websites', { id: websiteId, login_status: result.success ? 'verified' : 'failed' });
  } catch (error) {
    await runQuery('UPDATE job_websites', { id: websiteId, login_status: 'error' });
  } finally {
    if (browser) await browser.close();
  }
}