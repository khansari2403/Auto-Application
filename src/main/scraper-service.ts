import puppeteer, { Browser, Page } from 'puppeteer';
import { handleLoginRoadblock } from './features/automated-login';
import { logAction } from './database';

let activeBrowser: Browser | null = null;
let activePage: Page | null = null;

/**
 * VISUAL AI COOKIE BYPASS
 * Uses the Observer to take a photo and AI Mouse to click.
 */
async function handleCookieRoadblock(page: Page, userId: number, callAI: Function) {
  try {
    const isBannerVisible = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('cookie') || text.includes('accept') || text.includes('agree') || text.includes('zustimmen');
    });
    if (!isBannerVisible) return;

    await logAction(userId, 'ai_observer', '📸 Cookie banner detected. Taking a photo...', 'in_progress');
    const screenshot = await page.screenshot({ encoding: 'base64' });
    
    const prompt = `Analyze this cookie banner. Identify the (x, y) coordinates for the "Reject", "Deny", or "Essential Only" button. Return ONLY JSON: {"x": 0, "y": 0, "action": "reject"}`;
    const analysis = await callAI({ model_name: 'gpt-4o', role: 'Observer' }, prompt, `data:image/png;base64,${screenshot}`);
    
    try {
      const coords = JSON.parse(analysis.replace(/```json|```/g, '').trim());
      await logAction(userId, 'ai_mouse', `🖱️ AI Mouse clicking ${coords.action} at (${coords.x}, ${coords.y})`, 'in_progress');
      await page.mouse.click(coords.x, coords.y);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // Brute force fallback
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const reject = btns.find(b => b.textContent?.toLowerCase().includes('reject') || b.textContent?.toLowerCase().includes('ablehnen'));
        if (reject) (reject as HTMLElement).click();
      });
    }
  } catch (e) {}
}

/**
 * SCRAPING CLUSTER
 * Tries 4 different extraction styles and reports the winner.
 */
export async function getJobPageContent(url: string, userId: number, callAI: Function): Promise<{ content: string, strategyUsed: string }> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await handleCookieRoadblock(page, userId, callAI);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await page.evaluate(() => {
      const getCleanText = (el: Element | null) => el ? (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim() : '';
      
      // Strategy 1: Selectors
      const s1 = document.querySelector('.job-description, #jobDescriptionText, .description__text, .show-more-less-html__markup');
      if (s1 && s1.textContent && s1.textContent.length > 300) return { content: getCleanText(s1), strategy: 'Style A: Selectors' };
      
      // Strategy 2: Semantic
      const s2 = document.querySelector('main, article');
      if (s2 && s2.textContent && s2.textContent.length > 300) return { content: getCleanText(s2), strategy: 'Style B: Semantic' };
      
      // Strategy 3: Density
      const blocks = Array.from(document.querySelectorAll('div')).map(el => getCleanText(el));
      const t3 = blocks.sort((a, b) => b.length - a.length)[0];
      if (t3 && t3.length > 300) return { content: t3, strategy: 'Style C: Density' };

      return { content: getCleanText(document.body), strategy: 'Style D: Body Dump' };
    });

    return { content: result.content, strategyUsed: result.strategy };
  } catch (error) {
    return { content: '', strategyUsed: 'Failed' };
  } finally {
    if (browser) await browser.close();
  }
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
    if (callAI && userId) await handleCookieRoadblock(page, userId, callAI);
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(resolve => setTimeout(resolve, 5000)); 
    const links = await page.evaluate(() => {
      const selectors = ['a.job-card-container__link', 'a.base-card__full-link', 'a.jcs-JobTitle', 'h2.jobTitle a'];
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

export async function openLinkedIn(userId: number, url: string) {
  if (activeBrowser) await activeBrowser.close();
  activeBrowser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  activePage = await activeBrowser.newPage();
  await activePage.goto(url, { waitUntil: 'domcontentloaded' });
  return { success: true };
}