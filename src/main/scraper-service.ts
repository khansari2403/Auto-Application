/**
 * Scraper Service (The Eyes) - Phase 3.6 Reinforced
 * Handles localized search, deep page reading, and automated login.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { handleLoginRoadblock } from './features/automated-login';
import { logAction } from './database';
import fs from 'fs';

let activeBrowser: Browser | null = null;
let activePage: Page | null = null;

/**
 * Hunter: Scrapes job URLs with automated login and CAPTCHA detection.
 */
export async function scrapeJobs(baseUrl: string, query: string, location: string, credentials?: any, userId?: number, callAI?: Function): Promise<string[]> {
  console.log(`Scraper: Starting localized search for "${query}" in "${location}"`);
  let browser: Browser | null = null;
  const jobUrls: string[] = [];

  try {
    browser = await puppeteer.launch({
      headless: false, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const startUrl = baseUrl.includes('linkedin.com') ? 'https://www.linkedin.com/jobs/' : 'https://de.indeed.com/';
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1. CHECK FOR LOGIN OR CAPTCHA
    const roadblock = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes('sign in') || !!document.querySelector('#username')) return 'login';
      if (text.includes('not a robot') || text.includes('captcha')) return 'captcha';
      return null;
    });

    if (roadblock === 'login' && userId) {
      await handleLoginRoadblock(page, credentials, userId);
      await page.goto(startUrl, { waitUntil: 'networkidle2' });
    } else if (roadblock === 'captcha' && userId) {
      await logAction(userId, 'ai_observer', '🤖 CAPTCHA detected! Please solve it in the browser window...', 'waiting');
      await page.waitForSelector('input[name="q"], #keywords', { timeout: 300000 });
    }

    // 2. OBSERVER & AI MOUSE: Solve Search Fields
    if (callAI) {
      console.log('Scraper: Observer is analyzing the search layout...');
      const screenshot = await page.screenshot({ encoding: 'base64' });
      const observerPrompt = `Analyze this job search page. Identify coordinates (x, y) for: 1. Keywords field, 2. Location field, 3. Search button. Return ONLY JSON: {"keywords": {"x": 0, "y": 0}, "location": {"x": 0, "y": 0}, "search": {"x": 0, "y": 0}}`;
      const analysis = await callAI({ model_name: 'gpt-4o', role: 'Observer' }, observerPrompt, `data:image/png;base64,${screenshot}`);
      
      try {
        const coords = JSON.parse(analysis.replace(/```json|```/g, '').trim());
        await page.mouse.click(coords.keywords.x, coords.keywords.y);
        await page.keyboard.type(query, { delay: 100 });
        await page.mouse.click(coords.location.x, coords.location.y);
        await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(location, { delay: 100 });
        await page.mouse.click(coords.search.x, coords.search.y);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      } catch (e) {
        const cleanQuery = query.replace(/"/g, '');
        const searchUrl = baseUrl.includes('linkedin.com') 
          ? `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(cleanQuery)}&location=${encodeURIComponent(location)}`
          : `https://de.indeed.com/jobs?q=${encodeURIComponent(cleanQuery)}&l=${encodeURIComponent(location)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      }
    }

    // 3. EXTRACT LINKS
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
  } catch (error) {
    console.error('Scraper Error:', error);
  } finally {
    if (browser) await browser.close();
  }
  return jobUrls;
}

/**
 * Deep Reader: Captures raw page text and saves to a local file (Draft-to-File).
 */
export async function getJobPageContent(url: string, useAlternativeMethod: boolean = false, userId?: number): Promise<{ content: string }> {
  console.log(`Deep Reader: Opening ${url}...`);
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // CHECK FOR CAPTCHA
    const isCaptcha = await page.evaluate(() => document.body.innerText.toLowerCase().includes('not a robot') || document.body.innerText.toLowerCase().includes('captcha'));
    if (isCaptcha && userId) {
      await logAction(userId, 'ai_observer', '🤖 CAPTCHA blocked the reader! Please solve it in the browser window...', 'waiting');
      await page.waitForSelector('.job-description, #jobDescriptionText, .description__text', { timeout: 300000 });
    }

    // REINFORCED: Wait for the actual job description to render
    const selectors = ['.job-description', '#jobDescriptionText', '.description__text', '.show-more-less-html__markup', 'main'];
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), selector);
        break;
      } catch (e) {}
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    const content = await page.evaluate(() => document.body.innerText);

    // Save raw content to a local file for the AI to read
    const draftPath = `C:/Users/Sideadde/Auto-Application/Drafts/last_capture.txt`;
    try {
      fs.writeFileSync(draftPath, content);
    } catch (e) {}

    return { content: content || '' };
  } catch (error) {
    console.error(`Deep Reader Error:`, error);
    return { content: '' };
  } finally {
    if (browser) await browser.close();
  }
}

export async function openLinkedIn(userId: number, url: string) {
  if (activeBrowser) await activeBrowser.close();
  activeBrowser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  activePage = await activeBrowser.newPage();
  await activePage.goto(url, { waitUntil: 'domcontentloaded' });
  return { success: true };
}