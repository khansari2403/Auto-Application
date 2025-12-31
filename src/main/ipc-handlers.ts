import { runQuery, getAllQuery } from './database';
import { ipcMain } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  console.log('Registering Consolidated IPC Handlers...');

  // --- SETTINGS & CONFIGURATION ---
  ipcMain.handle('settings:get', async () => {
    const settings = await getAllQuery('SELECT * FROM settings');
    return { success: true, data: settings[0] || null };
  });
  ipcMain.handle('settings:update', async (_, data) => await runQuery('UPDATE settings', data));
  ipcMain.handle('user:get-profile', async () => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });

  // --- SEARCH PROFILES ---
  ipcMain.handle('profiles:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));
  ipcMain.handle('profiles:save', async (_, data) => await runQuery('INSERT INTO search_profiles', [data]));
  ipcMain.handle('profiles:update', async (_, data) => await runQuery('UPDATE search_profiles', data));

  // --- JOB SEARCH & LISTINGS ---
  ipcMain.handle('jobs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('jobs:delete', async (_, id) => await runQuery('DELETE FROM job_listings', { id }));
  ipcMain.handle('jobs:add-manual', async (_, data) => {
    const result = await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', status: 'analyzing' });
    aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });
  ipcMain.handle('jobs:update-doc-confirmation', async (_, { jobId, confirmed }) => {
    return await runQuery('UPDATE job_listings', { id: jobId, user_confirmed_docs: confirmed });
  });

  // --- AUTOMATION ACTIONS ---
  ipcMain.handle('hunter:start-search', async (_, userId) => await aiService.startHunterSearch(userId));
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));

  // --- DOCUMENTS ---
  ipcMain.handle('docs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM documents') }));
  ipcMain.handle('docs:save', async (_, data) => {
    const result = await runQuery('INSERT INTO documents', [data]);
    aiService.analyzeDocument(result.id, data.userId).catch(console.error);
    return result;
  });

  // --- WEBSITES ---
  ipcMain.handle('websites:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_websites') }));
  ipcMain.handle('websites:add', async (_, data) => await runQuery('INSERT INTO job_websites', [data]));
  ipcMain.handle('websites:delete', async (_, id) => await runQuery('DELETE FROM job_websites', { id }));

  // --- AI MODELS ---
  ipcMain.handle('ai-models:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:update', async (_, data) => await runQuery('UPDATE ai_models', [data]));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE FROM ai_models', { id }));

  // --- LOGS & APPLICATIONS ---
  ipcMain.handle('logs:get-recent-actions', async () => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));

  aiService.startHuntingScheduler(1);
  console.log('All IPC Handlers successfully consolidated.');
}