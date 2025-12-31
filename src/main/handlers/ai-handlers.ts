import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerAIHandlers() {
  ipcMain.handle('ai:get-models', async () => {
    const data = await getAllQuery('SELECT * FROM ai_models');
    return { success: true, data };
  });

  ipcMain.handle('ai:save-model', async (_, model) => {
    return await runQuery('INSERT INTO ai_models', model);
  });
}