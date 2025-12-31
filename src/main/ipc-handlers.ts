import { runQuery, getAllQuery } from './database';
import { ipcMain } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  console.log('Registering all IPC Handlers...');

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

  // --- JOBS & AUTOMATION ---
  ipcMain.handle('jobs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('hunter:start-search', async (_, userId) => await aiService.startHunterSearch(userId));
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));

  // --- PROFILES ---
  ipcMain.handle('profiles:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));

  // --- SETTINGS & USER ---
  ipcMain.handle('user:get-profile', async () => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });
  ipcMain.handle('settings:get', async () => {
    const settings = await getAllQuery('SELECT * FROM settings');
    return { success: true, data: settings[0] || null };
  });

  // --- LOGS & APPS ---
  ipcMain.handle('logs:get-recent-actions', async () => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));

  aiService.startHuntingScheduler(1);
  console.log('All IPC Handlers and Automation logic successfully restored.');
}