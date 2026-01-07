import puppeteer, { Browser, Page } from 'puppeteer';
import { logAction, getDatabase } from './database';
import path from 'path';
let app: any; try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

let activeBrowser: Browser | null = null;

// Get persistent user data directory for session cookies
const getUserDataDir = () => {
  return path.join(app.getPath('userData'), 'browser_data');
};

/**
 * HELPER: LAUNCH BROWSER WITH PROXY SUPPORT
 * Automatically pulls proxy_url from the settings table.
 */
async function launchBrowser(options: { headless?: boolean | 'new', userDataDir?: string, args?: string[] } = {}): Promise<Browser> {
  const db = getDatabase();
  const settings = db.settings[0] || {};
  const proxyServer = settings.proxy_url;

  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1280,800'
  ];

  if (proxyServer) {
    console.log(`Scraper: Using proxy server: ${proxyServer}`);
    defaultArgs.push(`--proxy-server=${proxyServer}`);
  }

  const launchOptions: any = {
    headless: options.headless !== undefined ? options.headless : false,
    userDataDir: options.userDataDir || getUserDataDir(),
    args: [...defaultArgs, ...(options.args || [])]
  };

  const browser = await puppeteer.launch(launchOptions);

  // Handle proxy authentication if credentials are provided in the URL
  if (proxyServer && proxyServer.includes('@')) {
    const authPart = proxyServer.split('@')[0].replace('http://', '').replace('https://', '');
    const [username, password] = authPart.split(':');
    if (username && password) {
      const page = (await browser.pages())[0] || await browser.newPage();
      await page.authenticate({ username, password });
    }
  }

  return browser;
}

/**
 * Random delay to simulate human behavior
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * COOKIE BANNER BYPASS
 */
async function handleCookieRoadblock(page: Page, userId: number, callAI: Function) {
  try {
    const isBannerVisible = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('cookie') || text.includes('accept') || text.includes('agree') || text.includes('zustimmen') || text.includes('akzeptieren');
    });
    
    if (!isBannerVisible) return;

    await logAction(userId, 'ai_observer', '📸 Cookie banner detected. Attempting bypass...', 'in_progress');
    
    // Try DOM-based click first (faster & more reliable)
    const clicked = await page.evaluate(() => {
      const selectors = [
        'button[data-testid="cookie-policy-dialog-accept-button"]',
        'button[id*="reject"]', 'button[id*="decline"]', 'button[id*="ablehnen"]',
        'button[class*="reject"]', 'button[class*="decline"]',
        '[data-tracking-control-name*="cookie"]',
        'button.artdeco-button--secondary'
      ];
      
      for (const sel of selectors) {
        const btn = document.querySelector(sel) as HTMLElement;
        if (btn) { btn.click(); return true; }
      }
      
      // Fallback: find by text content
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const rejectBtn = btns.find(b => {
        const txt = b.textContent?.toLowerCase() || '';
        return txt.includes('reject') || txt.includes('decline') || txt.includes('ablehnen') || txt.includes('nur notwendige') || txt.includes('essential');
      });
      if (rejectBtn) { (rejectBtn as HTMLElement).click(); return true; }
      
      // Last resort: accept
      const acceptBtn = btns.find(b => {
        const txt = b.textContent?.toLowerCase() || '';
        return txt.includes('accept') || txt.includes('agree') || txt.includes('akzeptieren') || txt.includes('alle akzeptieren');
      });
      if (acceptBtn) { (acceptBtn as HTMLElement).click(); return true; }
      
      return false;
    });

    if (clicked) {
      await logAction(userId, 'ai_observer', '✅ Cookie banner dismissed', 'completed', true);
      await randomDelay(1500, 2500);
    }
  } catch (e) {
    console.log('Cookie bypass error:', e);
  }
}

/**
 * Check if page is blocked by bot detection
 */
async function isPageBlocked(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('verify you are human') || 
           text.includes('captcha') || 
           text.includes('unusual traffic') ||
           text.includes('sign in to view') ||
           text.includes('please verify') ||
           text.includes('robot') ||
           text.includes('blocked');
  });
}

/**
 * SCRAPING - GET JOB PAGE CONTENT
 * Tries multiple extraction strategies
 */
export async function getJobPageContent(url: string, userId: number, callAI: Function): Promise<{ content: string, strategyUsed: string }> {
  let browser: Browser | null = null;
  
  try {
    console.log(`Scraper: Opening ${url}`);
    
    browser = await launchBrowser({ headless: false });
    
    const page = await browser.newPage();
    
    // Stealth settings
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'de'] });
    });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Handle cookie banner
    await handleCookieRoadblock(page, userId, callAI);
    
    // Human-like scrolling
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(800, 1500);
    await page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(1500, 3000);

    // Check if blocked
    if (await isPageBlocked(page)) {
      console.log('Scraper: Page blocked by bot detection');
      // Return plain primitives only
      return { content: '', strategyUsed: 'Blocked' };
    }

    // Try extraction strategies in order
    const result = await page.evaluate(() => {
      const getCleanText = (el: Element | null) => el ? (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim() : '';
      
      // STRATEGY 1: JSON-LD (Most reliable - structured data)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          // Check if it's a JobPosting
          if (data['@type'] === 'JobPosting' || data.title || data.jobTitle) {
            console.log('Found JSON-LD JobPosting');
            return { content: JSON.stringify(data, null, 2), strategy: 'JSON-LD' };
          }
          // Check for array format
          if (Array.isArray(data)) {
            const job = data.find((item: any) => item['@type'] === 'JobPosting');
            if (job) {
              return { content: JSON.stringify(job, null, 2), strategy: 'JSON-LD' };
            }
          }
          // Check for @graph format
          if (data['@graph']) {
            const job = data['@graph'].find((item: any) => item['@type'] === 'JobPosting');
            if (job) {
              return { content: JSON.stringify(job, null, 2), strategy: 'JSON-LD' };
            }
          }
        } catch (e) {}
      }
      
      // STRATEGY 2: Job-specific selectors
      const jobSelectors = [
        '.job-description', 
        '#jobDescriptionText', 
        '.description__text', 
        '.show-more-less-html__markup', 
        '.jobs-description__content',
        '.jobs-box__html-content',
        '[data-testid="job-description"]', 
        '.job-details',
        '.jobsearch-JobComponent-description',
        '#job-details'
      ];
      
      for (const sel of jobSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.length > 300) {
          return { content: getCleanText(el), strategy: `Selector: ${sel}` };
        }
      }
      
      // STRATEGY 3: Semantic HTML tags
      const semanticEls = document.querySelectorAll('main, article, [role="main"]');
      for (const el of semanticEls) {
        if (el.textContent && el.textContent.length > 500) {
          return { content: getCleanText(el), strategy: 'Semantic' };
        }
      }
      
      // STRATEGY 4: Find largest content block
      const divs = Array.from(document.querySelectorAll('div, section'));
      const blocks = divs
        .map(el => ({ el, text: getCleanText(el), len: el.textContent?.length || 0 }))
        .filter(b => b.len > 500 && b.len < 50000)
        .sort((a, b) => b.len - a.len);
      
      if (blocks.length > 0) {
        return { content: blocks[0].text, strategy: 'Density' };
      }

      // STRATEGY 5: Full body (last resort)
      const bodyText = getCleanText(document.body);
      if (bodyText.length > 300) {
        return { content: bodyText.substring(0, 15000), strategy: 'Body' };
      }
      
      return { content: '', strategy: 'Empty' };
    });

    console.log(`Scraper: Extracted using ${result.strategy}, length: ${result.content.length}`);
    
    // CRITICAL: Create new plain object with only string primitives
    // This prevents IPC clone errors when passing data between processes
    const safeContent = String(result.content || '');
    const safeStrategy = String(result.strategy || 'Unknown');
    
    return { content: safeContent, strategyUsed: safeStrategy };
    
  } catch (error: any) {
    console.error('Scraper Error:', error.message);
    // Return plain primitives only
    return { content: '', strategyUsed: 'Failed: ' + String(error.message || 'Unknown error') };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * SCRAPE JOB LISTING URLS FROM SEARCH RESULTS
 * Now with PAGINATION support - looks for "next page" buttons to get all results
 */
export async function scrapeJobs(baseUrl: string, query: string, location: string, credentials?: any, userId?: number, callAI?: Function): Promise<string[]> {
  let browser: Browser | null = null;
  const jobUrls: string[] = [];
  const MAX_PAGES = 5; // Limit to prevent infinite loops
  
  try {
    console.log(`Scraper: Searching for "${query}" in "${location}" on ${baseUrl}`);
    
    browser = await launchBrowser({ headless: false, args: ['--start-maximized'] });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Hide webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Build search URL based on website
    let searchUrl: string;
    if (baseUrl.includes('linkedin.com')) {
      searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('indeed')) {
      searchUrl = `https://de.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('glassdoor.de')) {
      // German Glassdoor
      searchUrl = `https://www.glassdoor.de/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locKeyword=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('glassdoor')) {
      // International Glassdoor
      searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locKeyword=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('xing')) {
      searchUrl = `https://www.xing.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('stepstone')) {
      searchUrl = `https://www.stepstone.de/jobs/${encodeURIComponent(query)}/in-${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('arbeitsagentur.de')) {
      // Bundesagentur für Arbeit - German job portal
      searchUrl = `https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&was=${encodeURIComponent(query)}&wo=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes('monster.com') || baseUrl.includes('monster.de')) {
      // Monster - uses q parameter for keyword search
      const monsterDomain = baseUrl.includes('monster.de') ? 'www.monster.de' : 'www.monster.com';
      searchUrl = `https://${monsterDomain}/jobs/search?q=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;
    } else {
      // For unknown sites, try to append query parameters
      if (baseUrl.includes('?')) {
        searchUrl = `${baseUrl}&q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
      } else {
        searchUrl = baseUrl;
      }
    }
    
    console.log(`Scraper: Navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Handle cookies
    if (callAI && userId) {
      await handleCookieRoadblock(page, userId, callAI);
    }
    
    // Human-like behavior - wait and scroll
    await randomDelay(2000, 4000);
    
    // Pagination loop
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= MAX_PAGES) {
      console.log(`Scraper: Processing page ${currentPage}...`);
      
      // Scroll to load all content on current page
      await page.evaluate(() => window.scrollBy(0, 400));
      await randomDelay(1000, 2000);
      await page.evaluate(() => window.scrollBy(0, 400));
      await randomDelay(1000, 2000);
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await randomDelay(2000, 4000);
      
      // Check if blocked
      if (await isPageBlocked(page)) {
        console.log('Scraper: Search page blocked');
        if (userId) {
          await logAction(userId, 'ai_hunter', '🚫 Search page blocked by bot detection', 'failed', false);
        }
        break;
      }
      
      // Extract job URLs from current page
      const links = await page.evaluate(() => {
        const selectors = [
          // LinkedIn
          'a.job-card-container__link',
          'a.base-card__full-link',
          'a[data-tracking-control-name="public_jobs_jserp-result_search-card"]',
          '.jobs-search__results-list a',
          // Indeed
          'a.jcs-JobTitle',
          'h2.jobTitle a',
          '.job_seen_beacon a[data-jk]',
          '.jobsearch-ResultsList a.tapItem',
          // Glassdoor (both .com and .de)
          'a.job-title',
          '.react-job-listing a',
          'a[data-test="job-link"]',
          '.JobCard_jobTitle__GLyJ1 a',
          // Xing
          'a[data-testid="job-posting-link"]',
          '.jobs-list a',
          // Stepstone
          'a[data-at="job-item-title"]',
          'article a[href*="/stellenangebote"]',
          '.job-element a',
          '[data-testid="job-item"] a',
          // Arbeitsagentur (Bundesagentur für Arbeit)
          'a[data-testid="ergebnisliste-job-link"]',
          '.ergebnisliste-item a',
          'a[href*="jobboerse.arbeitsagentur.de"]',
          '[data-automation-id="job-item"] a',
          '.result-list-item a',
          // Monster
          'a[data-testid="svx-job-title"]',
          'a.job-cardstyle__JobCardTitle',
          '.job-search-resultsstyle__JobSearchResultsContainer a[href*="/job-openings/"]',
          'a[href*="/job-openings/"]',
          '.card-content a',
          // Generic
          'a[href*="/job/"]',
          'a[href*="/jobs/"]',
          'a[href*="jobPosting"]',
          'a[href*="/stellenangebot"]',
          'a[href*="/stelle/"]'
        ];
        
        const foundLinks: string[] = [];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const href = (el as HTMLAnchorElement).href;
            if (href && 
                href.startsWith('http') && 
                !foundLinks.includes(href) &&
                !href.includes('/login') &&
                !href.includes('/signup') &&
                !href.includes('/register')) {
              foundLinks.push(href);
            }
          });
        });
        
        return foundLinks;
      });
      
      // Add new unique URLs
      const newUrls = links.filter(url => !jobUrls.includes(url));
      jobUrls.push(...newUrls);
      console.log(`Scraper: Found ${newUrls.length} new URLs on page ${currentPage} (total: ${jobUrls.length})`);
      
      // Try to find and click "Next Page" button
      hasMorePages = await clickNextPage(page);
      
      if (hasMorePages) {
        currentPage++;
        // Wait for page to load after clicking next
        await randomDelay(3000, 5000);
      }
    }
    
    // Limit total URLs
    const uniqueLinks = [...new Set(jobUrls)].slice(0, 50);
    console.log(`Scraper: Total found ${uniqueLinks.length} job URLs across ${currentPage} pages`);
    
    return uniqueLinks;
    
  } catch (error: any) { 
    console.error('Scraper Error:', error.message); 
  } finally { 
    if (browser) {
      await browser.close();
    }
  }
  
  return jobUrls;
}

/**
 * Try to click the "Next Page" button on job search results
 * Returns true if successfully clicked, false if no more pages
 */
async function clickNextPage(page: Page): Promise<boolean> {
  try {
    // Scroll to bottom first to ensure pagination is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(500, 1000);
    
    // Common pagination selectors
    const nextPageSelectors = [
      // Generic next/arrow buttons
      'button[aria-label*="next" i]',
      'button[aria-label*="nächste" i]',
      'a[aria-label*="next" i]',
      'a[aria-label*="nächste" i]',
      '[data-testid*="next"]',
      '[data-testid*="pagination-next"]',
      '.pagination-next',
      '.pager-next',
      'a.next',
      'button.next',
      // LinkedIn specific
      'button[aria-label="View next page"]',
      '.artdeco-pagination__button--next',
      // Indeed specific
      'a[data-testid="pagination-page-next"]',
      '[aria-label="Next Page"]',
      // Stepstone specific
      'a[data-at="pagination-next"]',
      '[data-testid="pagination-button-next"]',
      'a.pagination__next',
      // Generic patterns
      'nav[aria-label*="pagination" i] a:last-child',
      '.pagination a[rel="next"]',
      'ul.pagination li:last-child a',
      // Text-based (fallback)
      'a:has-text("Next")',
      'button:has-text("Next")',
      'a:has-text("Nächste")',
      'button:has-text("Nächste")',
      'a:has-text("Weiter")',
      'button:has-text("Weiter")'
    ];
    
    for (const selector of nextPageSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Check if the button is not disabled
          const isDisabled = await page.evaluate(el => {
            return el.hasAttribute('disabled') || 
                   el.classList.contains('disabled') ||
                   el.getAttribute('aria-disabled') === 'true' ||
                   (el as HTMLElement).style.pointerEvents === 'none';
          }, element);
          
          if (!isDisabled) {
            console.log(`Scraper: Found next page button with selector: ${selector}`);
            await element.click();
            return true;
          }
        }
      } catch (e) {
        // Selector didn't match, try next
      }
    }
    
    // Fallback: Try to find by text content
    const clicked = await page.evaluate(() => {
      const nextTexts = ['next', 'nächste', 'weiter', '›', '»', 'mehr anzeigen', 'show more', 'load more'];
      const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      
      for (const el of elements) {
        const text = el.textContent?.toLowerCase().trim() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (nextTexts.some(nt => text.includes(nt) || ariaLabel.includes(nt))) {
          // Check not disabled
          if (!el.hasAttribute('disabled') && !el.classList.contains('disabled')) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('Scraper: Clicked next page via text fallback');
      return true;
    }
    
    console.log('Scraper: No more pages or next button not found');
    return false;
    
  } catch (e) {
    console.log('Scraper: Error finding next page:', e);
    return false;
  }
}

/**
 * Open browser for manual login warm-up
 */
export async function openLinkedIn(userId: number, url: string) {
  activeBrowser = await launchBrowser({ headless: false, args: ['--start-maximized'] });
  const page = await activeBrowser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { success: true };
}

/**
 * SEARCH AND SCRAPE COMPANY INFO
 */
export async function getCompanyInfo(companyName: string, userId: number, callAI: Function): Promise<string> {
  let browser: Browser | null = null;
  try {
    console.log(`Scraper: Researching company: ${companyName}`);
    await logAction(userId, 'ai_observer', `🔍 Researching company: ${companyName}`, 'in_progress');

    browser = await launchBrowser({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Step 1: Find official website
    const siteSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + " official website")}`;
    await page.goto(siteSearchUrl, { waitUntil: 'networkidle2' });
    const officialSite = await page.evaluate(() => document.querySelector('div.g a')?.getAttribute('href'));
    
    // Step 2: Search for mission/about
    const searchUrl = officialSite 
      ? `https://www.google.com/search?q=site:${new URL(officialSite).hostname} mission history about`
      : `https://www.google.com/search?q=${encodeURIComponent(companyName + " company mission history news")}`;

    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Get the first few organic results
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div.g a'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => href && !href.includes('google.com'))
        .slice(0, 2);
    });

    let combinedInfo = "";
    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
        const text = await page.evaluate(() => {
          const body = document.body.innerText;
          return body.substring(0, 5000).replace(/\s+/g, ' ').trim();
        });
        combinedInfo += `\n--- Source: ${link} ---\n${text}\n`;
      } catch (e) {
        console.log(`Failed to scrape ${link}:`, e);
      }
    }

    return combinedInfo || "No specific company info found.";
  } catch (error: any) {
    console.error('Company Research Error:', error.message);
    return "Error researching company: " + error.message;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * CAPTURE SCREENSHOT FOR AI OBSERVER
 */
export async function capturePageScreenshot(page: Page): Promise<string> {
  const screenshot = await page.screenshot({ encoding: 'base64' });
  return `data:image/png;base64,${screenshot}`;
}

/**
 * EXECUTE MOUSE ACTION BASED ON COORDINATES
 */
export async function executeMouseAction(page: Page, action: { type: 'click' | 'type' | 'upload', x: number, y: number, text?: string, filePath?: string }) {
  console.log(`AI Mouse: Executing ${action.type} at (${action.x}, ${action.y})`);
  
  // Move mouse with jitter
  await page.mouse.move(action.x + Math.random() * 5, action.y + Math.random() * 5, { steps: 10 });
  await randomDelay(200, 500);

  if (action.type === 'click') {
    await page.mouse.click(action.x, action.y);
  } else if (action.type === 'type' && action.text) {
    await page.mouse.click(action.x, action.y);
    await randomDelay(100, 300);
    await page.keyboard.type(action.text, { delay: Math.random() * 100 + 50 });
  } else if (action.type === 'upload' && action.filePath) {
    // For upload, we often need to click the button first to trigger the file picker, 
    // but Puppeteer's fileChooser is more reliable if we can find the input.
    // Fallback: click the coordinates and hope for the best, or use fileChooser.
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.mouse.click(action.x, action.y),
    ]);
    await fileChooser.accept([action.filePath]);
  }
}

/**
 * GET FORM COORDINATES VIA AI OBSERVER
 */
export async function getFormCoordinates(page: Page, userId: number, observerModel: any, callAI: Function): Promise<any[]> {
  await logAction(userId, 'ai_observer', '📸 Analyzing page layout visually...', 'in_progress');
  
  const screenshot = await capturePageScreenshot(page);
  const prompt = `
    Analyze this screenshot of a job application form. 
    Identify the (x, y) coordinates for the following fields:
    - First Name
    - Last Name
    - Email
    - Phone Number
    - Upload CV/Resume button
    - Submit button
    
    Return ONLY a JSON array of objects:
    [{"field": "first_name", "x": 123, "y": 456}, ...]
    
    The coordinates should be relative to the top-left of the image (1280x800).
  `;

  const response = await callAI(observerModel, prompt, screenshot);
  try {
    const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse observer response:", e);
    return [];
  }
}


/**
 * AI-ASSISTED LINKEDIN JOB SCRAPING
 * Uses Hunter AI to help navigate LinkedIn job search when standard scraping fails.
 * This is a fallback for when LinkedIn's anti-bot measures block standard scraping.
 */
export async function scrapeLinkedInJobsWithAI(
  query: string, 
  location: string, 
  userId: number, 
  callAI: Function, 
  hunterModel: any
): Promise<string[]> {
  let browser: Browser | null = null;
  const jobUrls: string[] = [];
  
  try {
    console.log(`LinkedIn AI Scraper: Searching for "${query}" in "${location}"`);
    await logAction(userId, 'ai_hunter', `🤖 Using AI-assisted LinkedIn scraping for: ${query}`, 'in_progress');
    
    // Use LinkedIn browser data for session persistence
    const linkedInDataDir = path.join(app.getPath('userData'), 'linkedin_browser_data');
    
    browser = await launchBrowser({ 
      headless: false, 
      userDataDir: linkedInDataDir,
      args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Anti-detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Try LinkedIn Jobs search
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    
    console.log(`LinkedIn AI Scraper: Navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // Wait for page to stabilize
    await randomDelay(3000, 5000);
    
    // Handle cookies
    await handleCookieRoadblock(page, userId, callAI);
    
    // Check if we're logged in or seeing job results
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    // If blocked or need login, try to handle it
    if (await isPageBlocked(page) || pageContent.includes('Sign in') || pageContent.includes('Join now')) {
      console.log('LinkedIn AI Scraper: Detected login wall or block');
      await logAction(userId, 'ai_hunter', `⚠️ LinkedIn requires login. Please sign in manually.`, 'in_progress');
      
      // Give user time to login
      await randomDelay(5000, 10000);
      
      // Check again
      const newPageContent = await page.evaluate(() => document.body.innerText);
      if (newPageContent.includes('Sign in') || await isPageBlocked(page)) {
        await logAction(userId, 'ai_hunter', `❌ LinkedIn login required. Please configure LinkedIn credentials.`, 'failed', false);
        return [];
      }
    }
    
    // Scroll to load jobs
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await randomDelay(1500, 2500);
    }
    
    // Try to extract job URLs
    const urls = await page.evaluate(() => {
      const links: string[] = [];
      const selectors = [
        'a.job-card-container__link',
        'a.base-card__full-link',
        '.jobs-search__results-list a[href*="/jobs/view/"]',
        'a[data-tracking-control-name*="job"]',
        'a[href*="/jobs/view/"]'
      ];
      
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          const href = (el as HTMLAnchorElement).href;
          if (href && href.includes('/jobs/') && !links.includes(href)) {
            links.push(href);
          }
        });
      }
      
      return links;
    });
    
    if (urls.length > 0) {
      console.log(`LinkedIn AI Scraper: Found ${urls.length} job URLs`);
      jobUrls.push(...urls.slice(0, 25));
      await logAction(userId, 'ai_hunter', `✅ Found ${urls.length} LinkedIn jobs`, 'completed', true);
    } else {
      // Use AI to analyze the page and find job links
      console.log('LinkedIn AI Scraper: Standard extraction failed, using AI...');
      
      if (hunterModel) {
        const pageText = await page.evaluate(() => {
          return document.body.innerText.substring(0, 5000);
        });
        
        const aiPrompt = `Analyze this LinkedIn job search results page and extract any job posting URLs or job IDs you can find.
        
PAGE CONTENT:
${pageText}

If you find job URLs, return them as a JSON array. If you can see job IDs (like numbers in "jobs/view/123456"), construct the full URLs.
Return ONLY a JSON array of URLs: ["https://linkedin.com/jobs/view/123", ...]
If no jobs found, return: []`;
        
        try {
          const aiResponse = await callAI(hunterModel, aiPrompt);
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiUrls = JSON.parse(jsonMatch[0]);
            if (Array.isArray(aiUrls) && aiUrls.length > 0) {
              jobUrls.push(...aiUrls.slice(0, 25));
              await logAction(userId, 'ai_hunter', `✅ AI extracted ${aiUrls.length} LinkedIn jobs`, 'completed', true);
            }
          }
        } catch (aiError) {
          console.error('AI extraction failed:', aiError);
        }
      }
      
      if (jobUrls.length === 0) {
        await logAction(userId, 'ai_hunter', `❌ Could not find LinkedIn jobs. Please try logging in manually.`, 'failed', false);
      }
    }
    
    return jobUrls;
    
  } catch (error: any) {
    console.error('LinkedIn AI Scraper Error:', error.message);
    await logAction(userId, 'ai_hunter', `❌ LinkedIn scraping error: ${error.message}`, 'failed', false);
    return [];
  } finally {
    if (browser) {
      // Don't close immediately - keep for session
      setTimeout(() => {
        browser?.close().catch(() => {});
      }, 5000);
    }
  }
}