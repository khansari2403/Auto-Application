import puppeteer, { Browser, Page } from 'puppeteer';
import { runQuery } from './database';

let activeBrowser: Browser | null = null;
let activePage: Page | null = null;

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

      // 1. MAIN PROFILE PAGE
      if (!url.includes('/details/')) {
        data.name = document.querySelector('.text-heading-xlarge')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim();
        data.title = document.querySelector('.text-body-medium')?.textContent?.trim();
        data.photo = (document.querySelector('.pv-top-card-profile-picture__image') as HTMLImageElement)?.src;
        data.location = document.querySelector('.text-body-small.inline.t-black--light')?.textContent?.trim();
      }

      // 2. SUB-PAGES
      if (url.includes('/details/experience/')) data.experienceList = getListItems('.pvs-list__paged-list-item');
      if (url.includes('/details/education/')) data.educationList = getListItems('.pvs-list__paged-list-item');
      if (url.includes('/details/certifications/')) data.licenseList = getListItems('.pvs-list__paged-list-item');
      if (url.includes('/details/skills/')) data.skillList = getListItems('.pvs-list__paged-list-item');
      if (url.includes('/details/languages/')) data.languageList = getListItems('.pvs-list__paged-list-item');

      return data;
    });

    return { success: true, data: captured };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}