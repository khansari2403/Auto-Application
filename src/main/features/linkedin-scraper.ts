import puppeteer, { Browser, Page } from 'puppeteer';
import { logAction, getDatabase, runQuery } from '../database';
import path from 'path';
import fs from 'fs';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

// Get persistent user data directory for browser session
const getUserDataDir = () => {
  const browserDataDir = path.join(app.getPath('userData'), 'linkedin_browser_data');
  if (!fs.existsSync(browserDataDir)) {
    fs.mkdirSync(browserDataDir, { recursive: true });
  }
  return browserDataDir;
};

// Shared browser instance for session persistence
let sharedBrowser: Browser | null = null;
let sharedPage: Page | null = null;

interface LinkedInProfile {
  name: string;
  title: string;
  location: string;
  photo: string;
  summary: string;
  experiences: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  educations: Array<{
    school: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
  }>;
  skills: string[];
  licenses: string[];
  languages: string[];
}

/**
 * Check if user is already logged in to LinkedIn
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for feed or profile indicators
    const loggedInIndicators = await page.evaluate(() => {
      return !!(
        document.querySelector('.global-nav__me') ||
        document.querySelector('.feed-identity-module') ||
        document.querySelector('[data-test-id="nav-settings"]') ||
        document.querySelector('.share-box-feed-entry__trigger') ||
        window.location.href.includes('/feed/') ||
        window.location.href.includes('/in/')
      );
    });
    return loggedInIndicators;
  } catch (e) {
    return false;
  }
}

/**
 * Get or create a shared browser instance with persistent session
 */
async function getOrCreateBrowser(): Promise<{ browser: Browser; page: Page; isNew: boolean }> {
  // If we have an existing browser that's still connected, reuse it
  if (sharedBrowser && sharedBrowser.isConnected()) {
    // Get existing pages or create new one
    const pages = await sharedBrowser.pages();
    if (pages.length > 0 && sharedPage && !sharedPage.isClosed()) {
      return { browser: sharedBrowser, page: sharedPage, isNew: false };
    }
    // Create new page if none exist
    sharedPage = await sharedBrowser.newPage();
    await setupPage(sharedPage);
    return { browser: sharedBrowser, page: sharedPage, isNew: false };
  }
  
  // Launch new browser with persistent session
  console.log('Launching new browser with user data dir:', getUserDataDir());
  sharedBrowser = await puppeteer.launch({
    headless: false,
    userDataDir: getUserDataDir(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,800',
      '--start-maximized'
    ]
  });
  
  const pages = await sharedBrowser.pages();
  sharedPage = pages.length > 0 ? pages[0] : await sharedBrowser.newPage();
  await setupPage(sharedPage);
  
  return { browser: sharedBrowser, page: sharedPage, isNew: true };
}

/**
 * Setup page with anti-detection measures
 */
async function setupPage(page: Page) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // Hide webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    (window.navigator.permissions.query as any) = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' } as PermissionStatus)
        : originalQuery(parameters);
  });
}

/**
 * Open LinkedIn in browser for manual login
 * Returns the browser instance for later scraping
 */
export async function openLinkedInForLogin(userId: number): Promise<{ success: boolean; message: string; isLoggedIn?: boolean }> {
  try {
    await logAction(userId, 'linkedin', '🔗 Opening LinkedIn...', 'in_progress');
    
    const { browser, page, isNew } = await getOrCreateBrowser();
    
    // Store references globally
    (global as any).linkedInBrowser = browser;
    (global as any).linkedInPage = page;
    
    // Check if already logged in
    if (!isNew) {
      const currentUrl = page.url();
      if (currentUrl.includes('linkedin.com')) {
        const loggedIn = await isLoggedIn(page);
        if (loggedIn) {
          await logAction(userId, 'linkedin', '✅ Already logged in to LinkedIn!', 'completed', true);
          return { 
            success: true, 
            message: 'You are already logged in to LinkedIn. You can click "Fetch Profile" directly.',
            isLoggedIn: true
          };
        }
      }
    }
    
    // Navigate to LinkedIn login
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if we got redirected to feed (meaning already logged in)
    const currentUrl = page.url();
    if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
      await logAction(userId, 'linkedin', '✅ Already logged in to LinkedIn!', 'completed', true);
      return { 
        success: true, 
        message: 'You are already logged in to LinkedIn! Click "Fetch Profile" to capture your profile.',
        isLoggedIn: true
      };
    }
    
    await logAction(userId, 'linkedin', '✅ LinkedIn opened. Please login manually.', 'completed', true);
    
    return { 
      success: true, 
      message: 'LinkedIn opened. Please login manually in the browser window, then click "Fetch Profile".',
      isLoggedIn: false
    };
  } catch (error: any) {
    await logAction(userId, 'linkedin', `❌ Error: ${error.message}`, 'failed', false);
    return { success: false, message: error.message };
  }
}

/**
 * Scrape the currently open LinkedIn profile
 */
export async function scrapeLinkedInProfile(userId: number, profileUrl?: string): Promise<{ success: boolean; data?: LinkedInProfile; error?: string }> {
  let page: Page | null = null;
  let browser: Browser | null = null;
  
  try {
    await logAction(userId, 'linkedin', '🔍 Starting LinkedIn profile capture...', 'in_progress');
    
    // Try to get existing browser or create new one
    const browserResult = await getOrCreateBrowser();
    browser = browserResult.browser;
    page = browserResult.page;
    
    // Update global references
    (global as any).linkedInBrowser = browser;
    (global as any).linkedInPage = page;
    
    // Check if logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('linkedin.com') || currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      // Navigate to check login status
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 30000 });
      
      const loggedIn = await isLoggedIn(page);
      if (!loggedIn) {
        return { 
          success: false, 
          error: 'Not logged in to LinkedIn. Please click "Sign in to LinkedIn" first and complete the login process.'
        };
      }
    }
    
    // Navigate to profile if URL provided, otherwise go to own profile
    const targetUrl = profileUrl || 'https://www.linkedin.com/in/me/';
    console.log('Navigating to profile:', targetUrl);
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for profile to load
    try {
      await page.waitForSelector('.pv-top-card, .scaffold-layout__main', { timeout: 15000 });
    } catch (e) {
      console.log('Profile selector not found, continuing anyway...');
    }
    
    // Random delay to appear human
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
    
    // Scroll to load lazy content
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
    
    // Extract profile data
    const profileData = await page.evaluate(() => {
      const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() || '';
      const getAttr = (selector: string, attr: string) => document.querySelector(selector)?.getAttribute(attr) || '';
      
      // Basic Info
      const name = getText('.pv-top-card--list li:first-child') || getText('h1.text-heading-xlarge') || getText('.pv-text-details__left-panel h1');
      const title = getText('.pv-top-card--list-bullet li:first-child') || getText('.text-body-medium.break-words') || '';
      const location = getText('.pv-top-card--list-bullet li:last-child') || getText('.text-body-small.inline.t-black--light.break-words') || '';
      const photo = getAttr('.pv-top-card-profile-picture__image', 'src') || getAttr('img.pv-top-card-profile-picture__image--show', 'src') || '';
      const summary = getText('.pv-about-section .pv-about__summary-text') || getText('#about ~ .display-flex .full-width') || '';
      
      // Experiences
      const experiences: any[] = [];
      document.querySelectorAll('#experience ~ .pvs-list__outer-container > ul > li').forEach(li => {
        const titleEl = li.querySelector('.t-bold span[aria-hidden="true"]') || li.querySelector('.mr1.t-bold span');
        const companyEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]') || li.querySelector('.t-14.t-normal');
        const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const descEl = li.querySelector('.pvs-list__outer-container .t-14.t-normal.t-black span[aria-hidden="true"]');
        
        if (titleEl) {
          const fullText = companyEl?.textContent || '';
          const [company, ...locationParts] = fullText.split('·').map(s => s.trim());
          
          const datesText = datesEl?.textContent || '';
          const dateMatch = datesText.match(/(\w+ \d{4})\s*[-–]\s*(\w+ \d{4}|Present)/i);
          
          experiences.push({
            title: titleEl.textContent?.trim() || '',
            company: company || '',
            location: locationParts.join(' ').trim(),
            startDate: dateMatch?.[1] || '',
            endDate: dateMatch?.[2] || '',
            description: descEl?.textContent?.trim() || ''
          });
        }
      });
      
      // Education
      const educations: any[] = [];
      document.querySelectorAll('#education ~ .pvs-list__outer-container > ul > li').forEach(li => {
        const schoolEl = li.querySelector('.t-bold span[aria-hidden="true"]');
        const degreeEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        
        if (schoolEl) {
          const degreeText = degreeEl?.textContent || '';
          const [degree, field] = degreeText.split(',').map(s => s.trim());
          const datesText = datesEl?.textContent || '';
          const yearMatch = datesText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
          
          educations.push({
            school: schoolEl.textContent?.trim() || '',
            degree: degree || '',
            field: field || '',
            startYear: yearMatch?.[1] || '',
            endYear: yearMatch?.[2] || ''
          });
        }
      });
      
      // Skills
      const skills: string[] = [];
      document.querySelectorAll('#skills ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach(el => {
        const skill = el.textContent?.trim();
        if (skill && !skills.includes(skill)) skills.push(skill);
      });
      
      // Licenses & Certifications
      const licenses: string[] = [];
      document.querySelectorAll('#licenses_and_certifications ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach(el => {
        const license = el.textContent?.trim();
        if (license && !licenses.includes(license)) licenses.push(license);
      });
      
      // Languages
      const languages: string[] = [];
      document.querySelectorAll('#languages ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach(el => {
        const lang = el.textContent?.trim();
        if (lang && !languages.includes(lang)) languages.push(lang);
      });
      
      return { name, title, location, photo, summary, experiences, educations, skills, licenses, languages };
    });
    
    await logAction(userId, 'linkedin', `✅ Profile captured: ${profileData.name}`, 'completed', true);
    
    // Don't close the browser - keep it open for future scraping
    // The session will persist due to userDataDir
    
    return { success: true, data: profileData as LinkedInProfile };
    
  } catch (error: any) {
    console.error('LinkedIn scrape error:', error);
    await logAction(userId, 'linkedin', `❌ Capture failed: ${error.message}`, 'failed', false);
    
    // Don't close the browser on error - let user retry
    
    return { success: false, error: error.message };
  }
}

/**
 * Save scraped profile to database
 */
export async function saveLinkedInProfile(userId: number, profileData: LinkedInProfile): Promise<{ success: boolean }> {
  try {
    const db = getDatabase();
    
    // Check if profile exists
    const existingProfile = db.user_profile.find((p: any) => p.id === userId) || db.user_profile[0];
    
    const profileToSave = {
      id: existingProfile?.id || userId,
      name: profileData.name,
      title: profileData.title,
      location: profileData.location,
      photo: profileData.photo,
      summary: profileData.summary,
      experiences: JSON.stringify(profileData.experiences),
      educations: JSON.stringify(profileData.educations),
      skills: JSON.stringify(profileData.skills),
      licenses: JSON.stringify(profileData.licenses),
      languages: JSON.stringify(profileData.languages),
      linkedin_imported: true,
      updated_at: new Date().toISOString()
    };
    
    if (existingProfile) {
      await runQuery('UPDATE user_profile', profileToSave);
    } else {
      await runQuery('INSERT INTO user_profile', profileToSave);
    }
    
    await logAction(userId, 'linkedin', `💾 Profile saved to database`, 'completed', true);
    return { success: true };
    
  } catch (error: any) {
    console.error('Save profile error:', error);
    return { success: false };
  }
}

/**
 * Close LinkedIn browser if open
 */
export async function closeLinkedInBrowser(): Promise<void> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
  
  // Also clear global references
  (global as any).linkedInBrowser = null;
  (global as any).linkedInPage = null;
}

/**
 * Export isSearching state for UI sync
 */
export const isSearching = false;
