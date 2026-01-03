import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerProfilesHandlers(): string[] {
  const channels = ['profiles:get-all', 'profiles:save', 'profiles:update', 'profiles:delete'];

  // --- SEARCH PROFILES ---
  ipcMain.handle('profiles:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM search_profiles');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:save', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO search_profiles', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:update', async (_, data) => {
    try {
      await runQuery('UPDATE search_profiles', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM search_profiles', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
