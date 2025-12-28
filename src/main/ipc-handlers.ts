import { runQuery, getAllQuery, getQuery } from './database';
import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  // --- AI GENERATOR LOOP ---
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => {
    return await aiService.processApplication(jobId, userId);
  });

  // --- AI MODELS ---
  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE ai_models WHERE id = ?', [id]));

  // --- STORAGE & SETTINGS ---
  ipcMain.handle('settings:get', async () => ({ success: true, data: await getQuery('SELECT * FROM settings') }));
  ipcMain.handle('settings:update', async (_, data) => await runQuery('UPDATE settings', [data]));
  ipcMain.handle('settings:select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // --- DOCUMENTS ---
  ipcMain.handle('docs:save', async (_, data) => await runQuery('INSERT INTO documents', [data]));
  ipcMain.handle('docs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM documents') }));
  ipcMain.handle('docs:delete', async (_, id) => await runQuery('DELETE documents WHERE id = ?', [id]));

  // --- JOB SEARCH ---
  ipcMain.handle('jobs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('jobs:add-manual', async (_, data) => await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', profileName: 'Manual' }));
  
  // --- SEARCH PROFILES ---
  ipcMain.handle('profiles:save', async (_, data) => await runQuery('INSERT INTO search_profiles', [data]));
  ipcMain.handle('profiles:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));
  ipcMain.handle('profiles:update', async (_, data) => await runQuery('UPDATE search_profiles', [data]));
  ipcMain.handle('profiles:delete', async (_, id) => await runQuery('DELETE search_profiles WHERE id = ?', [id]));

  // --- LOGS ---
  ipcMain.handle('logs:get-recent-actions', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('logs:clear', async (_, userId) => await runQuery('DELETE action_logs', []));
  
  // --- EXISTING ---
  ipcMain.handle('email:get-config', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM email_config') }));
  ipcMain.handle('user:get-profile', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM user_profile') }));
  ipcMain.handle('user:update-profile', async (_, data) => await runQuery('UPDATE user_profile', [data]));
}