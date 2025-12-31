/**
 * IPC Handlers Loader
 * This file is now a clean orchestrator that loads sequential modules.
 */

import { registerJobHandlers } from './handlers/job-handlers';
import { registerProfileHandlers } from './handlers/profile-handlers';
import { registerAIHandlers } from './handlers/ai-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';
import { getAllQuery } from './database';
import { ipcMain } from 'electron';

export function setupIpcHandlers(): void {
  console.log('Setting up Sequential IPC Handlers...');

  // Load Modules
  registerJobHandlers();
  registerProfileHandlers();
  registerAIHandlers();
  registerSettingsHandlers();

  // Global Handlers
  ipcMain.handle('logs:get-recent-actions', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('apps:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));
  ipcMain.handle('user:get-profile', async (_, userId) => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });

  console.log('IPC Handlers registered successfully.');
}