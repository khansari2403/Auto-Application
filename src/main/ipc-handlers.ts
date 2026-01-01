import { runQuery, getAllQuery } from './database';
import { ipcMain } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  // Clear existing handlers to prevent "second handler" error
  const channels = [
    'settings:get', 'settings:update', 'user:get-profile', 
    'profiles:get-all', 'profiles:save', 'profiles:update',
    'jobs:get-all', 'jobs:delete', 'jobs:add-manual', 'jobs:update-doc-confirmation',
    'hunter:start-search', 'ai:process-application', 'docs:get-all', 'docs:save',
    'websites:get-all', 'websites:add', 'websites:delete',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all'
  ];
  channels.forEach(channel => ipcMain.removeHandler(channel));

  // --- REGISTER ALL HANDLERS ---
  ipcMain.handle('settings:get', async () => ({ success: true, data: (await getAllQuery('SELECT * FROM settings'))[0] || null }));
  ipcMain.handle('settings:update', async (_, data) => await runQuery('UPDATE settings', data));
  ipcMain.handle('user:get-profile', async () => ({ success: true, data: (await getAllQuery('SELECT * FROM user_profile'))[0] || null }));
  
  ipcMain.handle('profiles:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));
  ipcMain.handle('profiles:save', async (_, data) => await runQuery('INSERT INTO search_profiles', [data]));
  ipcMain.handle('profiles:update', async (_, data) => await runQuery('UPDATE search_profiles', data));

  ipcMain.handle('jobs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('jobs:delete', async (_, id) => await runQuery('DELETE FROM job_listings', { id: typeof id === 'object' ? id.id : id }));
  ipcMain.handle('jobs:add-manual', async (_, data) => {
    const result = await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', status: 'analyzing' });
    aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });

  ipcMain.handle('hunter:start-search', async (_, userId) => await aiService.startHunterSearch(userId));
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));

  ipcMain.handle('docs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM documents') }));
  ipcMain.handle('docs:save', async (_, data) => await runQuery('INSERT INTO documents', [data]));

  ipcMain.handle('websites:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_websites') }));
  ipcMain.handle('websites:add', async (_, data) => await runQuery('INSERT INTO job_websites', [data]));
  ipcMain.handle('websites:delete', async (_, id) => await runQuery('DELETE FROM job_websites', { id }));

  ipcMain.handle('ai-models:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:update', async (_, data) => await runQuery('UPDATE ai_models', [data]));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE FROM ai_models', { id }));

  ipcMain.handle('logs:get-recent-actions', async () => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));

  aiService.startHuntingScheduler(1);
}