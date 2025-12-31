import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerProfileHandlers() {
  ipcMain.handle('profiles:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));
  
  ipcMain.handle('profiles:save', async (_, data) => await runQuery('INSERT INTO search_profiles', [data]));
  
  ipcMain.handle('profiles:update', async (_, data) => {
    await runQuery('UPDATE search_profiles', data);
    return { success: true };
  });

  ipcMain.handle('profiles:delete', async (_, id) => {
    await runQuery('DELETE FROM search_profiles WHERE id = ?', [id]);
    return { success: true };
  });
}