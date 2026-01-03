import { ipcMain, shell } from 'electron';
import { runQuery, getAllQuery } from '../database';
import * as aiService from '../ai-service';

export function registerDocsHandlers(): string[] {
  const channels = [
    'docs:get-all', 
    'docs:save', 
    'docs:delete', 
    'docs:open-file', 
    'docs:convert-to-pdf', 
    'docs:convert-all-pdf',
    'docs:reprocess'
  ];

  // --- DOCUMENTS ---
  ipcMain.handle('docs:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM documents');
      return { success: true, data: data || [] };
    } catch (e: any) {
      return { success: false, error: e.message, data: [] };
    }
  });

  ipcMain.handle('docs:save', async (_, data) => {
    try {
      const docData = {
        ...data,
        ai_status: 'pending',
        created_at: new Date().toISOString()
      };
      const result = await runQuery('INSERT INTO documents', [docData]);
      
      // Trigger Librarian processing in background
      if (result?.id) {
        setTimeout(() => {
          aiService.processDocumentWithLibrarian(result.id, data.userId || 1).catch(e => 
            console.error('Background document processing failed:', e)
          );
        }, 100);
      }
      
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:reprocess', async (_, docId, userId) => {
    try {
      return await aiService.processDocumentWithLibrarian(docId, userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM documents', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:open-file', async (_, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- PDF EXPORT ---
  ipcMain.handle('docs:convert-to-pdf', async (_, data) => {
    try {
      const PdfExport = require('../features/pdf-export');
      return await PdfExport.convertHtmlToPdf(data.htmlPath, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:convert-all-pdf', async (_, data) => {
    try {
      const PdfExport = require('../features/pdf-export');
      return await PdfExport.convertAllJobDocsToPdf(data.jobId, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
