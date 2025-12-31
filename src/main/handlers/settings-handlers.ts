import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';
import * as aiService from '../ai-service';

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_, userId) => {
    const settings = await getAllQuery('SELECT * FROM settings');
    return { success: true, data: settings[0] || null };
  });

  ipcMain.handle('settings:update', async (_, data) => {
    await runQuery('UPDATE settings', data);
    return { success: true };
  });

  ipcMain.handle('websites:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_websites') }));
  
  ipcMain.handle('websites:add', async (_, data) => {
    const result = await runQuery('INSERT INTO job_websites', [data]);
    if (result.id && data.email && data.password) {
      aiService.verifyWebsiteLogin(result.id, data.userId).catch(console.error);
    }
    return result;
  });

  ipcMain.handle('websites:delete', async (_, id) => {
    await runQuery('DELETE FROM job_websites WHERE id = ?', [id]);
    return { success: true };
  });
}