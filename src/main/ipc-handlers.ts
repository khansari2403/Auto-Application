import { runQuery, getAllQuery } from './database';
import { ipcMain } from 'electron';
import * as aiService from './ai-service';
import { registerJobHandlers } from './handlers/job-handlers';
import { registerProfileHandlers } from './handlers/profile-handlers';
import { registerAIHandlers } from './handlers/ai-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';

export function setupIpcHandlers(): void {
  // Load Sequential Modules
  registerJobHandlers();
  registerProfileHandlers();
  registerAIHandlers();
  registerSettingsHandlers();

  // --- JOB SEARCH & LISTINGS ---
  ipcMain.handle('jobs:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  
  // FIXED: Ensure delete works with simple ID
  ipcMain.handle('jobs:delete', async (_, id) => {
    return await runQuery('DELETE FROM job_listings', { id });
  });

  ipcMain.handle('jobs:add-manual', async (_, data) => {
    const result = await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', status: 'analyzing' });
    aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });

  // --- AUTOMATION ---
  ipcMain.handle('hunter:start-search', async (_, userId) => await aiService.startHunterSearch(userId));
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));

  // --- OTHER HANDLERS ---
  ipcMain.handle('logs:get-recent-actions', async () => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));
  ipcMain.handle('user:get-profile', async () => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });

  aiService.startHuntingScheduler(1);
  console.log('IPC Handlers and Automation restored.');
}