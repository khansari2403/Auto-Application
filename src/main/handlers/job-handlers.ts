import { ipcMain } from 'electron';
import { runQuery, getAllQuery } from '../database';
import * as aiService from '../ai-service';

export function registerJobHandlers() {
  ipcMain.handle('jobs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  
  ipcMain.handle('jobs:add-manual', async (_, data) => {
    const result = await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', status: 'analyzing' });
    aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });

  ipcMain.handle('jobs:delete', async (_, id) => {
    await runQuery('DELETE FROM job_listings WHERE id = ?', [id]);
    return { success: true };
  });

  // FIX: Added missing doc confirmation handler
  ipcMain.handle('jobs:update-doc-confirmation', async (_, { jobId, confirmed }) => {
    await runQuery('UPDATE job_listings', { id: jobId, user_confirmed_docs: confirmed });
    return { success: true };
  });
}