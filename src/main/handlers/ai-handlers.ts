import { ipcMain } from 'electron';
import { getAllQuery, runQuery } from '../database';
import * as aiService from '../ai-service';

export function registerAIHandlers() {
  ipcMain.handle('ai-models:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM ai_models') }));
  ipcMain.handle('ai-models:add', async (_, data) => await runQuery('INSERT INTO ai_models', [data]));
  ipcMain.handle('ai-models:update', async (_, data) => await runQuery('UPDATE ai_models', [data]));
  ipcMain.handle('ai-models:delete', async (_, id) => await runQuery('DELETE FROM ai_models WHERE id = ?', [id]));

  ipcMain.handle('ai:fetch-models', async (_, apiKey) => await aiService.fetchModels(apiKey));
  ipcMain.handle('ai:process-application', async (_, jobId, userId) => await aiService.processApplication(jobId, userId));
  
  ipcMain.handle('ai:generate-tailored-docs', async (_, data) => {
    return await aiService.generateTailoredDocs(data);
  });

  ipcMain.handle('ai:consent-ghost-job', async (_, jobId, userId) => {
    return await aiService.processApplication(jobId, userId, true);
  });

  ipcMain.handle('ai:handle-intervention', async (_, jobId, userId, allowAI) => {
    if (allowAI) return await aiService.solveRoadblock(jobId);
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'manual' });
    return { success: true };
  });
}