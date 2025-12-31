import puppeteer, { Browser, Page } from 'puppeteer';
import { handleLoginRoadblock } from './features/automated-login';
import { logAction } from './database';

let activeBrowser: Browser | null = null;
let activePage: Page | null = null;

async function handleCookieBanner(page: Page) {
  try {
    await page.evaluate(() => {
      const rejectKeywords = ['reject', 'deny', 'refuse', 'decline', 'only necessary', 'essential only', 'ablehnen', 'nur essenzielle'];
      const acceptKeywords = ['accept', 'agree', 'allow', 'akzeptieren', 'erlauben', 'zustimmen'];
      const buttons = Array.from(document.querySelectorAll('button, a, span, div'));
      
      const rejectButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase().trim() || '';
        return rejectKeywords.some(k => text.includes(k)) && text.length < 30;
      }) as HTMLElement;
      
      if (rejectButton) { rejectButton.click(); return; }
      
      const acceptButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase().trim() || '';
        return acceptKeywords.some(k => text.includes(k)) && text.length < 30;
      }) as HTMLElement;
      
      if (acceptButton) { acceptButton.click(); }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {}
}

export async function scrapeJobs(baseUrl: string, query: string, location: string, credentials?: any, userId?: number, callAI?: Function): Promise<string[]> {
  let browser: Browser | null = null;
  const jobUrls: string[] = [];
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    const startUrl = baseUrl.includes('linkedin.com') ? 'https://www.linkedin.com/jobs/' : 'https://de.indeed.com/';
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await handleCookieBanner(page);
    const roadblock = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes('sign in') || !!document.querySelector('#username')) return 'login';
      return null;
    });
    if (roadblock === 'login' && userId) {
      await handleLoginRoadblock(page, credentials, userId);
      await page.goto(startUrl, { waitUntil: 'networkidle2' });
    }
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(resolve => setTimeout(resolve, 5000)); 
    const links = await page.evaluate(() => {
      const selectors = ['a.job-card-container__link', 'a.job-card-list__title', 'a.base-card__full-link', 'a.jcs-JobTitle', 'h2.jobTitle a'];
      const foundLinks: string[] = [];
      selectors.forEach(s => document.querySelectorAll(s).forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.startsWith('http') && !foundLinks.includes(href)) foundLinks.push(href);
      }));
      return foundLinks.slice(0, 15);
    });
    jobUrls.push(...links);
  } catch (error) { console.error('Scraper Error:', error); } finally { if (browser) await browser.close(); }
  return jobUrls;
}

export async function getJobPageContent(url: string, useAlternativeMethod: boolean = false, userId?: number): Promise<{ content: string }> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await handleCookieBanner(page);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const content = await page.evaluate(() => document.body.innerText);
    return { content: content || '' };
  } catch (error) { console.error(`Deep Reader Error:`, error); return { content: '' }; } finally { if (browser) await browser.close(); }
}

export async function openLinkedIn(userId: number, url: string) {
  if (activeBrowser) await activeBrowser.close();
  activeBrowser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  activePage = await activeBrowser.newPage();
  await activePage.goto(url, { waitUntil: 'domcontentloaded' });
  return { success: true };
}