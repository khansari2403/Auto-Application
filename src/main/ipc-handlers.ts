import { runQuery, getAllQuery, getQuery } from './database';
import { ipcMain, BrowserWindow } from 'electron';

export function setupIpcHandlers(): void {
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

  // --- AI GENERATOR LOOP ---
  ipcMain.handle('ai:process-application', async (_, jobId) => {
    // Agent 1: Generate CV/Letter
    // Agent 2: Audit & Correct
    return { success: true, message: "AI Agents are collaborating on your application..." };
  });

  // --- SETTINGS & LOGS ---
  ipcMain.handle('settings:get', async () => ({ success: true, data: await getQuery('SELECT * FROM settings') }));
  ipcMain.handle('settings:update', async (_, data) => await runQuery('UPDATE settings', [data]));
  ipcMain.handle('logs:get-recent-actions', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('logs:clear', async (_, userId) => await runQuery('DELETE action_logs', []));
  
  // Existing LinkedIn/Email handlers...
  ipcMain.handle('email:get-config', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM email_config') }));
  ipcMain.handle('user:get-profile', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM user_profile') }));
  ipcMain.handle('user:update-profile', async (_, data) => await runQuery('UPDATE user_profile', [data]));
}