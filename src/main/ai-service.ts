import { getDatabase, runQuery, getAllQuery, logAction } from './database';
import axios from 'axios';

// Import Feature Modules
import * as HunterEngine from './features/Hunter-engine';
import * as DocGenerator from './features/doc-generator';
import * as GhostJobNetwork from './features/ghost-job-network';
import * as SecretaryService from './features/secretary-service';
import { verifyWebsiteLogin as verifyLogin } from './features/login-verifier';
import { startHuntingScheduler as initScheduler } from './features/scheduler';

let huntingInterval: NodeJS.Timeout | null = null;

export async function callAI(model: any, prompt: string, fileData?: string) {
  try {
    if (!model) return "Error: Model missing";
    let apiKey = model.api_key ? model.api_key.trim() : '';
    let modelName = model.model_name;
    if (!apiKey && model.role) {
      const models = await getAllQuery('SELECT * FROM ai_models');
      const dbModel = models.find((m: any) => m.role === model.role && m.status === 'active');
      if (dbModel) {
        apiKey = dbModel.api_key.trim();
        if (!modelName || modelName === 'gpt-4o') modelName = dbModel.model_name;
      }
    }
    let endpoint = (model.model_type === 'local' || model.api_endpoint?.includes('localhost'))
      ? (model.api_endpoint || 'http://localhost:11434/v1/chat/completions')
      : 'https://api.openai.com/v1/chat/completions';
    if (apiKey.startsWith('tgp_v1_')) endpoint = 'https://api.together.xyz/v1/chat/completions';
    const response = await axios.post(endpoint, {
      model: modelName,
      messages: [{ role: 'system', content: 'Professional Assistant' }, { role: 'user', content: prompt }],
      max_tokens: 1000
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
    return response.data.choices[0].message.content;
  } catch (err: any) {
    return "Error: " + (err.response?.data?.error?.message || err.message);
  }
}

// --- MERGED APPLICATION LOGIC ---
export async function processApplication(jobId: number, userId: number, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };
    if (!userConsentGiven) {
      const reputation = await GhostJobNetwork.checkReputation(job.company_name, job.job_title);
      if (reputation.isFlagged) {
        await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', needs_user_consent: 1 });
        return { success: true, message: 'Paused for GJN reputation' };
      }
    }
    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
    if (thinker && auditor) {
      await DocGenerator.generateTailoredDocs(job, thinker, auditor, { cv: true, coverLetter: true }, callAI);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function solveRoadblock(jobId: number) {
  await runQuery('UPDATE job_listings', { id: jobId, status: 'applied' });
  return { success: true };
}

export async function startHunterSearch(userId: number) {
  return await HunterEngine.startHunterSearch(userId, callAI);
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string) {
  const models = await getAllQuery('SELECT * FROM ai_models');
  const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  return await HunterEngine.analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI);
}

export function startHuntingScheduler(userId: number) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = initScheduler(userId, startHunterSearch, callAI);
}