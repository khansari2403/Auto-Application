import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerProfileHandlers() {
  ipcMain.handle('profiles:save', async (_, profile) => {
    return await runQuery('UPDATE user_profile', profile);
  });

  ipcMain.handle('profiles:get-all', async () => {
    const data = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data };
  });
}