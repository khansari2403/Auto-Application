import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import fs from 'fs';
import path from 'path';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

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
      // Convert camelCase to snake_case for database
      const dbData = {
        model_name: data.modelName,
        api_key: data.apiKey,
        role: data.role,
        writing_style: data.writingStyle,
        word_limit: data.wordLimit,
        strictness: data.strictness,
        functional_prompt: data.functionalPrompt,
        cv_style_persona: data.cvStylePersona,
        reference_cv_id: data.referenceCvId,
        cv_style_code: data.cvStyleCode,
        auditor_source: data.auditorSource,
        thinker_source: data.thinkerSource,
        motivation_letter_word_limit: data.motivationLetterWordLimit,
        cover_letter_word_limit: data.coverLetterWordLimit,
        status: 'active',
        user_id: data.userId || 1
      };
      
      const result = await runQuery('INSERT INTO ai_models', [dbData]);
      
      // Also save to file directly for persistence
      saveDbToFile();
      
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:update', async (_, data) => {
    try {
      // Convert camelCase to snake_case for database
      const dbData: any = { id: data.id };
      
      // Map all possible fields
      if (data.modelName !== undefined) dbData.model_name = data.modelName;
      if (data.model_name !== undefined) dbData.model_name = data.model_name;
      if (data.apiKey !== undefined) dbData.api_key = data.apiKey;
      if (data.api_key !== undefined) dbData.api_key = data.api_key;
      if (data.role !== undefined) dbData.role = data.role;
      if (data.writingStyle !== undefined) dbData.writing_style = data.writingStyle;
      if (data.writing_style !== undefined) dbData.writing_style = data.writing_style;
      if (data.wordLimit !== undefined) dbData.word_limit = data.wordLimit;
      if (data.word_limit !== undefined) dbData.word_limit = data.word_limit;
      if (data.strictness !== undefined) dbData.strictness = data.strictness;
      if (data.functionalPrompt !== undefined) dbData.functional_prompt = data.functionalPrompt;
      if (data.functional_prompt !== undefined) dbData.functional_prompt = data.functional_prompt;
      if (data.cvStylePersona !== undefined) dbData.cv_style_persona = data.cvStylePersona;
      if (data.cv_style_persona !== undefined) dbData.cv_style_persona = data.cv_style_persona;
      if (data.referenceCvId !== undefined) dbData.reference_cv_id = data.referenceCvId;
      if (data.reference_cv_id !== undefined) dbData.reference_cv_id = data.reference_cv_id;
      if (data.cvStyleCode !== undefined) dbData.cv_style_code = data.cvStyleCode;
      if (data.cv_style_code !== undefined) dbData.cv_style_code = data.cv_style_code;
      if (data.auditorSource !== undefined) dbData.auditor_source = data.auditorSource;
      if (data.auditor_source !== undefined) dbData.auditor_source = data.auditor_source;
      if (data.thinkerSource !== undefined) dbData.thinker_source = data.thinkerSource;
      if (data.thinker_source !== undefined) dbData.thinker_source = data.thinker_source;
      if (data.motivationLetterWordLimit !== undefined) dbData.motivation_letter_word_limit = data.motivationLetterWordLimit;
      if (data.motivation_letter_word_limit !== undefined) dbData.motivation_letter_word_limit = data.motivation_letter_word_limit;
      if (data.coverLetterWordLimit !== undefined) dbData.cover_letter_word_limit = data.coverLetterWordLimit;
      if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;
      if (data.status !== undefined) dbData.status = data.status;
      if (data.last_test_status !== undefined) dbData.last_test_status = data.last_test_status;
      if (data.last_test_message !== undefined) dbData.last_test_message = data.last_test_message;
      if (data.last_tested !== undefined) dbData.last_tested = data.last_tested;
      
      await runQuery('UPDATE ai_models', [dbData]);
      
      // Save to file for persistence
      saveDbToFile();
      
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM ai_models', { id });
      saveDbToFile();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}

// Helper to save database to file
function saveDbToFile() {
  try {
    const db = getDatabase();
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save db to file:', e);
  }
}
