/**
 * AI Service Orchestrator - Phase 3.6 Sequential Modular
 * Central hub that connects specialized AI modules and provides the AI "Brain".
 */

import { getDatabase, runQuery, getAllQuery, logAction } from './database';
import axios from 'axios';
import puppeteer from 'puppeteer';

// Import Feature Modules as Namespaces
import * as HunterEngine from './features/Hunter-engine';
import * as DocGenerator from './features/doc-generator';
import * as GhostJobNetwork from './features/ghost-job-network';
import * as SecretaryService from './features/secretary-service';
import * as AppOrchestrator from './features/application-orchestrator';
import { verifyWebsiteLogin as verifyLogin } from './features/login-verifier';
import { startHuntingScheduler as initScheduler } from './features/scheduler';

let huntingInterval: NodeJS.Timeout | null = null;

/**
 * Core AI Caller: Supports Local (Ollama), Together AI, and OpenAI.
 * This is the "Brain" used by all other modules.
 */
export async function callAI(model: any, prompt: string, fileData?: string) {
  try {
    if (!model) return "Error: Model missing";
    
    let apiKey = model.api_key ? model.api_key.trim() : '';
    let modelName = model.model_name;

    // Smart Fallback: If API key is missing, fetch it from the DB based on the role
    if (!apiKey && model.role) {
      const models = await getAllQuery('SELECT * FROM ai_models');
      const dbModel = models.find((m: any) => m.role === model.role && m.status === 'active');
      if (dbModel) {
        apiKey = dbModel.api_key.trim();
        if (!modelName || modelName === 'gpt-4o') modelName = dbModel.model_name;
      }
    }

    if (!apiKey && model.model_type !== 'local') {
      return `Error: No active API key found for the ${model.role || 'requested'} agent.`;
    }

    let endpoint = '';
    if (model.model_type === 'local' || model.api_endpoint?.includes('localhost')) {
      endpoint = model.api_endpoint || 'http://localhost:11434/v1/chat/completions';
      apiKey = 'ollama'; 
    } else if (apiKey.startsWith('tgp_v1_') || apiKey.startsWith('tgk')) {
      endpoint = 'https://api.together.xyz/v1/chat/completions';
      if (modelName.toLowerCase().includes('qwen') && !modelName.includes('/')) {
        modelName = 'Qwen/' + modelName;
      } else if (modelName.toLowerCase().includes('llama') && !modelName.includes('/')) {
        modelName = 'meta-llama/' + modelName;
      }
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const messages: any[] = [
      { role: 'system', content: 'You are a professional AI assistant. Always respond in the language of the input text.' },
      { role: 'user', content: prompt }
    ];

    if (fileData) {
      messages[1].content = [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: fileData } }];
    }

    const response = await axios.post(endpoint, {
      model: modelName,
      messages: messages,
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

// --- WRAPPED EXPORTS FOR IPC HANDLERS ---

export async function startHunterSearch(userId: number) {
  return await HunterEngine.startHunterSearch(userId, callAI);
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string) {
  const models = await getAllQuery('SELECT * FROM ai_models');
  const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  return await HunterEngine.analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI);
}

export async function generateTailoredDocs(data: any) {
  const db = getDatabase();
  const job = db.job_listings.find((j: any) => j.id === data.jobId);
  const models = await getAllQuery('SELECT * FROM ai_models');
  const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  return await DocGenerator.generateTailoredDocs(job, thinker, auditor, data.options, callAI);
}

export async function checkReputation(company: string, role: string) {
  return await GhostJobNetwork.checkReputation(company, role);
}

export async function fetchLatestOTP(userId: number) {
  return await SecretaryService.fetchLatestOTP(userId);
}

export async function verifyWebsiteLogin(websiteId: number, userId: number) {
  return await verifyLogin(websiteId, userId);
}

export async function processApplication(jobId: number, userId: number, userConsentGiven: boolean = false) {
  return await AppOrchestrator.processApplication(jobId, userId, callAI, userConsentGiven);
}

export async function solveRoadblock(jobId: number) {
  return await AppOrchestrator.solveRoadblock(jobId);
}

export async function analyzeDocument(docId: number, userId: number) {
  console.log(`Orchestrator: Triggering document analysis for ID ${docId}`);
}

/**
 * High-Intelligence Scheduler
 */
export function startHuntingScheduler(userId: number) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = initScheduler(userId, startHunterSearch, callAI);
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