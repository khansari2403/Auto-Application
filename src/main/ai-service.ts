import { getDatabase, runQuery, getAllQuery, getQuery } from './database';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

/**
 * Librarian: Analyzes uploaded documents
 * Short technical description for AI use only.
 */
export async function analyzeDocument(docId: number, userId: number) {
  try {
    const db = getDatabase();
    const doc = db.documents.find((d: any) => d.id === docId);
    if (!doc) return;

    const models = await getAllQuery('SELECT * FROM ai_models');
    const librarian = models.find((m: any) => m.role === 'Librarian' && m.status === 'active');

    if (!librarian) {
      await runQuery('UPDATE documents', { id: docId, ai_status: 'failed: Librarian missing' });
      return;
    }

    await runQuery('UPDATE documents', { id: docId, ai_status: 'reading' });
    await logAction(userId, 'ai_librarian', `📚 Librarian is reading: ${doc.file_name}`, 'in_progress');

    await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
    const prompt = `Provide a short, technical, comma-separated list of key skills and document type for this file: ${doc.file_name}. For AI internal use only. Max 15 words.`;
    const summary = await callAI(librarian, prompt, doc.content);

    if (summary.startsWith("Error:")) {
      await runQuery('UPDATE documents', { id: docId, ai_status: 'failed: ' + summary });
    } else {
      await runQuery('UPDATE documents', { id: docId, ai_summary: summary, ai_status: 'verified', is_checked_by_ai: 1 });
      await logAction(userId, 'ai_librarian', `✅ Librarian verified: ${doc.file_name}`, 'completed', true);
    }
  } catch (error: any) {
    await runQuery('UPDATE documents', { id: docId, ai_status: 'failed: ' + error.message });
  }
}

/**
 * Hunter: Analyzes a job URL to extract details
 */
export async function analyzeJobUrl(jobId: number, userId: number, url: string) {
  try {
    const models = await getAllQuery('SELECT * FROM ai_models');
    const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');

    if (!hunter) {
      await logAction(userId, 'ai_hunter', '❌ Hunter missing or inactive', 'failed', false);
      return;
    }

    await logAction(userId, 'ai_hunter', `🔍 Hunter is analyzing URL: ${url}`, 'in_progress');

    let html = '';
    try {
      const response = await axios.get(url, { 
        timeout: 15000, 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        } 
      });
      html = response.data;
    } catch (e: any) {
      html = `Fetch failed: ${e.message}`;
    }

    const prompt = `Analyze this job listing URL and content: ${url}. 
    Content Snippet: ${typeof html === 'string' ? html.substring(0, 8000) : 'No content'} 
    Extract the following in STRICT JSON format: 
    { "jobTitle": "...", "companyName": "...", "jobType": "...", "location": "...", "experienceLevel": "...", "role": "...", "description": "..." }. 
    If content is missing, use the URL path to guess. Return ONLY the JSON object.`;

    const result = await callAI(hunter, prompt);
    
    try {
      const cleanedResult = result.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanedResult);
      await runQuery('UPDATE job_listings', { 
        id: jobId, 
        job_title: data.jobTitle || 'Manual Entry', 
        company_name: data.companyName || 'Manual',
        job_type: data.jobType || 'N/A',
        location: data.location || 'N/A',
        experience_level: data.experienceLevel || 'N/A',
        role: data.role || 'N/A',
        description: data.description || '',
        status: 'analyzed',
        date_imported: new Date().toLocaleDateString()
      });
      await logAction(userId, 'ai_hunter', `✅ Hunter identified: ${data.jobTitle || 'Job'} at ${data.companyName || 'Company'}`, 'completed', true);
    } catch (e) {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review', date_imported: new Date().toLocaleDateString() });
      await logAction(userId, 'ai_hunter', '⚠️ Hunter could not parse details automatically. Manual review required.', 'completed', false);
    }

  } catch (error: any) {
    await logAction(userId, 'ai_hunter', `❌ Hunter error: ${error.message}`, 'failed', false);
  }
}

/**
 * Core AI Caller: Handles API requests and auto-prefixes Together AI models
 */
async function callAI(model: any, prompt: string, fileData?: string) {
  try {
    if (!model || !model.api_key) return "Error: Missing API Key for " + (model?.role || "Unknown Role");

    const apiKey = model.api_key.trim();
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let modelName = model.model_name;

    if (apiKey.startsWith('tgp_v1_') || apiKey.startsWith('tgk')) {
      endpoint = 'https://api.together.xyz/v1/chat/completions';
      if (modelName.includes('Qwen') && !modelName.includes('/')) {
        modelName = 'Qwen/' + modelName;
      } else if (modelName.includes('Llama') && !modelName.includes('/')) {
        modelName = 'meta-llama/' + modelName;
      }
    }

    const isImage = fileData?.startsWith('data:image');
    const messages: any[] = [];
    
    const systemPrompt = 'You are a professional AI assistant. You must always respond in the same language as the input text (job description or email).';

    if (isImage) {
      messages.push({
        role: 'user',
        content: [
          { type: "text", text: systemPrompt + "\n\n" + prompt },
          { type: "image_url", image_url: { url: fileData } }
        ]
      });
    } else {
      messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
    }

    const response = await axios.post(endpoint, {
      model: modelName,
      messages: messages,
      max_tokens: model.word_limit ? parseInt(model.word_limit) : 500
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return response.data.choices[0].message.content;
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message;
    return "Error: " + errMsg;
  }
}

async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', { user_id: userId, action_type: type, action_description: desc, status: status, success: success });
}

/**
 * The Automation Loop: Thinker -> Auditor -> Generation -> Auditor Review -> Loop
 */
export async function processApplication(jobId: number, userId: number) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    if (!thinker || !auditor) return { success: false, error: 'Thinker or Auditor missing' };

    // 1. THINKER EVALUATION
    await logAction(userId, 'ai_thinker', `🤔 Thinker evaluating: ${job.job_title}`, 'in_progress');
    const evaluation = await callAI(thinker, `Evaluate job: ${job.job_title}. Fit? YES/NO + reason.`);

    if (evaluation.toUpperCase().includes('NO')) {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'rejected_by_ai', ai_feedback: evaluation });
      return { success: true, message: 'Rejected by Thinker' };
    }

    // 2. AUDITOR GHOST JOB CHECK
    await logAction(userId, 'ai_auditor', `🔍 Auditor checking for Ghost Job: ${job.company_name}`, 'in_progress');
    const audit = await callAI(auditor, `Is this a ghost job? ${job.url}. GHOST/REAL + reason.`);

    if (audit.toUpperCase().includes('GHOST')) {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job', ai_feedback: audit });
      return { success: true, message: 'Flagged as Ghost Job' };
    }

    // 3. GENERATION & REVIEW LOOP
    let approved = false;
    let attempts = 0;
    let applicationText = '';
    
    while (!approved && attempts < 3) {
      attempts++;
      await logAction(userId, 'ai_thinker', `✍️ Thinker generating tailored application (Attempt ${attempts})...`, 'in_progress');
      
      let genPrompt = `Generate a tailored Cover Letter, CV, and Motivation Letter for: ${job.job_title} at ${job.company_name}. 
      Job Description: ${job.description}. 
      Tone: ${thinker.writing_style || 'Professional'}. 
      Word Limit: ${thinker.word_limit || 300}.`;

      if (thinker.cv_style_persona === 'Mimic my CV' && thinker.reference_cv_id) {
        const refCv = db.documents.find((d: any) => d.id === parseInt(thinker.reference_cv_id));
        if (refCv) genPrompt += `\n\nReference CV Content for style mimicry: ${refCv.ai_summary}`;
      }
      
      if (thinker.cv_style_code) {
        genPrompt += `\n\nApply this CV Style Code: ${thinker.cv_style_code}`;
      }

      applicationText = await callAI(thinker, genPrompt);

      // AUDITOR REVIEW
      await logAction(userId, 'ai_auditor', `🧐 Auditor reviewing materials for accuracy and ATS compatibility...`, 'in_progress');
      const reviewPrompt = `Review this application for accuracy, hallucinations, and ATS compatibility. 
      Job: ${job.job_title}. Content: ${applicationText}. 
      Answer APPROVED or REJECT with specific reasons for improvement.`;
      
      const reviewResult = await callAI(auditor, reviewPrompt);
      
      if (reviewResult.toUpperCase().includes('APPROVED')) {
        approved = true;
        await logAction(userId, 'ai_auditor', `✅ Auditor approved materials.`, 'completed', true);
      } else {
        await logAction(userId, 'ai_auditor', `⚠️ Auditor rejected materials. Requesting regeneration...`, 'in_progress');
      }
    }

    // 4. SAVE TO INBOX
    const appId = Date.now();
    await runQuery('INSERT INTO applications', {
      id: appId,
      user_id: userId,
      job_id: jobId,
      job_title: job.job_title,
      company_name: job.company_name,
      status: 'applied',
      applied_date: new Date().toISOString(),
      generated_content: applicationText,
      secretary_feedback: 'Application generated and verified by Auditor.'
    });

    await runQuery('UPDATE job_listings', { id: jobId, status: 'applied', needs_user_intervention: 1 });
    await logAction(userId, 'ai_observer', `👀 Roadblock detected! Waiting for user permission to submit.`, 'waiting');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function solveRoadblock(jobId: number, userId: number) {
  try {
    const models = await getAllQuery('SELECT * FROM ai_models');
    const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active');
    const mouse = models.find((m: any) => m.role === 'AI Mouse' && m.status === 'active');

    if (!observer || !mouse) return { success: false, error: 'Observer or AI Mouse missing' };

    await logAction(userId, 'ai_observer', `📸 Observer taking screenshot...`, 'in_progress');
    const mockImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const action = await callAI(observer, "Analyze roadblock. What should AI Mouse do?", mockImg);

    if (action.startsWith("Error:")) {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'failed: ' + action, needs_user_intervention: 0 });
      await logAction(userId, 'ai_observer', `❌ Observer failed: ${action}`, 'failed', false);
      return { success: false, error: action };
    }

    await logAction(userId, 'ai_mouse', `🖱️ AI Mouse executing: ${action}`, 'in_progress');
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'applied' });
    await logAction(userId, 'ai_mouse', `✅ Roadblock solved!`, 'completed', true);

    return { success: true };
  } catch (error: any) {
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'error' });
    return { success: false, error: error.message };
  }
}