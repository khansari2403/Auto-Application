import { runQuery, getAllQuery, getQuery } from './database';
import { ipcMain, dialog } from 'electron';
import * as aiService from './ai-service';

export function setupIpcHandlers(): void {
  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:update', async (_, data) => await runQuery('UPDATE ai_models', [data]));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE ai_models WHERE id = ?', [id]));

  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));
  ipcMain.handle('ai:handle-intervention', async (_, jobId, userId, allowAI) => {
    if (allowAI) return await aiService.solveRoadblock(jobId, userId);
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'manual' });
    return { success: true };
  });

  ipcMain.handle('ai:fetch-models', async (_, apiKey, role) => await aiService.fetchModels(apiKey, role));

  ipcMain.handle('docs:save', async (_, data) => {
    const result = await runQuery('INSERT INTO documents', [data]);
    aiService.analyzeDocument(result.id, data.userId).catch(console.error);
    return result;
  });
  ipcMain.handle('docs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM documents') }));
  ipcMain.handle('docs:delete', async (_, id) => await runQuery('DELETE documents WHERE id = ?', [id]));

  ipcMain.handle('jobs:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM job_listings') }));
  ipcMain.handle('jobs:add-manual', async (_, data) => {
    const existing = await getAllQuery('SELECT * FROM job_listings');
    if (existing.some((j: any) => j.url === data.url)) return { success: false, error: 'Job already exists.' };
    const result = await runQuery('INSERT INTO job_listings', { ...data, source: 'Manual', status: 'analyzing' });
    aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });
  ipcMain.handle('jobs:delete', async (_, id) => {
    await runQuery('DELETE job_listings WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('apps:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));
  ipcMain.handle('logs:get-recent-actions', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  
  ipcMain.handle('questions:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM questions') }));
  ipcMain.handle('questions:answer', async (_, data) => await runQuery('UPDATE questions', { ...data, status: 'answered' }));
}