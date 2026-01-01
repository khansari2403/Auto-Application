import { getDatabase, runQuery, getAllQuery, logAction } from './database';
import axios from 'axios';

// Import Feature Modules
import * as HunterEngine from './features/Hunter-engine';
import * as DocGenerator from './features/doc-generator';
import * as GhostJobNetwork from './features/ghost-job-network';
import * as SecretaryService from './features/secretary-service';
import { startHuntingScheduler as initScheduler } from './features/scheduler';

let huntingInterval: NodeJS.Timeout | null = null;

export async function callAI(model: any, prompt: string, fileData?: string): Promise<string> {
  console.log('\n----- CALL AI -----');
  console.log('Model:', model?.model_name);
  console.log('Prompt length:', prompt.length);
  
  try {
    if (!model) {
      console.log('❌ No model provided');
      return "Error: No AI model provided";
    }
    
    let apiKey = model.api_key ? model.api_key.trim() : '';
    let modelName = model.model_name || 'gpt-3.5-turbo';
    
    // If no API key in model, try to find from database by role
    if (!apiKey && model.role) {
      console.log(`Looking for API key by role: ${model.role}`);
      const models = await getAllQuery('SELECT * FROM ai_models');
      const dbModel = models.find((m: any) => m.role === model.role && m.status === 'active');
      if (dbModel) {
        apiKey = dbModel.api_key?.trim() || '';
        modelName = dbModel.model_name || modelName;
        console.log(`Found model: ${modelName}, key: ${apiKey?.substring(0, 15)}...`);
      }
    }
    
    if (!apiKey) {
      console.log('❌ No API key found');
      return "Error: No API key configured. Go to Settings > AI Models and add your API key.";
    }
    
    // Determine endpoint
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    
    if (model.model_type === 'local' || model.api_endpoint?.includes('localhost')) {
      endpoint = model.api_endpoint || 'http://localhost:11434/v1/chat/completions';
    } else if (apiKey.startsWith('tgp_v1_')) {
      endpoint = 'https://api.together.xyz/v1/chat/completions';
    }
    
    console.log('Endpoint:', endpoint);
    console.log('Model name:', modelName);
    
    // Build request
    const requestBody: any = {
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts job information. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    };
    
    // Add image if provided (for vision models)
    if (fileData && modelName.includes('vision') || modelName.includes('gpt-4o')) {
      requestBody.messages[1] = {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: fileData } }
        ]
      };
    }
    
    console.log('Making API request...');
    
    const response = await axios.post(endpoint, requestBody, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 60000
    });
    
    const content = response.data.choices[0].message.content;
    console.log('AI Response (first 500 chars):', content?.substring(0, 500));
    console.log('----- END CALL AI -----\n');
    
    return content;
    
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.log('❌ AI Error:', errorMsg);
    console.log('Full error:', err.response?.data || err.message);
    return "Error: " + errorMsg;
  }
}

export async function startHunterSearch(userId: number) {
  console.log('startHunterSearch called with userId:', userId);
  return await HunterEngine.startHunterSearch(userId, callAI);
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string) {
  console.log('analyzeJobUrl called:', { jobId, userId, url });
  const models = await getAllQuery('SELECT * FROM ai_models');
  const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  return await HunterEngine.analyzeJobUrl(jobId, userId, url, hunter, auditor || hunter, callAI);
}

export async function processApplication(jobId: number, userId: number, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };
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

export function startHuntingScheduler(userId: number) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = initScheduler(userId, startHunterSearch, callAI);
}