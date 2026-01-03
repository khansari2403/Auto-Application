import { ipcMain, shell } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';

export function registerUserHandlers(): string[] {
  const channels = [
    'user:get-profile', 
    'user:update-profile',
    'user:open-linkedin', 
    'user:capture-linkedin', 
    'user:save-linkedin-profile'
  ];

  // --- USER PROFILE ---
  ipcMain.handle('user:get-profile', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM user_profile');
      return { success: true, data: data[0] || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:update-profile', async (_, data) => {
    try {
      const db = getDatabase();
      if (db.user_profile.length > 0) {
        await runQuery('UPDATE user_profile', { ...data, id: db.user_profile[0].id });
      } else {
        await runQuery('INSERT INTO user_profile', [{ ...data, id: 1 }]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- LINKEDIN HELPERS ---
  ipcMain.handle('user:open-linkedin', async (_, url) => {
    try {
      const linkedinUrl = url || 'https://www.linkedin.com/in/';
      await shell.openExternal(linkedinUrl);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:capture-linkedin', async (_, data) => {
    try {
      const LinkedInScraper = require('../features/linkedin-scraper');
      const { userId, profileUrl } = data || {};
      
      if (!profileUrl) {
        return await LinkedInScraper.openLinkedInForLogin(userId || 1);
      }
      
      return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, profileUrl);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:save-linkedin-profile', async (_, data) => {
    try {
      const LinkedInScraper = require('../features/linkedin-scraper');
      return await LinkedInScraper.saveLinkedInProfile(data.userId, data.profileData);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
