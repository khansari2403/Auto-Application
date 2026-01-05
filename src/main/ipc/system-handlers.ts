import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';

export function registerSystemHandlers(): string[] {
  const channels = [
    'logs:get-recent-actions',
    'apps:get-all',
    'scheduler:toggle',
    'scheduler:get-status',
    'qa:get-all',
    'qa:update',
    'qa:delete'
  ];

  // --- LOGS ---
  ipcMain.handle('logs:get-recent-actions', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM action_logs');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- APPLICATIONS ---
  ipcMain.handle('apps:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM applications');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SCHEDULER CONTROL ---
  ipcMain.handle('scheduler:toggle', async (_, data) => {
    try {
      // Support both { active: boolean } and direct boolean
      const enabled = typeof data === 'object' ? data.active : data;
      const { setSchedulerEnabled } = require('../features/scheduler');
      setSchedulerEnabled(enabled);
      await runQuery('UPDATE settings', { job_hunting_active: enabled ? 1 : 0 });
      console.log(`Scheduler toggled: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return { success: true, enabled };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('scheduler:get-status', async () => {
    try {
      const db = getDatabase();
      const settings = db.settings[0];
      return { 
        success: true, 
        enabled: settings?.job_hunting_active === 1 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- Q&A DATABASE ---
  ipcMain.handle('qa:get-all', async () => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      const data = await SmartApplicant.getAllQuestions();
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('qa:update', async (_, data) => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      return await SmartApplicant.updateQuestionAnswer(data.questionId, data.answer);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('qa:delete', async (_, questionId) => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      return await SmartApplicant.deleteQuestion(questionId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
