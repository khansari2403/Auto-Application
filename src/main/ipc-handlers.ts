import { runQuery, getAllQuery, getQuery } from './database';
import { ipcMain } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  console.log('Setting up IPC Handlers...');

  ipcMain.handle('user:get-profile', async (_, userId) => {
    const profile = await getAllQuery('SELECT * FROM user_profile');
    return { success: true, data: profile[0] || null };
  });

  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:update', async (_, data) => await runQuery('UPDATE ai_models', [data]));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE FROM ai_models WHERE id = ?', [id]));

  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));
  
  // NEW: User Consent for Ghost Jobs
  ipcMain.handle('ai:consent-ghost-job', async (_, jobId, userId) => {
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_consent: 0, status: 'processing_after_consent' });
    return await aiService.processApplication(jobId, userId, true); // Pass true for userConsentGiven
  });

  ipcMain.handle('ai:handle-intervention', async (_, jobId, userId, allowAI) => {
    if (allowAI) return await aiService.solveRoadblock(jobId, userId);
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'manual' });
    return { success: true };
  });

  ipcMain.handle('docs:save', async (_, data) => {
    const result = await runQuery('INSERT INTO documents', [data]);
    aiService.analyzeDocument(result.id, data.userId).catch(console.error);
    return result;
  });
  ipcMain.handle('docs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM documents') }));

  ipcMain.handle('jobs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('jobs:delete', async (_, id) => {
    await runQuery('DELETE FROM job_listings WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('apps:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));
  
  ipcMain.handle('apps:reply', async (_, data) => {
    const { appId, userId, message } = data;
    await runQuery('INSERT INTO action_logs', { 
      user_id: userId, 
      action_type: 'secretary_reply', 
      action_description: `Sent follow-up for application #${appId}`, 
      status: 'completed', 
      success: true 
    });
    return { success: true };
  });

  ipcMain.handle('websites:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_websites') }));
  ipcMain.handle('websites:add', async (_, data) => await runQuery('INSERT INTO job_websites', [data]));
  ipcMain.handle('websites:delete', async (_, id) => await runQuery('DELETE FROM job_websites WHERE id = ?', [id]));
  ipcMain.handle('websites:toggle-active', async (_, { id, isActive }) => {
    await runQuery('UPDATE job_websites', { id, is_active: isActive });
    return { success: true };
  });

  ipcMain.handle('settings:get', async (_, userId) => {
    const settings = await getAllQuery('SELECT * FROM settings');
    return { success: true, data: settings[0] || null };
  });
  ipcMain.handle('settings:update', async (_, data) => {
    await runQuery('UPDATE settings', data);
    return { success: true };
  });

  ipcMain.handle('profiles:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM search_profiles') }));
  ipcMain.handle('hunter:start-search', async (_, userId) => await aiService.startHunterSearch(userId));

  aiService.startHuntingScheduler(1);
  console.log('IPC Handlers registered successfully.');
}