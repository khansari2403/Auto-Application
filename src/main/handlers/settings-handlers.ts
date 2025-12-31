import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => {
    const data = await getAllQuery('SELECT * FROM settings');
    return { success: true, data: data[0] || {} };
  });

  ipcMain.handle('settings:update', async (_, settings) => {
    return await runQuery('UPDATE settings', settings);
  });
}