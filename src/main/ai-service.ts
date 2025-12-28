import { getDatabase, runQuery, getAllQuery, getQuery } from './database';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import axios from 'axios';

export async function processApplication(jobId: number, userId: number) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    const profile = await getQuery('SELECT * FROM user_profile');
    const models = await getAllQuery('SELECT * FROM ai_models');
    const settings = await getQuery('SELECT * FROM settings');
    const documents = await getAllQuery('SELECT * FROM documents');

    // 1. Find our Team Members
    const thinker = models.find((m: any) => m.role?.toLowerCase().includes('thinker') && m.status === 'active');
    const auditor = models.find((m: any) => m.role?.toLowerCase().includes('auditor') && m.status === 'active');

    if (!thinker || !auditor) {
      throw new Error(`Team incomplete. Thinker: ${thinker ? '✅' : '❌'}, Auditor: ${auditor ? '✅' : '❌'}`);
    }

    await logAction(userId, 'ai_loop', `🚀 Team Assembled: ${thinker.model_name} & ${auditor.model_name}`, 'in_progress');

    // 2. THE THINKER'S TASK: Generate the CV and Letter
    await logAction(userId, 'ai_thinker', `🧠 ${thinker.model_name} is researching and writing...`, 'in_progress');
    
    const thinkerPrompt = `
      Role: You are 'The Thinker'. Your task is to create a tailored CV and Motivation Letter.
      User Profile: ${JSON.stringify(profile)}
      Job Details: ${job.job_title} at ${job.company_name}
      Writing Style: ${thinker.writing_style}
      Word Limit: ${thinker.word_limit}
      Instructions: ${thinker.functional_prompt}
    `;

    // This calls the real AI API (assuming OpenAI format for now)
    const thinkerResponse = await callAI(thinker, thinkerPrompt);
    
    // 3. THE AUDITOR'S TASK: Verify for Hallucinations
    await logAction(userId, 'ai_auditor', `🧐 ${auditor.model_name} is auditing the work...`, 'in_progress');
    
    const auditorPrompt = `
      Role: You are 'The Auditor'. Check this CV/Letter for any skills or facts NOT found in the user's documents.
      User Documents: ${documents.map(d => d.ai_summary).join(", ")}
      Generated Content: ${thinkerResponse}
      Strictness: ${auditor.strictness}
    `;

    const auditResult = await callAI(auditor, auditorPrompt);

    // 4. SAVE THE FINAL RESULTS
    const folderName = `${job.company_name}_${job.job_title}_${Date.now()}`.replace(/[^a-z0-9]/gi, '_');
    const saveDir = path.join(settings.storage_path || app.getPath('documents'), folderName);
    
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(path.join(saveDir, 'Tailored_Application.txt'), thinkerResponse + "\n\n--- AUDIT REPORT ---\n" + auditResult);

    await runQuery('UPDATE job_listings', { id: jobId, status: 'applied' });
    await logAction(userId, 'ai_loop', `✅ Success! Files saved to: ${saveDir}`, 'completed', true);

    return { success: true, path: saveDir };

  } catch (error: any) {
    console.error("AI LOOP ERROR:", error.message);
    await logAction(userId, 'ai_loop', `❌ AI Loop Failed: ${error.message}`, 'failed', false);
    return { success: false, error: error.message };
  }
}

// Helper function to talk to any AI API
async function callAI(model: any, prompt: string) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model.model_name.toLowerCase().includes('gpt') ? model.model_name : 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { 'Authorization': `Bearer ${model.api_key}`, 'Content-Type': 'application/json' }
    });
    return response.data.choices[0].message.content;
  } catch (err: any) {
    throw new Error(`API Error (${model.model_name}): ${err.response?.data?.error?.message || err.message}`);
  }
}

async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', {
    user_id: userId, action_type: type, action_description: desc, status: status, success: success
  });
}