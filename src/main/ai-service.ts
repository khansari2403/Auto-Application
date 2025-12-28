import { getDatabase, runQuery, getAllQuery, getQuery } from './database';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export async function processApplication(jobId: number, userId: number) {
  try {
    console.log("--- AI LOOP DEBUG START ---");
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    const profile = await getQuery('SELECT * FROM user_profile');
    const models = await getAllQuery('SELECT * FROM ai_models');
    const settings = await getQuery('SELECT * FROM settings');

    console.log(`Found ${models.length} total AI models in database.`);
    models.forEach(m => console.log(`- Member: ${m.model_name}, Role: ${m.role}, Status: ${m.status}`));

    // ROBUST ROLE MATCHING
    const thinker = models.find((m: any) => m.role?.toLowerCase().includes('thinker') && m.status === 'active');
    const auditor = models.find((m: any) => m.role?.toLowerCase().includes('auditor') && m.status === 'active');

    if (!thinker && !auditor) throw new Error("CRITICAL: Both 'Thinker' (Adam) and 'Auditor' (Eve) are missing or inactive. Please check your AI Team settings.");
    if (!thinker) throw new Error(`The 'Thinker' (Adam) is missing. I found: ${models.map(m => m.role).join(", ")}`);
    if (!auditor) throw new Error(`The 'Auditor' (Eve) is missing. I found: ${models.map(m => m.role).join(", ")}`);

    console.log(`Team Assembled: Thinker=${thinker.model_name}, Auditor=${auditor.model_name}`);

    await logAction(userId, 'ai_loop', `Starting AI Loop for ${job.job_title} at ${job.company_name}`, 'in_progress');

    // MOCK GENERATION
    let generatedCV = `Tailored CV for ${job.job_title}\n\nExperience: ${profile?.experiences || 'No experience data'}`;
    let generatedLetter = `Dear ${job.company_name} Team,\n\nI am excited to apply...`;

    const folderName = `${job.company_name}_${job.job_title}_${Date.now()}`.replace(/[^a-z0-9]/gi, '_');
    const saveDir = path.join(settings.storage_path || app.getPath('documents'), folderName);
    
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(path.join(saveDir, 'Tailored_CV.txt'), generatedCV);
    fs.writeFileSync(path.join(saveDir, 'Motivation_Letter.txt'), generatedLetter);

    await runQuery('UPDATE job_listings', { id: jobId, status: 'applied' });
    await logAction(userId, 'ai_loop', `Success! Files saved to: ${saveDir}`, 'completed', true);

    return { success: true, path: saveDir };
  } catch (error: any) {
    console.error("AI LOOP ERROR:", error.message);
    await logAction(userId, 'ai_loop', `AI Loop Failed: ${error.message}`, 'failed', false);
    return { success: false, error: error.message };
  }
}

async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', {
    user_id: userId, action_type: type, action_description: desc, status: status, success: success
  });
}