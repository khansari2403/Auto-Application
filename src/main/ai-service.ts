import { getDatabase, runQuery, getAllQuery, getQuery } from './database';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

export async function analyzeDocument(docId: number, userId: number) {
  try {
    const db = getDatabase();
    const doc = db.documents.find((d: any) => d.id === docId);
    const models = await getAllQuery('SELECT * FROM ai_models');
    const librarian = models.find((m: any) => m.role === 'Librarian' && m.status === 'active');

    if (!librarian) {
      await runQuery('UPDATE documents', { id: docId, aiStatus: 'failed: Librarian missing' });
      return;
    }

    // STEP 1: READING
    await runQuery('UPDATE documents', { id: docId, aiStatus: 'reading' });
    await logAction(userId, 'ai_librarian', `📚 Librarian is reading: ${doc.file_name}`, 'in_progress');

    // STEP 2: ANALYZING
    await runQuery('UPDATE documents', { id: docId, aiStatus: 'analyzing' });
    
    const prompt = `Analyze this document: ${doc.file_name}. Extract skills and provide a 2-sentence summary.`;
    const summary = await callAI(librarian, prompt, doc.content);

    if (summary.includes("failed")) {
      await runQuery('UPDATE documents', { id: docId, aiStatus: 'failed: API Error' });
    } else {
      // STEP 3: VERIFIED
      await runQuery('UPDATE documents', { id: docId, aiSummary: summary, aiStatus: 'verified', isCheckedByAi: 1 });
      await logAction(userId, 'ai_librarian', `✅ Librarian verified: ${doc.file_name}`, 'completed', true);
    }

  } catch (error: any) {
    await runQuery('UPDATE documents', { id: docId, aiStatus: 'failed: ' + error.message });
  }
}

async function callAI(model: any, prompt: string, fileData?: string) {
  try {
    const isImage = fileData?.startsWith('data:image');
    const messages = [{ role: 'user', content: isImage ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: fileData } }] : prompt }];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model.model_name,
      messages: messages
    }, {
      headers: { 'Authorization': `Bearer ${model.api_key}`, 'Content-Type': 'application/json' },
      timeout: 30000 // 30 second timeout
    });
    return response.data.choices[0].message.content;
  } catch (err: any) {
    return "failed";
  }
}

async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', { user_id: userId, action_type: type, action_description: desc, status: status, success: success });
}

export async function processApplication(jobId: number, userId: number) {
  // ... (Keep existing processApplication logic)
  return { success: true };
}