import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';

export function registerSettingsHandlers(): string[] {
  const channels = ['settings:get', 'settings:update'];

  // --- SETTINGS ---
  ipcMain.handle('settings:get', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM settings');
      return { success: true, data: data[0] || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('settings:update', async (_, data) => {
    try {
      await runQuery('UPDATE settings', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
