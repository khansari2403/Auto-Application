import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import * as aiService from '../ai-service';

export function registerJobsHandlers(): string[] {
  const channels = [
    'jobs:get-all', 
    'jobs:delete', 
    'jobs:add-manual', 
    'jobs:update-doc-confirmation',
    'jobs:archive'
  ];

  // --- JOBS ---
  ipcMain.handle('jobs:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_listings');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:delete', async (_, id) => {
    try {
      const deleteId = typeof id === 'object' ? id.id : id;
      await runQuery('DELETE FROM job_listings', { id: deleteId });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:add-manual', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_listings', { 
        ...data, 
        source: 'Manual', 
        status: 'analyzing' 
      });
      // Start analysis in background
      aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:update-doc-confirmation', async (_, data) => {
    try {
      await runQuery('UPDATE job_listings', { 
        id: data.jobId, 
        user_confirmed_docs: data.confirmed 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Archive/Unarchive a job
  ipcMain.handle('jobs:archive', async (_, data) => {
    try {
      await runQuery('UPDATE job_listings', { 
        id: data.jobId, 
        archived: data.archived 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
