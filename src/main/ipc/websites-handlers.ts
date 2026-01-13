import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerWebsitesHandlers(): string[] {
  const channels = ['websites:get-all', 'websites:add', 'websites:delete', 'websites:toggle-active'];

  // --- WEBSITES ---
  ipcMain.handle('websites:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_websites');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_websites', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM job_websites', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:toggle-active', async (_, data) => {
    try {
      await runQuery('UPDATE job_websites', { id: data.id, is_active: data.isActive });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
