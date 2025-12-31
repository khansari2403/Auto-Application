import axios from 'axios';
import { getAllQuery } from '../database';

/**
 * Core AI Caller: Supports Local (Ollama), Together AI, and OpenAI.
 */
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

    if (!apiKey && model.model_type !== 'local') return "Error: No active API key found.";

    let endpoint = '';
    if (model.model_type === 'local' || model.api_endpoint?.includes('localhost')) {
      endpoint = model.api_endpoint || 'http://localhost:11434/v1/chat/completions';
      apiKey = 'ollama'; 
    } else if (apiKey.startsWith('tgp_v1_') || apiKey.startsWith('tgk')) {
      endpoint = 'https://api.together.xyz/v1/chat/completions';
      if (modelName.toLowerCase().includes('qwen') && !modelName.includes('/')) modelName = 'Qwen/' + modelName;
      else if (modelName.toLowerCase().includes('llama') && !modelName.includes('/')) modelName = 'meta-llama/' + modelName;
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const messages: any[] = [{ role: 'system', content: 'You are a professional AI assistant.' }, { role: 'user', content: prompt }];
    if (fileData) messages[1].content = [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: fileData } }];

    const response = await axios.post(endpoint, { model: modelName, messages, max_tokens: 1000 }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
    return response.data.choices[0].message.content;
  } catch (err: any) {
    return "Error: " + (err.response?.data?.error?.message || err.message);
  }
}

export async function fetchModels(apiKey: string) {
  try {
    const cleanKey = apiKey.trim();
    let endpoint = cleanKey.startsWith('tgp_v1_') ? 'https://api.together.xyz/v1/models' : 'https://api.openai.com/v1/models';
    const response = await axios.get(endpoint, { headers: { 'Authorization': `Bearer ${cleanKey}` } });
    return { success: true, data: (response.data.data || response.data).map((m: any) => m.id || m.name) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
2. src/main/features/application-orchestrator.ts
import { getDatabase, runQuery, getAllQuery } from '../database';
import { checkReputation } from './ghost-job-network';
import { generateTailoredDocs } from './doc-generator';

export async function processApplication(jobId: number, userId: number, callAI: Function, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };

    if (!userConsentGiven) {
      const reputation = await checkReputation(job.company_name, job.job_title);
      if (reputation.isFlagged) {
        await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', needs_user_consent: 1 });
        return { success: true, message: 'Paused for GJN reputation' };
      }
    }

    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    if (thinker && auditor) {
      const mockOptions = { cv: true, coverLetter: true, manualReview: true };
      await generateTailoredDocs(job, thinker, auditor, mockOptions, callAI);
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