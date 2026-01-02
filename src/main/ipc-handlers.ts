import { runQuery, getAllQuery, getDatabase } from './database';
import { ipcMain, shell, BrowserWindow } from 'electron';
import * as aiService from './ai-service';
import axios from 'axios';

export function setupIpcHandlers(): void {
  // CLEAN SLATE: Remove ALL existing handlers to prevent "second handler" error
  const channels = [
    'settings:get', 'settings:update', 'user:get-profile', 'user:update-profile',
    'user:open-linkedin', 'user:capture-linkedin',
    'profiles:get-all', 'profiles:save', 'profiles:update', 'profiles:delete',
    'jobs:get-all', 'jobs:delete', 'jobs:add-manual', 'jobs:update-doc-confirmation',
    'hunter:start-search', 'ai:process-application', 'ai:generate-tailored-docs',
    'ai:fetch-models',
    'docs:get-all', 'docs:save', 'docs:open-file',
    'websites:get-all', 'websites:add', 'websites:delete', 'websites:toggle-active',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all',
    'scheduler:toggle', 'scheduler:get-status'
  ];
  
  // Remove handlers first - prevents duplication on hot reload
  channels.forEach(channel => {
    try { ipcMain.removeHandler(channel); } catch (e) { /* ignore if not exists */ }
  });

  // --- SETTINGS ---
  ipcMain.handle('settings:get', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM settings');
      return { success: true, data: data[0] || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('settings:update', async (_, data) => {
    try {
      await runQuery('UPDATE settings', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

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
      // If profile exists, update it; otherwise create it
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

  ipcMain.handle('user:capture-linkedin', async () => {
    try {
      // This will attempt to capture LinkedIn data from the active browser
      // For now, return a mock structure that the user can fill in manually
      // Full implementation would require Playwright/Puppeteer
      return { 
        success: true, 
        data: {
          name: '',
          title: '',
          location: '',
          photo: '',
          summary: '',
          experienceList: [],
          educationList: [],
          skillList: [],
          licenseList: [],
          languageList: []
        },
        message: 'LinkedIn capture requires browser automation. Please use manual entry for now.'
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SEARCH PROFILES ---
  ipcMain.handle('profiles:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM search_profiles');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:save', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO search_profiles', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:update', async (_, data) => {
    try {
      // data can include: job_titles, industry, excluded_industries, experience_levels, certifications
      // These are stored as comma-separated strings
      await runQuery('UPDATE search_profiles', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM search_profiles', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- JOBS ---
  ipcMain.handle('jobs:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_listings');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:delete', async (_, id) => {
    try {
      const deleteId = typeof id === 'object' ? id.id : id;
      await runQuery('DELETE FROM job_listings', { id: deleteId });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:add-manual', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_listings', { 
        ...data, 
        source: 'Manual', 
        status: 'analyzing' 
      });
      // Start analysis in background
      aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:update-doc-confirmation', async (_, data) => {
    try {
      await runQuery('UPDATE job_listings', { 
        id: data.jobId, 
        user_confirmed_docs: data.confirmed 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- AI / HUNTER ---
  ipcMain.handle('hunter:start-search', async (_, userId) => {
    try {
      const result = await aiService.startHunterSearch(userId);
      return result;
    } catch (e: any) {
      console.error('Hunter search error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai:process-application', async (_, jobId, userId) => {
    try {
      return await aiService.processApplication(jobId, userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai:generate-tailored-docs', async (_, data) => {
    try {
      return await aiService.processApplication(data.jobId, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- AI FETCH MODELS (NEW) ---
  ipcMain.handle('ai:fetch-models', async (_, data) => {
    try {
      const { provider, apiKey } = data;
      let models: string[] = [];

      if (provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 10000
        });
        models = response.data.data
          .filter((m: any) => m.id.includes('gpt'))
          .map((m: any) => m.id)
          .sort();
      } else if (provider === 'together') {
        // Together AI models
        models = [
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'meta-llama/Llama-3-70b-chat-hf',
          'meta-llama/Llama-3-8b-chat-hf',
          'togethercomputer/CodeLlama-34b-Instruct'
        ];
      } else if (provider === 'local') {
        // Try to fetch from Ollama
        try {
          const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
          models = response.data.models?.map((m: any) => m.name) || ['llama3', 'mistral', 'codellama'];
        } catch {
          models = ['llama3', 'mistral', 'codellama', 'phi3'];
        }
      }

      return { success: true, models };
    } catch (e: any) {
      console.error('Fetch models error:', e.message);
      return { success: false, error: e.message, models: [] };
    }
  });

  // --- DOCUMENTS ---
  ipcMain.handle('docs:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM documents');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:save', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO documents', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:open-file', async (_, filePath) => {
    try {
      const { shell } = require('electron');
      await shell.openPath(filePath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- WEBSITES ---
  ipcMain.handle('websites:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_websites');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_websites', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM job_websites', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:toggle-active', async (_, data) => {
    try {
      await runQuery('UPDATE job_websites', { id: data.id, is_active: data.isActive });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- AI MODELS ---
  ipcMain.handle('ai-models:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM ai_models');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO ai_models', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:update', async (_, data) => {
    try {
      await runQuery('UPDATE ai_models', [data]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM ai_models', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- LOGS ---
  ipcMain.handle('logs:get-recent-actions', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM action_logs');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- APPLICATIONS ---
  ipcMain.handle('apps:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM applications');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Start scheduler
  aiService.startHuntingScheduler(1);
  
  console.log('✅ IPC Handlers registered successfully');
}