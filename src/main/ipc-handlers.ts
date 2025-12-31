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

  // Global Handlers
  ipcMain.handle('logs:get-recent-actions', async () => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async () => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));
  ipcMain.handle('user:get-profile', async () => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });

  aiService.startHuntingScheduler(1);
  console.log('IPC Handlers and Automation restored.');
}