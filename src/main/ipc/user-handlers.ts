import { ipcMain, shell, BrowserWindow, session } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import path from 'path';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

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

  // Open LinkedIn login using Puppeteer with persistent session
  ipcMain.handle('user:open-linkedin-login', async (_, data) => {
    try {
      const LinkedInScraper = require('../features/linkedin-scraper');
      const userId = data?.userId || 1;
      
      // Use the shared browser session from linkedin-scraper
      const result = await LinkedInScraper.openLinkedInForLogin(userId);
      return result;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:capture-linkedin', async (_, data) => {
    try {
      const LinkedInScraper = require('../features/linkedin-scraper');
      const { getAllQuery } = require('../database');
      const aiService = require('../ai-service');
      const { userId, profileUrl, useAI } = data || {};
      
      // Get Hunter AI model for AI-enhanced scraping
      let hunterModel = null;
      if (useAI !== false) { // Default to using AI if not explicitly disabled
        try {
          const models = await getAllQuery('SELECT * FROM ai_models');
          hunterModel = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
        } catch (e) {
          console.log('Could not load Hunter model for AI enhancement');
        }
      }
      
      // If no profileUrl, this is a request to open browser for login
      if (!profileUrl && !data?.profileUrl) {
        // Check if we should open login or just scrape
        // For scraping, always try to scrape with the persistent session
        if (hunterModel) {
          return await LinkedInScraper.scrapeLinkedInProfileWithAI(
            userId || 1, 
            null, 
            aiService.callAI, 
            hunterModel
          );
        }
        return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, null);
      }
      
      // With profileUrl - use AI enhanced if available
      if (hunterModel) {
        return await LinkedInScraper.scrapeLinkedInProfileWithAI(
          userId || 1, 
          profileUrl, 
          aiService.callAI, 
          hunterModel
        );
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
