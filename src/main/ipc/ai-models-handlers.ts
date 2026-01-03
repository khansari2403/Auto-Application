import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';

export function registerAIModelsHandlers(): string[] {
  const channels = ['ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete'];

  // --- AI MODELS ---
  ipcMain.handle('ai-models:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM ai_models');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO ai_models', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:update', async (_, data) => {
    try {
      await runQuery('UPDATE ai_models', [data]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM ai_models', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
