import { runQuery, getAllQuery, getDatabase } from './database';
import { ipcMain, shell, BrowserWindow } from 'electron';
import * as aiService from './ai-service';
import * as EmailService from './features/email-service';
import * as CompatibilityService from './features/compatibility-service';
import * as SecretaryAuth from './features/secretary-auth';
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
    'ai:fetch-models', 'ai:generate-interview-prep', 'ai:ask-custom-question',
    'docs:get-all', 'docs:save', 'docs:delete', 'docs:open-file', 'docs:convert-to-pdf', 'docs:convert-all-pdf',
    'websites:get-all', 'websites:add', 'websites:delete', 'websites:toggle-active',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all',
    'scheduler:toggle', 'scheduler:get-status',
    'qa:get-all', 'qa:update', 'qa:delete',
    // New handlers
    'email:test-config', 'email:send', 'email:send-notification',
    'compatibility:calculate', 'compatibility:calculate-all', 'compatibility:get-by-level',
    'secretary:setup-pin', 'secretary:verify-pin', 'secretary:change-pin', 
    'secretary:reset-pin', 'secretary:is-pin-set', 'secretary:get-settings', 'secretary:update-permissions'
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
  ipcMain.handle('ai:fetch-models', async (_, apiKey: string, role?: string) => {
    try {
      // Detect provider from API key format
      let provider = 'openrouter'; // Default
      if (apiKey.startsWith('sk-') && apiKey.length > 50) {
        provider = 'openai';
      } else if (apiKey.startsWith('sk-ant-')) {
        provider = 'anthropic';
      }
      
      let models: string[] = [];
      let recommendations: { Speed: any[], Cost: any[], Quality: any[] } = { Speed: [], Cost: [], Quality: [] };

      if (provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 10000
        });
        models = response.data.data
          .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
          .map((m: any) => m.id)
          .sort();
        
        // OpenAI recommendations by role
        if (role === 'Hunter' || role === 'Observer') {
          recommendations = {
            Speed: [{ id: 'gpt-4o-mini', desc: 'Fast & cheap' }],
            Cost: [{ id: 'gpt-3.5-turbo', desc: 'Most affordable' }],
            Quality: [{ id: 'gpt-4o', desc: 'Best quality' }]
          };
        } else if (role === 'Thinker' || role === 'HR AI') {
          recommendations = {
            Speed: [{ id: 'gpt-4o-mini', desc: 'Quick drafts' }],
            Cost: [{ id: 'gpt-4o-mini', desc: 'Budget friendly' }],
            Quality: [{ id: 'gpt-4o', desc: 'Best writing' }, { id: 'o1-preview', desc: 'Deep reasoning' }]
          };
        } else if (role === 'Auditor') {
          recommendations = {
            Speed: [{ id: 'gpt-4o-mini', desc: 'Quick checks' }],
            Cost: [{ id: 'gpt-3.5-turbo', desc: 'Cost efficient' }],
            Quality: [{ id: 'gpt-4o', desc: 'Thorough review' }]
          };
        }
      } else if (provider === 'anthropic') {
        models = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'];
        recommendations = {
          Speed: [{ id: 'claude-3-haiku-20240307', desc: 'Fastest Claude' }],
          Cost: [{ id: 'claude-3-haiku-20240307', desc: 'Most affordable' }],
          Quality: [{ id: 'claude-3-5-sonnet-20241022', desc: 'Best quality' }, { id: 'claude-3-opus-20240229', desc: 'Most capable' }]
        };
      } else {
        // OpenRouter or other - fetch available models
        try {
          const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
          });
          models = response.data.data?.map((m: any) => m.id).slice(0, 50) || [];
          
          // OpenRouter recommendations
          recommendations = {
            Speed: [
              { id: 'mistralai/mistral-7b-instruct', desc: 'Very fast' },
              { id: 'meta-llama/llama-3-8b-instruct', desc: 'Quick & capable' }
            ],
            Cost: [
              { id: 'mistralai/mistral-7b-instruct', desc: 'Free tier' },
              { id: 'google/gemma-7b-it', desc: 'Very cheap' }
            ],
            Quality: [
              { id: 'anthropic/claude-3-opus', desc: 'Top quality' },
              { id: 'openai/gpt-4-turbo', desc: 'Excellent' },
              { id: 'meta-llama/llama-3-70b-instruct', desc: 'Great open source' }
            ]
          };
        } catch {
          // Fallback models
          models = [
            'openai/gpt-4-turbo',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'anthropic/claude-3-opus',
            'anthropic/claude-3-sonnet',
            'anthropic/claude-3-haiku',
            'meta-llama/llama-3-70b-instruct',
            'meta-llama/llama-3-8b-instruct',
            'mistralai/mixtral-8x7b-instruct',
            'google/gemini-pro'
          ];
        }
      }

      return { success: true, data: models, recommendations };
    } catch (e: any) {
      console.error('Fetch models error:', e.message);
      return { success: false, error: e.message, data: [], recommendations: { Speed: [], Cost: [], Quality: [] } };
    }
  });

  // --- HR AI - CUSTOM QUESTION ---
  ipcMain.handle('ai:ask-custom-question', async (_, data) => {
    try {
      const { question, jobUrl, userId } = data;
      
      // Get AI models - prefer HR AI role, fallback to Thinker
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => m.role === 'HR AI' && m.status === 'active') ||
                   models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      
      // Get user profile
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      // Try to get job from database if it exists
      const jobs = await getAllQuery('SELECT * FROM job_listings');
      const existingJob = jobs.find((j: any) => j.url === jobUrl);
      
      // Build context
      const jobContext = existingJob ? `
Job Title: ${existingJob.job_title || 'Not specified'}
Company: ${existingJob.company_name || 'Not specified'}
Description: ${existingJob.description || 'Not available'}
Required Skills: ${existingJob.required_skills || 'Not specified'}
` : 'No specific job context available.';

      const prompt = `You are an HR AI assistant helping a candidate prepare for an interview.

CANDIDATE PROFILE (use this for personalization):
Name: ${userProfile?.name || 'Candidate'}
Current Title: ${userProfile?.title || 'Professional'}
Skills: ${userProfile?.skills ? JSON.stringify(userProfile.skills) : 'Not specified'}
Experience: ${userProfile?.summary || 'Professional with relevant experience'}

JOB CONTEXT:
${jobContext}

The candidate is asking for help with this interview question:
"${question}"

Provide a comprehensive, personalized answer that:
1. Is tailored to the candidate's actual profile and experience
2. Uses the STAR method if it's a behavioral question
3. Is professional and confident in tone
4. Is specific but not fabricated - only reference actual skills/experience from the profile
5. For future-oriented questions (like "5-year plan"), provide realistic goals aligned with their career path

Return ONLY valid JSON in this exact format:
{
  "answer": "A detailed, personalized suggested answer (2-4 paragraphs)",
  "tips": "3-5 practical tips for answering this type of question effectively"
}

Return ONLY the JSON object, no other text.`;

      const response = await aiService.callAI(hrAI, prompt);
      
      // Parse AI response
      let parsed;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse custom question response:', parseError);
        // Provide a generic helpful response
        parsed = {
          answer: `For the question "${question}", here's a framework for your answer:\n\n1. Start by acknowledging the question and showing you've thought about it\n2. Provide specific examples from your experience\n3. Connect your answer to the role you're applying for\n4. End with a forward-looking statement\n\nRemember to be authentic and specific. Generic answers don't stand out.`,
          tips: "Be specific and use real examples. Practice your answer out loud. Keep it concise (2-3 minutes max). Show enthusiasm and self-awareness."
        };
      }
      
      return { 
        success: true, 
        answer: parsed.answer || 'Unable to generate answer',
        tips: parsed.tips || ''
      };
    } catch (e: any) {
      console.error('Custom question error:', e);
      return { success: false, error: e.message };
    }
  });

  // --- HR AI - INTERVIEW PREP ---
  ipcMain.handle('ai:generate-interview-prep', async (_, data) => {
    try {
      const { jobUrl, userId, generateMore } = data;
      
      // Get AI models - prefer HR AI role, fallback to Thinker
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => m.role === 'HR AI' && m.status === 'active') ||
                   models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      
      // Get user profile
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      // Try to get job from database first
      const jobs = await getAllQuery('SELECT * FROM job_listings');
      let existingJob = jobs.find((j: any) => j.url === jobUrl);
      
      // Build job info from actual database data or scrape the URL
      let jobInfo = {
        title: 'Position',
        company: 'Company',
        location: 'Location',
        description: '',
        required_skills: '',
        job_type: '',
        experience_level: ''
      };
      
      if (existingJob) {
        // Use existing job data from database
        jobInfo = {
          title: existingJob.job_title || 'Position',
          company: existingJob.company_name || 'Company',
          location: existingJob.location || 'Location',
          description: existingJob.description || '',
          required_skills: existingJob.required_skills || '',
          job_type: existingJob.job_type || '',
          experience_level: existingJob.experience_level || ''
        };
      } else if (jobUrl && jobUrl.trim()) {
        // Try to scrape the job URL for content
        try {
          console.log('Scraping job URL for Interview Insider:', jobUrl);
          const response = await axios.get(jobUrl, { 
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml'
            }
          });
          
          const html = response.data;
          
          // Extract text content (simple extraction)
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000); // Limit to 5000 chars
          
          // Try to extract job title from HTML
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          
          jobInfo.title = h1Match?.[1]?.trim() || titleMatch?.[1]?.split(' - ')[0]?.trim() || 'Position from URL';
          jobInfo.description = textContent;
          
          // Try to detect job type from content
          const contentLower = textContent.toLowerCase();
          if (contentLower.includes('warehouse') || contentLower.includes('forklift') || contentLower.includes('logistics')) {
            jobInfo.title = jobInfo.title || 'Warehouse Position';
          } else if (contentLower.includes('teacher') || contentLower.includes('education') || contentLower.includes('classroom')) {
            jobInfo.title = jobInfo.title || 'Teaching Position';
          } else if (contentLower.includes('nurse') || contentLower.includes('healthcare') || contentLower.includes('patient')) {
            jobInfo.title = jobInfo.title || 'Healthcare Position';
          }
          
          console.log('Scraped job info:', { title: jobInfo.title, descLength: jobInfo.description.length });
        } catch (scrapeError: any) {
          console.error('Failed to scrape job URL:', scrapeError.message);
          jobInfo.description = `Job URL: ${jobUrl} - Unable to scrape content automatically. Please generate generic questions.`;
        }
      }
      
      // Generate interview questions using AI with STRICT instructions to prevent hallucination
      const prompt = `You are an HR AI assistant helping a candidate prepare for a job interview.

CRITICAL RULES - MUST FOLLOW:
1. ONLY use information from the JOB INFORMATION section below - DO NOT invent job details
2. ONLY use information from the CANDIDATE PROFILE section - DO NOT invent candidate experiences
3. If job description is empty or minimal, generate GENERIC questions appropriate for the job title
4. For position_specific questions, ONLY reference skills mentioned in the job description OR the candidate's actual profile
5. DO NOT make up company facts, products, or services unless explicitly mentioned in the job description

JOB INFORMATION (USE ONLY THIS DATA):
Title: ${jobInfo.title}
Company: ${jobInfo.company}
Location: ${jobInfo.location}
Job Type: ${jobInfo.job_type || 'Not specified'}
Experience Level: ${jobInfo.experience_level || 'Not specified'}
Required Skills: ${jobInfo.required_skills || 'Not specified'}
Description: ${jobInfo.description || 'No description available - generate generic questions for this job title'}

CANDIDATE PROFILE (USE ONLY THIS DATA):
Name: ${userProfile?.name || 'Candidate'}
Current Title: ${userProfile?.title || 'Professional'}
Skills: ${userProfile?.skills ? JSON.stringify(userProfile.skills) : 'Not specified'}
Experience Summary: ${userProfile?.summary || 'Not specified'}

${generateMore ? 'IMPORTANT: Generate 10 NEW and DIFFERENT questions. Do not repeat common questions.' : ''}

Generate a comprehensive interview preparation package. Return ONLY valid JSON in this exact format:

{
  "questions": [
    {
      "id": "q1",
      "category": "get_to_know",
      "question": "Tell me about yourself",
      "suggestedAnswer": "A tailored answer...",
      "difficulty": "easy",
      "tips": "Focus on professional journey"
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
1. Generate ${generateMore ? '10' : '15-20'} questions across these categories:
   - get_to_know (${generateMore ? '2' : '3-4'} questions): Background, career goals, strengths/weaknesses
   - psychological (${generateMore ? '2' : '3-4'} questions): Behavioral, situational, stress handling
   - aptitude (${generateMore ? '2' : '3-4'} questions): Problem-solving, analytical thinking
   - culture (${generateMore ? '1-2' : '2-3'} questions): Team fit, company values alignment
   - position_specific (${generateMore ? '3-4' : '4-5'} questions): Technical skills based on ACTUAL job requirements

2. For position_specific questions:
   - ONLY ask about skills mentioned in "Required Skills" or the candidate's profile
   - If required_skills is "Not specified", use the candidate's actual skills from their profile
   - List relevant tools/technologies in "importantApps" - ONLY those mentioned in job or candidate profile

3. Each suggestedAnswer should:
   - Be personalized to the candidate's ACTUAL profile where possible
   - Use STAR method format for behavioral questions
   - NOT invent experiences or achievements

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
        // Return fallback questions that are GENERIC and safe
        parsed = {
          questions: [
            { id: 'q1', category: 'get_to_know', question: 'Tell me about yourself and your career journey', suggestedAnswer: 'Start with your current role, then briefly mention your relevant background and what excites you about this opportunity.', difficulty: 'easy', tips: 'Keep it under 2 minutes, focus on professional highlights' },
            { id: 'q2', category: 'get_to_know', question: 'Why are you interested in this position?', suggestedAnswer: 'Connect your skills and career goals to what the role offers. Research the company beforehand.', difficulty: 'easy', tips: 'Show you understand what the role involves' },
            { id: 'q3', category: 'psychological', question: 'Describe a challenging situation at work and how you handled it', suggestedAnswer: 'Use the STAR method: Describe the Situation, your Task, the Action you took, and the Result.', difficulty: 'medium', tips: 'Choose a story with a positive outcome' },
            { id: 'q4', category: 'aptitude', question: 'How do you prioritize your work when you have multiple deadlines?', suggestedAnswer: 'Explain your prioritization framework - urgency vs importance, and give a concrete example.', difficulty: 'medium', tips: 'Mention specific tools or methods you use' },
            { id: 'q5', category: 'culture', question: 'What type of work environment do you thrive in?', suggestedAnswer: 'Be honest about your preferences while showing flexibility and adaptability.', difficulty: 'easy', tips: 'Research the company culture beforehand' },
            { id: 'q6', category: 'position_specific', question: `What relevant experience do you have for the ${jobInfo.title} role?`, suggestedAnswer: 'Focus on your most relevant skills and experiences that match the job requirements.', difficulty: 'medium', tips: 'Quantify achievements where possible' },
          ],
          importantApps: jobInfo.required_skills ? jobInfo.required_skills.split(',').map((s: string) => s.trim()).slice(0, 5) : [],
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
      const docData = {
        ...data,
        ai_status: 'pending',
        created_at: new Date().toISOString()
      };
      const result = await runQuery('INSERT INTO documents', [docData]);
      
      // Trigger Librarian processing in background
      if (result?.id) {
        setTimeout(() => {
          aiService.processDocumentWithLibrarian(result.id, data.userId || 1).catch(e => 
            console.error('Background document processing failed:', e)
          );
        }, 100);
      }
      
      return { success: true, id: result.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('docs:reprocess', async (_, docId, userId) => {
    try {
      return await aiService.processDocumentWithLibrarian(docId, userId);
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

  // --- EMAIL SERVICE ---
  ipcMain.handle('email:test-config', async (_, data) => {
    try {
      return await EmailService.testEmailConfig(data.userId, data.testEmail);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send', async (_, data) => {
    try {
      return await EmailService.sendEmail(data.options, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send-notification', async (_, data) => {
    try {
      const result = await EmailService.sendNotification(data.userId, data.type, data.details);
      return { success: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- COMPATIBILITY SCORE ---
  ipcMain.handle('compatibility:calculate', async (_, data) => {
    try {
      const result = await CompatibilityService.calculateCompatibility(data.userId, data.jobId);
      return { success: true, ...result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:calculate-all', async (_, data) => {
    try {
      await CompatibilityService.calculateAllCompatibility(data.userId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:get-by-level', async (_, data) => {
    try {
      const jobs = await CompatibilityService.getJobsByCompatibility(data.userId, data.minLevel);
      return { success: true, data: jobs };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SECRETARY AUTHENTICATION ---
  ipcMain.handle('secretary:setup-pin', async (_, data) => {
    try {
      return await SecretaryAuth.setupSecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:verify-pin', async (_, data) => {
    try {
      return await SecretaryAuth.verifySecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:change-pin', async (_, data) => {
    try {
      return await SecretaryAuth.changeSecretaryPin(data.userId, data.currentPin, data.newPin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:reset-pin', async (_, data) => {
    try {
      return await SecretaryAuth.resetSecretaryPin(data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:is-pin-set', async (_, data) => {
    try {
      const isSet = await SecretaryAuth.isSecretaryPinSet(data.userId);
      return { success: true, isSet };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:get-settings', async (_, data) => {
    try {
      const settings = await SecretaryAuth.getSecretaryAccessSettings(data.userId);
      return { success: true, ...settings };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:update-permissions', async (_, data) => {
    try {
      return await SecretaryAuth.updateSecretaryPermissions(data.userId, data.permissions);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Start scheduler (but disabled by default - will only run when user enables)
  // Do NOT auto-start job hunting
  // aiService.startHuntingScheduler(1);
  
  console.log('✅ IPC Handlers registered successfully (scheduler disabled by default)');
}