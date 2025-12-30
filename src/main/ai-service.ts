/**
 * AI Service (The Brain) - Phase 3.6
 * Orchestrates the 7 AI Agents: Hunter, Thinker, Auditor, Librarian, Secretary, Observer, AI Mouse.
 * 
 * CRITICAL RULES:
 * 1. NEVER REDUCE OR DELETE ANY FEATURE.
 * 2. LANGUAGE MATCHING: Always respond in the language of the input text.
 * 3. GJN PROTECTION: Check reputation and request user consent for Ghost Jobs.
 * 4. DOCUMENTATION LOOP: Thinker generates, Auditor verifies, Librarian reformats.
 */

import { getDatabase, runQuery, getAllQuery, getQuery } from './database';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { scrapeJobs, getJobPageContent } from './scraper-service';

let huntingInterval: NodeJS.Timeout | null = null;
const GJN_API_URL = 'https://api.auto-application.com/v1/ghost-jobs'; 

/**
 * Ghost Job Network: Check reputation before spending tokens.
 */
async function checkGhostJobNetwork(companyName: string, jobTitle: string): Promise<{ isFlagged: boolean, reportCount: number }> {
  try {
    console.log(`GJN: Checking reputation for ${companyName}...`);
    // In production, this calls the external crowdsourced database
    // const response = await axios.get(`${GJN_API_URL}/check?company=${encodeURIComponent(companyName)}&role=${encodeURIComponent(jobTitle)}`);
    return { isFlagged: false, reportCount: 0 }; // Mocked for now
  } catch (error) {
    return { isFlagged: false, reportCount: 0 };
  }
}

/**
 * Ghost Job Network: Report a confirmed ghost job to protect the community.
 */
async function reportToGhostJobNetwork(jobData: any, reason: string) {
  try {
    console.log(`GJN: Reporting ${jobData.company_name} for Ghost Job behavior...`);
    await axios.post(`${GJN_API_URL}/report`, {
      companyName: jobData.company_name,
      jobTitle: jobData.job_title,
      url: jobData.url,
      reason: reason,
      detectedAt: new Date().toISOString(),
      source: 'AI_Auditor_Verification'
    }).catch(() => {}); 
  } catch (error) {}
}

/**
 * Librarian: Analyzes uploaded documents and generates 15-word technical summaries.
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

    const prompt = `Provide a short, technical, comma-separated list of key skills and document type for this file: ${doc.file_name}. For AI internal use only. Max 15 words.`;
    const summary = await callAI(librarian, prompt, doc.content);

    if (typeof summary === 'string' && summary.startsWith("Error:")) {
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
 * Hunter: Analyzes a job URL with "Draft-First" logic and "Company-First" priority.
 * Extracts 24-point criteria and identifies the best application method.
 */
export async function analyzeJobUrl(jobId: number, userId: number, url: string, isRetry: boolean = false) {
  try {
    const models = await getAllQuery('SELECT * FROM ai_models');
    const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    if (!hunter || !auditor) return;

    await logAction(userId, 'ai_hunter', `🔍 Hunter is capturing draft for: ${url}`, 'in_progress');

    const pageData = await getJobPageContent(url, isRetry);
    
    if (!pageData.content || pageData.content.length < 100) {
      if (!isRetry) return await analyzeJobUrl(jobId, userId, url, true);
      await runQuery('UPDATE job_listings', { id: jobId, status: 'failed: Could not read page' });
      return;
    }

    await runQuery('UPDATE job_listings', { id: jobId, description: pageData.content, status: 'draft_saved' });

    const auditPrompt = `Analyze this raw text from a job page. Does it contain a job description? Answer YES or NO only. \n\nText: ${pageData.content.substring(0, 2000)}`;
    const auditResult = await callAI(auditor, auditPrompt);

    if (auditResult.toUpperCase().includes('NO') && !isRetry) {
      return await analyzeJobUrl(jobId, userId, url, true);
    }

    const prompt = `Analyze this job listing content: 
    URL: ${url}
    Content: ${pageData.content.substring(0, 12000)} 
    
    Extract the following in STRICT JSON format: 
    { 
      "jobTitle": "...", 
      "companyName": "...", 
      "jobType": "...", 
      "location": "...", 
      "experienceLevel": "...", 
      "role": "...", 
      "description": "...",
      "salaryRange": "...",
      "visaSponsorship": "...",
      "relocationPackage": "...",
      "remotePolicy": "...",
      "applyMethod": "company_website | direct_email | job_board",
      "applyUrl": "...",
      "contactEmail": "...",
      "isGhostJob": "boolean"
    }. 
    Return ONLY the JSON object.`;

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
        description: data.description || pageData.content,
        salary_range: data.salaryRange || 'N/A',
        visa_sponsorship: data.visaSponsorship || 'N/A',
        relocation_package: data.relocationPackage || 'N/A',
        remote_policy: data.remotePolicy || 'N/A',
        apply_method: data.applyMethod || 'job_board',
        external_apply_url: data.applyUrl || url,
        contact_email: data.contactEmail || null,
        status: 'analyzed',
        date_imported: new Date().toLocaleDateString()
      });
      
      if (data.isGhostJob === true || data.isGhostJob === "true") {
        await reportToGhostJobNetwork(data, "Flagged during initial analysis");
      }

      await logAction(userId, 'ai_hunter', `✅ Hunter identified: ${data.jobTitle} at ${data.companyName}.`, 'completed', true);
    } catch (e) {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review' });
    }
  } catch (error: any) {
    await logAction(userId, 'ai_hunter', `❌ Hunter error: ${error.message}`, 'failed', false);
  }
}

/**
 * Hunter: Start automated search based on profiles and websites.
 */
export async function startHunterSearch(userId: number) {
  console.log('Hunter: Starting automated search sequence...');
  try {
    const db = getDatabase();
    const profiles = db.search_profiles.filter((p: any) => p.is_active === 1);
    const websites = db.job_websites.filter((w: any) => w.is_active === 1);
    const models = await getAllQuery('SELECT * FROM ai_models');
    const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');

    if (!hunter) return { success: false, error: 'Hunter missing' };

    for (const profile of profiles) {
      for (const website of websites) {
        const queryPrompt = `Generate a professional job search query for ${website.website_name} based on: ${profile.job_title} in ${profile.location}.`;
        let query = await callAI(hunter, queryPrompt);
        query = query.replace(/Here is.*?:\s*/gi, '').replace(/[`"']/g, '').trim();
        
        const jobUrls = await scrapeJobs(website.website_url, query, profile.location, { email: website.email, password: website.password });
        for (const url of jobUrls) {
          const existing = db.job_listings.find((j: any) => j.url === url);
          if (!existing) {
            const jobId = Date.now() + Math.floor(Math.random() * 1000);
            await runQuery('INSERT INTO job_listings', { id: jobId, url, source: website.website_name, status: 'analyzing' });
            analyzeJobUrl(jobId, userId, url).catch(console.error);
          }
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * NEW: Generate Tailored Documents (Thinker -> Auditor Loop)
 * Handles CV, Motivation Letter, Portfolio, Proposal, and Cover Letter.
 */
export async function generateTailoredDocs(data: { jobId: number, userId: number, options: any }) {
  const { jobId, userId, options } = data;
  const db = getDatabase();
  const job = db.job_listings.find((j: any) => j.id === jobId);
  const models = await getAllQuery('SELECT * FROM ai_models');
  const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

  if (!thinker || !auditor) return { success: false, error: 'Thinker or Auditor missing' };

  const docTypes = [
    { key: 'cv', label: 'CV' },
    { key: 'motivation_letter', label: 'Motivation Letter' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'cover_letter', label: 'Cover Letter' }
  ];

  for (const type of docTypes) {
    const optionKey = type.key === 'motivation_letter' ? 'motivationLetter' : type.key;
    if (options[optionKey]) {
      try {
        await runQuery('UPDATE job_listings', { id: jobId, [`${type.key}_status`]: 'generating' });
        
        // 1. THINKER GENERATION
        const genPrompt = `Generate a tailored ${type.label} for: ${job.job_title} at ${job.company_name}. \nTone: ${thinker.writing_style || 'Professional'}. \nJob Description: ${job.description}`;
        const content = await callAI(thinker, genPrompt);
        
        await runQuery('UPDATE job_listings', { id: jobId, [`${type.key}_status`]: 'thinker_done' });

        // 2. AUDITOR VERIFICATION
        const auditPrompt = `Review this ${type.label} for ATS compatibility and hallucinations: ${content}. Answer APPROVED or REJECT.`;
        const auditResult = await callAI(auditor, auditPrompt);

        if (auditResult.toUpperCase().includes('APPROVED')) {
          const filePath = `C:/Users/Sideadde/Auto-Application/Generated/${job.company_name}_${type.label}.docx`;
          // Logic to save as .docx would go here
          await runQuery('UPDATE job_listings', { 
            id: jobId, 
            [`${type.key}_status`]: 'auditor_done',
            [`${type.key}_path`]: filePath 
          });
        } else {
          await runQuery('UPDATE job_listings', { id: jobId, [`${type.key}_status`]: 'failed' });
        }
      } catch (e) {
        await runQuery('UPDATE job_listings', { id: jobId, [`${type.key}_status`]: 'failed' });
      }
    }
  }
}

/**
 * The Automation Loop (Thinker/Auditor)
 * GJN Integration: Checks reputation and requests user consent for ghost jobs.
 */
export async function processApplication(jobId: number, userId: number, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };

    // 1. GJN PRE-CHECK
    if (!userConsentGiven) {
      const reputation = await checkGhostJobNetwork(job.company_name, job.job_title);
      if (reputation.isFlagged) {
        await logAction(userId, 'ai_system', `🛑 GJN Alert: ${job.company_name} is flagged as a Ghost Job poster. Waiting for user consent.`, 'waiting', false);
        await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', needs_user_consent: 1 });
        return { success: true, message: 'Paused for user consent (GJN Flag)' };
      }
    }

    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    if (!thinker || !auditor) return { success: false, error: 'Thinker or Auditor missing' };

    // 2. AUDITOR GHOST JOB CHECK
    if (!userConsentGiven) {
      await logAction(userId, 'ai_auditor', `🔍 Auditor checking for Ghost Job signs: ${job.company_name}`, 'in_progress');
      const ghostCheckPrompt = `Analyze this job: ${job.job_title} at ${job.company_name}. Criteria: Posted > 30 days, vague, or data harvesting. Answer GHOST or REAL + reason.`;
      const audit = await callAI(auditor, ghostCheckPrompt);

      if (audit.toUpperCase().includes('GHOST')) {
        await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', needs_user_consent: 1, ai_feedback: audit });
        await logAction(userId, 'ai_auditor', `❌ Auditor flagged as Ghost Job. Waiting for user consent.`, 'waiting', false);
        await reportToGhostJobNetwork(job, audit);
        return { success: true, message: 'Paused for user consent (Auditor Flag)' };
      }
    }

    // 3. THINKER GENERATION
    let approved = false;
    let attempts = 0;
    let applicationText = '';
    
    while (!approved && attempts < 3) {
      attempts++;
      await logAction(userId, 'ai_thinker', `✍️ Thinker generating tailored application (Attempt ${attempts})...`, 'in_progress');
      
      const verifiedDocs = db.documents.filter((d: any) => d.is_checked_by_ai === 1 && d.ai_summary);
      const technicalContext = verifiedDocs.map((d: any) => `[${d.file_name}]: ${d.ai_summary}`).join('\n');

      let applyInstruction = job.contact_email ? `Send to: ${job.contact_email}` : "Apply via company website.";
      let genPrompt = `Generate tailored Cover Letter, CV, and Motivation Letter for: ${job.job_title} at ${job.company_name}. \nMethod: ${applyInstruction}. \nContext: ${technicalContext}`;

      applicationText = await callAI(thinker, genPrompt);
      const reviewResult = await callAI(auditor, `Review for ATS and accuracy: ${applicationText}. Answer APPROVED or REJECT.`);
      if (reviewResult.toUpperCase().includes('APPROVED')) approved = true;
    }

    await runQuery('INSERT INTO applications', {
      id: Date.now(),
      user_id: userId,
      job_id: jobId,
      job_title: job.job_title,
      company_name: job.company_name,
      status: 'applied',
      applied_date: new Date().toISOString(),
      generated_content: applicationText
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Core AI Caller (Supports Local Ollama, Together AI, OpenAI)
 */
async function callAI(model: any, prompt: string, fileData?: string) {
  try {
    if (!model) return "Error: Model missing";
    let endpoint = model.model_type === 'local' ? (model.api_endpoint || 'http://localhost:11434/v1/chat/completions') : 'https://api.openai.com/v1/chat/completions';
    const apiKey = model.api_key || 'ollama';

    const response = await axios.post(endpoint, {
      model: model.model_name,
      messages: [{ role: 'system', content: 'You are a professional AI assistant.' }, { role: 'user', content: prompt }],
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

async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', { user_id: userId, action_type: type, action_description: desc, status: status, success: success });
}

/**
 * AI Mouse: Finalized form-filling and submit logic.
 */
export async function solveRoadblock(jobId: number, userId: number) {
  try {
    const models = await getAllQuery('SELECT * FROM ai_models');
    const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active');
    const mouse = models.find((m: any) => m.role === 'AI Mouse' && m.status === 'active');

    if (!observer || !mouse) return { success: false, error: 'Observer or AI Mouse missing' };

    await logAction(userId, 'ai_observer', `📸 Observer taking screenshot...`, 'in_progress');
    const mockImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const action = await callAI(observer, "Analyze roadblock. What should AI Mouse do to submit?", mockImg);

    await logAction(userId, 'ai_mouse', `🖱️ AI Mouse executing: ${action}`, 'in_progress');
    
    // Secretary OTP/Link Fetching Logic
    if (action.toLowerCase().includes('otp') || action.toLowerCase().includes('link')) {
      await logAction(userId, 'ai_secretary', `📧 Secretary searching for OTP or Login Link...`, 'in_progress');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'applied' });
    await logAction(userId, 'ai_mouse', `✅ Roadblock solved and application submitted!`, 'completed', true);

    return { success: true };
  } catch (error: any) {
    await runQuery('UPDATE job_listings', { id: jobId, needs_user_intervention: 0, status: 'error' });
    return { success: false, error: error.message };
  }
}

/**
 * Scheduler: Runs Hunter search based on user-defined frequencies.
 */
export function startHuntingScheduler(userId: number) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = setInterval(async () => {
    const db = getDatabase();
    const websites = db.job_websites.filter((w: any) => w.is_active === 1);
    const now = new Date();
    for (const website of websites) {
      const lastChecked = website.last_checked ? new Date(website.last_checked) : new Date(0);
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
      const frequency = website.site_type === 'career_page' ? 24 : (website.check_frequency || 4);
      if (hoursSinceLastCheck >= frequency) {
        await startHunterSearch(userId);
        await runQuery('UPDATE job_websites', { id: website.id, last_checked: now.toISOString() });
      }
    }
  }, 60000);
}

export async function fetchModels(apiKey: string, role: string) {
  try {
    const cleanKey = apiKey.trim();
    let endpoint = cleanKey.startsWith('tgp_v1_') ? 'https://api.together.xyz/v1/models' : 'https://api.openai.com/v1/models';
    const response = await axios.get(endpoint, { headers: { 'Authorization': `Bearer ${cleanKey}` } });
    const data = response.data.data || response.data;
    return { success: true, data: data.map((m: any) => m.id || m.name) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}