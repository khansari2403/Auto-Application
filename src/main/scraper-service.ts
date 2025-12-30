/**
 * Scraper Service (The Eyes)
 * Handles localized search and deep page reading with anti-bot stealth.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

let activeBrowser: Browser | null = null;
let activePage: Page | null = null;

/**
 * Hunter: Scrapes job URLs with strict localization and stealth.
 */
export async function scrapeJobs(baseUrl: string, query: string, location: string): Promise<string[]> {
  console.log(`Scraper: Starting localized search for "${query}" in "${location}"`);
  let browser: Browser | null = null;
  const jobUrls: string[] = [];

  try {
    browser = await puppeteer.launch({
      headless: false, // Visible to bypass bot detection
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    let searchUrl = '';
    const cleanQuery = query.replace(/"/g, '');
    const cleanLocation = location || 'Germany';

    if (baseUrl.includes('linkedin.com')) {
      searchUrl = `https://de.linkedin.com/jobs/search?keywords=${encodeURIComponent(cleanQuery)}&location=${encodeURIComponent(cleanLocation)}`;
    } else if (baseUrl.includes('indeed.com')) {
      searchUrl = `https://de.indeed.com/jobs?q=${encodeURIComponent(cleanQuery)}&l=${encodeURIComponent(cleanLocation)}`;
    } else {
      searchUrl = `${baseUrl}/search?q=${encodeURIComponent(cleanQuery)}&l=${encodeURIComponent(cleanLocation)}`;
    }

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Human-like behavior: Scroll to load lazy job cards
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(resolve => setTimeout(resolve, 5000)); 

    const links = await page.evaluate(() => {
      const selectors = [
        'a.base-card__full-link', 
        'a.base-search-card__heading-link',
        'a[data-tracking-control-name*="job-result"]',
        'a.jcs-JobTitle',
        'h2.jobTitle a'
      ];
      
      const foundLinks: string[] = [];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const href = (el as HTMLAnchorElement).href;
          if (href && href.startsWith('http') && !foundLinks.includes(href)) {
            foundLinks.push(href);
          }
        });
      });
      return foundLinks.slice(0, 15);
    });

    jobUrls.push(...links);
    console.log(`Scraper: Found ${links.length} potential jobs.`);

  } catch (error) {
    console.error('Scraper Error:', error);
  } finally {
    if (browser) await browser.close();
  }

  return jobUrls;
}

/**
 * Deep Reader: Captures raw page text for the "Draft-First" logic.
 */
export async function getJobPageContent(url: string, useAlternativeMethod: boolean = false): Promise<{ content: string }> {
  console.log(`Deep Reader: Opening ${url} (Alt Method: ${useAlternativeMethod})...`);
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({ 
      headless: !useAlternativeMethod, // Use visible browser for alternative method
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    
    if (useAlternativeMethod) {
      // Wait longer and scroll for the alternative method
      await page.evaluate(() => window.scrollBy(0, 500));
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const selectors = [
      '.job-description', 
      '#jobDescriptionText', 
      '.description__text', 
      '.show-more-less-html__markup',
      '.jobs-description-content__text',
      'main', 
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: useAlternativeMethod ? 10000 : 5000 });
        break;
      } catch (e) {}
    }

    const content = await page.evaluate(() => {
      // Blindly grab all text if specific selectors fail
      const desc = document.querySelector('.job-description, #jobDescriptionText, .description__text, .show-more-less-html__markup, .jobs-description-content__text');
      return desc ? (desc as HTMLElement).innerText : document.body.innerText;
    });

    return { content: content || '' };
  } catch (error) {
    console.error(`Deep Reader Error for ${url}:`, error);
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

export async function captureLinkedInData(userId: number) {
  if (!activePage) return { success: false, error: "No active window." };
  try {
    const captured = await activePage.evaluate(() => {
      const url = window.location.href;
      const getListItems = (selector: string) => Array.from(document.querySelectorAll(selector)).map(el => el.textContent?.trim() || "");
      const data: any = {};
      if (!url.includes('/details/')) {
        data.name = document.querySelector('.text-heading-xlarge')?.textContent?.trim();
        data.title = document.querySelector('.text-body-medium')?.textContent?.trim();
      }
      return data;
    });
    return { success: true, data: captured };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}