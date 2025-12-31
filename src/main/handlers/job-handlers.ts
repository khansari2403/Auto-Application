import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerJobHandlers() {
  ipcMain.handle('jobs:get-all', async () => {
    const data = await getAllQuery('SELECT * FROM job_listings');
    return { success: true, data };
  });

  ipcMain.handle('jobs:save-preferences', async (_, prefs) => {
    return await runQuery('UPDATE job_preferences', prefs);
  });
}