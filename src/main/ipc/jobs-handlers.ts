import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import * as aiService from '../ai-service';

export function registerJobsHandlers(): string[] {
  const channels = [
    'jobs:get-all', 
    'jobs:delete', 
    'jobs:add-manual', 
    'jobs:update-doc-confirmation',
    'jobs:archive',
    'jobs:clear-old'
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

  // Clear old/expired jobs (archive them in bulk)
  ipcMain.handle('jobs:clear-old', async (_, data) => {
    try {
      const { daysOld = 14 } = data || {};
      const db = getDatabase();
      const jobs = db.job_listings || [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let archivedCount = 0;
      
      for (const job of jobs) {
        // Skip already archived or applied jobs
        if (job.archived === 1 || job.status === 'applied') continue;
        
        let shouldArchive = false;
        
        // Check if deadline has passed
        if (job.deadline) {
          const deadline = new Date(job.deadline);
          if (deadline < new Date()) shouldArchive = true;
        }
        
        // Check if posted date is older than cutoff
        if (job.posted_date) {
          const postedDate = new Date(job.posted_date);
          if (postedDate < cutoffDate) shouldArchive = true;
        }
        
        // Check if imported older than cutoff and not applied
        if (job.date_imported) {
          const importedDate = new Date(job.date_imported);
          if (importedDate < cutoffDate) shouldArchive = true;
        }
        
        if (shouldArchive) {
          await runQuery('UPDATE job_listings', { id: job.id, archived: 1 });
          archivedCount++;
        }
      }
      
      return { success: true, archivedCount };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
