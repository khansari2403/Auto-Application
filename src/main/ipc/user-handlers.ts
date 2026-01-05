import { ipcMain, shell, BrowserWindow } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';

export function registerUserHandlers(): string[] {
  const channels = [
    'user:get-profile', 
    'user:update-profile',
    'user:open-linkedin', 
    'user:capture-linkedin', 
    'user:save-linkedin-profile',
    'user:open-linkedin-login'
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

  // Open LinkedIn login in a popup window and wait for user to sign in
  ipcMain.handle('user:open-linkedin-login', async () => {
    try {
      // Create a popup window for LinkedIn login
      const loginWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: 'LinkedIn Sign In',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Navigate to LinkedIn login page
      await loginWindow.loadURL('https://www.linkedin.com/login');
      
      // Return immediately - user will manually log in
      return { 
        success: true, 
        message: 'LinkedIn login window opened. Please sign in manually, then close this window and click "Fetch Profile".' 
      };
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
