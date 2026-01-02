import { runQuery, getAllQuery, getDatabase } from './database';
import { ipcMain, shell, BrowserWindow } from 'electron';
import * as aiService from './ai-service';
import axios from 'axios';

export function setupIpcHandlers(): void {
  // CLEAN SLATE: Remove ALL existing handlers to prevent "second handler" error
  const channels = [
    'settings:get', 'settings:update', 'user:get-profile', 'user:update-profile',
    'user:open-linkedin', 'user:capture-linkedin', 'user:save-linkedin-profile',
    'profiles:get-all', 'profiles:save', 'profiles:update', 'profiles:delete',
    'jobs:get-all', 'jobs:delete', 'jobs:add-manual', 'jobs:update-doc-confirmation',
    'hunter:start-search', 'ai:process-application', 'ai:generate-tailored-docs',
    'ai:smart-apply', 'ai:continue-application', 'ai:cancel-application',
    'ai:fetch-models', 'ai:generate-interview-prep',
    'docs:get-all', 'docs:save', 'docs:delete', 'docs:open-file', 'docs:convert-to-pdf', 'docs:convert-all-pdf',
    'websites:get-all', 'websites:add', 'websites:delete', 'websites:toggle-active',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all',
    'scheduler:toggle', 'scheduler:get-status',
    'qa:get-all', 'qa:update', 'qa:delete'
  ];
  
  // Remove handlers first - prevents duplication on hot reload
  channels.forEach(channel => {
    try { ipcMain.removeHandler(channel); } catch (e) { /* ignore if not exists */ }
  });

  // --- SETTINGS ---
  ipcMain.handle('settings:get', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM settings');
      return { success: true, data: data[0] || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('settings:update', async (_, data) => {
    try {
      await runQuery('UPDATE settings', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- USER PROFILE ---
  ipcMain.handle('user:get-profile', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM user_profile');
      return { success: true, data: data[0] || null };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:update-profile', async (_, data) => {
    try {
      const db = getDatabase();
      // If profile exists, update it; otherwise create it
      if (db.user_profile.length > 0) {
        await runQuery('UPDATE user_profile', { ...data, id: db.user_profile[0].id });
      } else {
        await runQuery('INSERT INTO user_profile', [{ ...data, id: 1 }]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- LINKEDIN HELPERS ---
  ipcMain.handle('user:open-linkedin', async (_, url) => {
    try {
      const linkedinUrl = url || 'https://www.linkedin.com/in/';
      await shell.openExternal(linkedinUrl);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SEARCH PROFILES ---
  ipcMain.handle('profiles:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM search_profiles');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:save', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO search_profiles', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:update', async (_, data) => {
    try {
      // data can include: job_titles, industry, excluded_industries, experience_levels, certifications
      // These are stored as comma-separated strings
      await runQuery('UPDATE search_profiles', data);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('profiles:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM search_profiles', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- JOBS ---
  ipcMain.handle('jobs:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_listings');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:delete', async (_, id) => {
    try {
      const deleteId = typeof id === 'object' ? id.id : id;
      await runQuery('DELETE FROM job_listings', { id: deleteId });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:add-manual', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_listings', { 
        ...data, 
        source: 'Manual', 
        status: 'analyzing' 
      });
      // Start analysis in background
      aiService.analyzeJobUrl(result.id, data.userId, data.url).catch(console.error);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('jobs:update-doc-confirmation', async (_, data) => {
    try {
      await runQuery('UPDATE job_listings', { 
        id: data.jobId, 
        user_confirmed_docs: data.confirmed 
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- AI / HUNTER ---
  ipcMain.handle('hunter:start-search', async (_, userId) => {
    try {
      const result = await aiService.startHunterSearch(userId);
      return result;
    } catch (e: any) {
      console.error('Hunter search error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai:process-application', async (_, jobId, userId) => {
    try {
      return await aiService.processApplication(jobId, userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai:generate-tailored-docs', async (_, data) => {
    try {
      const { jobId, userId, docOptions } = data;
      const db = getDatabase();
      const job = db.job_listings?.find((j: any) => j.id === jobId);
      
      if (!job) {
        return { success: false, error: 'Job not found' };
      }
      
      // Get AI models
      const models = await getAllQuery('SELECT * FROM ai_models');
      const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
      
      if (!thinker) {
        return { success: false, error: 'No Thinker AI model configured. Go to Settings > AI Models.' };
      }
      
      // Import and call doc generator
      const DocGenerator = require('./features/doc-generator');
      await DocGenerator.generateTailoredDocs(
        job, 
        userId, 
        thinker, 
        auditor || thinker, 
        docOptions || { cv: true, motivationLetter: true, coverLetter: true },
        aiService.callAI
      );
      
      return { success: true };
    } catch (e: any) {
      console.error('Generate docs error:', e);
      return { success: false, error: e.message };
    }
  });

  // --- AI FETCH MODELS (NEW) ---
  ipcMain.handle('ai:fetch-models', async (_, data) => {
    try {
      const { provider, apiKey } = data;
      let models: string[] = [];

      if (provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 10000
        });
        models = response.data.data
          .filter((m: any) => m.id.includes('gpt'))
          .map((m: any) => m.id)
          .sort();
      } else if (provider === 'together') {
        // Together AI models
        models = [
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'meta-llama/Llama-3-70b-chat-hf',
          'meta-llama/Llama-3-8b-chat-hf',
          'togethercomputer/CodeLlama-34b-Instruct'
        ];
      } else if (provider === 'local') {
        // Try to fetch from Ollama
        try {
          const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
          models = response.data.models?.map((m: any) => m.name) || ['llama3', 'mistral', 'codellama'];
        } catch {
          models = ['llama3', 'mistral', 'codellama', 'phi3'];
        }
      }

      return { success: true, models };
    } catch (e: any) {
      console.error('Fetch models error:', e.message);
      return { success: false, error: e.message, models: [] };
    }
  });

  // --- HR AI - INTERVIEW PREP ---
  ipcMain.handle('ai:generate-interview-prep', async (_, data) => {
    try {
      const { jobUrl, userId } = data;
      
      // Get AI models
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => (m.role === 'HR AI' || m.role === 'Thinker') && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" or use an existing Thinker.' };
      }
      
      // Get user profile
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      // Scrape job info (simplified - in real implementation use Puppeteer)
      let jobInfo = {
        title: 'Position',
        company: 'Company',
        location: 'Location',
        description: ''
      };
      
      // Try to get job from database if it exists
      const jobs = await getAllQuery('SELECT * FROM job_listings');
      const existingJob = jobs.find((j: any) => j.url === jobUrl);
      if (existingJob) {
        jobInfo = {
          title: existingJob.job_title || 'Position',
          company: existingJob.company_name || 'Company',
          location: existingJob.location || 'Location',
          description: existingJob.description || ''
        };
      }
      
      // Generate interview questions using AI
      const prompt = `You are an HR AI assistant helping a candidate prepare for a job interview.

JOB INFORMATION:
Title: ${jobInfo.title}
Company: ${jobInfo.company}
Location: ${jobInfo.location}
Description: ${jobInfo.description || 'Not available - generate generic questions for this role type'}

CANDIDATE PROFILE:
Name: ${userProfile?.name || 'Candidate'}
Title: ${userProfile?.title || 'Professional'}
Skills: ${userProfile?.skills || 'Various professional skills'}
Experience: ${JSON.stringify(userProfile?.experiences || [])}

Generate a comprehensive interview preparation package with the following structure. Return ONLY valid JSON:

{
  "questions": [
    {
      "id": "q1",
      "category": "get_to_know",
      "question": "Tell me about yourself",
      "suggestedAnswer": "A tailored answer based on the candidate's profile...",
      "difficulty": "easy",
      "tips": "Focus on professional journey, not personal life"
    }
  ],
  "importantApps": ["Tool1", "Tool2"],
  "jobInfo": {
    "title": "${jobInfo.title}",
    "company": "${jobInfo.company}",
    "location": "${jobInfo.location}"
  }
}

REQUIREMENTS:
1. Generate 15-20 questions across these categories:
   - get_to_know (3-4 questions): Background, career goals, strengths/weaknesses
   - psychological (3-4 questions): Behavioral, situational, stress handling
   - aptitude (3-4 questions): Problem-solving, analytical thinking
   - culture (2-3 questions): Team fit, company values alignment
   - position_specific (4-5 questions): Technical skills, role-specific scenarios

2. For position_specific questions:
   - Identify key technologies/tools from the job description
   - List them in "importantApps" array
   - Create questions about experience with these tools

3. Each suggestedAnswer should be personalized to the candidate's profile where possible

4. Difficulty levels: "easy", "medium", "hard"

Return ONLY the JSON object, no other text.`;

      const response = await aiService.callAI(hrAI, prompt);
      
      // Parse AI response
      let parsed;
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse HR AI response:', parseError);
        // Return fallback questions
        parsed = {
          questions: [
            { id: 'q1', category: 'get_to_know', question: 'Tell me about yourself', suggestedAnswer: 'Start with your current role, then briefly mention your background and what excites you about this opportunity.', difficulty: 'easy', tips: 'Keep it under 2 minutes' },
            { id: 'q2', category: 'get_to_know', question: 'Why are you interested in this position?', suggestedAnswer: 'Connect your skills and career goals to what the role offers.', difficulty: 'easy', tips: 'Research the company beforehand' },
            { id: 'q3', category: 'psychological', question: 'Describe a challenging situation at work and how you handled it', suggestedAnswer: 'Use the STAR method: Situation, Task, Action, Result.', difficulty: 'medium', tips: 'Choose a story with a positive outcome' },
            { id: 'q4', category: 'aptitude', question: 'How do you prioritize your work when you have multiple deadlines?', suggestedAnswer: 'Explain your prioritization framework and give an example.', difficulty: 'medium', tips: 'Mention specific tools or methods you use' },
            { id: 'q5', category: 'culture', question: 'What type of work environment do you thrive in?', suggestedAnswer: 'Be honest but also show flexibility and adaptability.', difficulty: 'easy', tips: 'Align with what you know about the company culture' },
          ],
          importantApps: [],
          jobInfo: jobInfo
        };
      }
      
      return { 
        success: true, 
        questions: parsed.questions || [],
        importantApps: parsed.importantApps || [],
        jobInfo: parsed.jobInfo || jobInfo
      };
    } catch (e: any) {
      console.error('Interview prep error:', e);
      return { success: false, error: e.message };
    }
  });

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
      const result = await runQuery('INSERT INTO documents', [data]);
      return { success: true, id: result.id };
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
      const { shell } = require('electron');
      await shell.openPath(filePath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- WEBSITES ---
  ipcMain.handle('websites:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM job_websites');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO job_websites', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM job_websites', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('websites:toggle-active', async (_, data) => {
    try {
      await runQuery('UPDATE job_websites', { id: data.id, is_active: data.isActive });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- AI MODELS ---
  ipcMain.handle('ai-models:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM ai_models');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:add', async (_, data) => {
    try {
      const result = await runQuery('INSERT INTO ai_models', [data]);
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:update', async (_, data) => {
    try {
      await runQuery('UPDATE ai_models', [data]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('ai-models:delete', async (_, id) => {
    try {
      await runQuery('DELETE FROM ai_models', { id });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- LOGS ---
  ipcMain.handle('logs:get-recent-actions', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM action_logs');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- APPLICATIONS ---
  ipcMain.handle('apps:get-all', async () => {
    try {
      const data = await getAllQuery('SELECT * FROM applications');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SCHEDULER CONTROL ---
  ipcMain.handle('scheduler:toggle', async (_, enabled) => {
    try {
      const { setSchedulerEnabled } = require('./features/scheduler');
      setSchedulerEnabled(enabled);
      // Also update settings in database
      await runQuery('UPDATE settings', { job_hunting_active: enabled ? 1 : 0 });
      return { success: true, enabled };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('scheduler:get-status', async () => {
    try {
      const db = getDatabase();
      const settings = db.settings[0];
      return { 
        success: true, 
        enabled: settings?.job_hunting_active === 1 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- LINKEDIN SCRAPER ---
  ipcMain.handle('user:capture-linkedin', async (_, data) => {
    try {
      const LinkedInScraper = require('./features/linkedin-scraper');
      const { userId, profileUrl } = data || {};
      
      // First open LinkedIn for login
      if (!profileUrl) {
        return await LinkedInScraper.openLinkedInForLogin(userId || 1);
      }
      
      // Scrape profile
      return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, profileUrl);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('user:save-linkedin-profile', async (_, data) => {
    try {
      const LinkedInScraper = require('./features/linkedin-scraper');
      return await LinkedInScraper.saveLinkedInProfile(data.userId, data.profileData);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- PDF EXPORT ---
  ipcMain.handle('docs:convert-to-pdf', async (_, data) => {
    try {
      const PdfExport = require('./features/pdf-export');
      return await PdfExport.convertHtmlToPdf(data.htmlPath, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:convert-all-pdf', async (_, data) => {
    try {
      const PdfExport = require('./features/pdf-export');
      return await PdfExport.convertAllJobDocsToPdf(data.jobId, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SMART APPLICATION ---
  ipcMain.handle('ai:smart-apply', async (_, data) => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      const models = await getAllQuery('SELECT * FROM ai_models');
      const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active') ||
                       models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
      
      // Store callAI globally for smart applicant
      (global as any).callAI = aiService.callAI;
      
      return await SmartApplicant.submitApplication(data.jobId, data.userId, observer, aiService.callAI);
    } catch (e: any) {
      console.error('Smart apply error:', e);
      return { success: false, status: 'failed', error: e.message };
    }
  });

  ipcMain.handle('ai:continue-application', async (_, data) => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      return await SmartApplicant.continueApplicationWithAnswers(data.jobId, data.userId, data.answers);
    } catch (e: any) {
      return { success: false, status: 'failed', error: e.message };
    }
  });

  ipcMain.handle('ai:cancel-application', async (_, jobId) => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      await SmartApplicant.cancelApplication(jobId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- Q&A DATABASE ---
  ipcMain.handle('qa:get-all', async () => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      const data = await SmartApplicant.getAllQuestions();
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('qa:update', async (_, data) => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      return await SmartApplicant.updateQuestionAnswer(data.questionId, data.answer);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('qa:delete', async (_, questionId) => {
    try {
      const SmartApplicant = require('./features/smart-applicant');
      return await SmartApplicant.deleteQuestion(questionId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Start scheduler (but disabled by default)
  aiService.startHuntingScheduler(1);
  
  console.log('✅ IPC Handlers registered successfully');
}