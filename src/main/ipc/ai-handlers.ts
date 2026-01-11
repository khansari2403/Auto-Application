import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import * as aiService from '../ai-service';
import axios from 'axios';

export function registerAIHandlers(): string[] {
  const channels = [
    'hunter:start-search',
    'hunter:cancel-search',
    'ai:process-application',
    'ai:generate-tailored-docs',
    'ai:fetch-models',
    'ai:test-model',
    'ai:generate-interview-prep',
    'ai:ask-custom-question',
    'ai:ask-about-cv',
    'ai:smart-apply',
    'ai:continue-application',
    'ai:cancel-application',
    'auditor:get-pending-questions',
    'auditor:get-learned-criteria',
    'auditor:save-criteria',
    'auditor:delete-criteria',
    'auditor:update-criteria',
    'auditor:add-question'
  ];

  // --- AI MODEL TEST ---
  ipcMain.handle('ai:test-model', async (_, data) => {
    try {
      const { modelName, apiKey, apiEndpoint } = data;
      
      console.log('\n===== AI MODEL TEST =====');
      console.log('Model Name:', modelName);
      console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'MISSING');
      console.log('Custom Endpoint:', apiEndpoint || 'none');
      
      if (!apiKey || apiKey.trim() === '') {
        console.log('ERROR: No API key provided');
        return { success: false, message: 'No API key provided' };
      }
      
      const trimmedKey = apiKey.trim();
      
      // Determine endpoint and provider type based on key format
      let endpoint = '';
      let provider = 'openai';
      
      // Check for custom/local endpoint first
      if (apiEndpoint && (apiEndpoint.includes('localhost') || apiEndpoint.includes('127.0.0.1'))) {
        endpoint = apiEndpoint;
        provider = 'local';
      } 
      // Check API key patterns - ORDER MATTERS (more specific first)
      else if (trimmedKey.startsWith('sk-or-')) {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        provider = 'openrouter';
      } else if (trimmedKey.startsWith('sk-ant-')) {
        endpoint = 'https://api.anthropic.com/v1/messages';
        provider = 'anthropic';
      } else if (trimmedKey.startsWith('tgp_v1_')) {
        endpoint = 'https://api.together.xyz/v1/chat/completions';
        provider = 'together';
      } else if (trimmedKey.startsWith('AIza')) {
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
        provider = 'google';
      } else if (trimmedKey.startsWith('sk-proj-') || trimmedKey.startsWith('sk-')) {
        // OpenAI - both classic and project-based keys
        endpoint = 'https://api.openai.com/v1/chat/completions';
        provider = 'openai';
      } else {
        // Unknown format - try OpenAI first as it's most common
        endpoint = 'https://api.openai.com/v1/chat/completions';
        provider = 'openai';
      }
      
      console.log('Detected Provider:', provider);
      console.log('Using Endpoint:', endpoint);
      
      // Use a safe model name for testing
      let testModelName = modelName;
      if (provider === 'openai' && (!modelName || modelName === '')) {
        testModelName = 'gpt-3.5-turbo';
      }
      
      console.log('Test Model Name:', testModelName);
      
      // Simple test prompt
      const testPrompt = 'Say OK';
      
      let response;
      
      if (provider === 'anthropic') {
        console.log('Making Anthropic API call...');
        response = await axios.post(endpoint, {
          model: testModelName || 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: testPrompt }]
        }, {
          headers: {
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      } else if (provider === 'google') {
        console.log('Making Google AI call...');
        const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${testModelName || 'gemini-pro'}:generateContent?key=${trimmedKey}`;
        response = await axios.post(googleEndpoint, {
          contents: [{ parts: [{ text: testPrompt }] }]
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
      } else if (provider === 'openrouter') {
        console.log('Making OpenRouter API call...');
        response = await axios.post(endpoint, {
          model: testModelName || 'openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 10,
          temperature: 0
        }, {
          headers: {
            'Authorization': `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://job-automation-app.local',
            'X-Title': 'Job Automation App'
          },
          timeout: 30000
        });
      } else {
        // OpenAI and compatible APIs (Together, local, etc.)
        console.log('Making OpenAI-compatible API call...');
        console.log('Request body:', JSON.stringify({
          model: testModelName || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 10
        }));
        
        response = await axios.post(endpoint, {
          model: testModelName || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 10,
          temperature: 0
        }, {
          headers: {
            'Authorization': `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
      }
      
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data).substring(0, 200));
      
      if (response.data) {
        // Check for actual response content based on provider
        let hasContent = false;
        let responseText = '';
        
        if (provider === 'google') {
          responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          hasContent = !!responseText;
        } else if (provider === 'anthropic') {
          responseText = response.data.content?.[0]?.text || '';
          hasContent = !!responseText;
        } else {
          responseText = response.data.choices?.[0]?.message?.content || '';
          hasContent = !!responseText;
        }
        
        console.log('Response text:', responseText);
        console.log('Has content:', hasContent);
        console.log('===== TEST PASSED =====\n');
        
        return { success: true, message: `✓ Model responding correctly` };
      } else {
        console.log('===== TEST FAILED: No response data =====\n');
        return { success: false, message: 'No response from model' };
      }
      
    } catch (e: any) {
      console.log('\n===== AI MODEL TEST ERROR =====');
      console.log('Error type:', e.constructor.name);
      console.log('Error message:', e.message);
      console.log('Response status:', e.response?.status);
      console.log('Response data:', JSON.stringify(e.response?.data || {}).substring(0, 500));
      console.log('================================\n');
      
      // Extract meaningful error message
      let errorMsg = 'Unknown error';
      
      if (e.response?.data?.error?.message) {
        errorMsg = e.response.data.error.message;
      } else if (e.response?.data?.message) {
        errorMsg = e.response.data.message;
      } else if (e.response?.data?.error) {
        errorMsg = typeof e.response.data.error === 'string' 
          ? e.response.data.error 
          : JSON.stringify(e.response.data.error);
      } else if (e.response?.status === 401) {
        errorMsg = 'Invalid API key - check that your key is correct and active';
      } else if (e.response?.status === 403) {
        errorMsg = 'Access forbidden - your API key may not have permission for this model';
      } else if (e.response?.status === 404) {
        errorMsg = 'Model not found - check the model name is correct';
      } else if (e.response?.status === 429) {
        errorMsg = 'Rate limited or quota exceeded - check your API plan';
      } else if (e.response?.status === 500 || e.response?.status === 502 || e.response?.status === 503) {
        errorMsg = 'API server error - try again later';
      } else if (e.code === 'ECONNREFUSED') {
        errorMsg = 'Connection refused - check endpoint URL';
      } else if (e.code === 'ETIMEDOUT' || e.code === 'ECONNABORTED') {
        errorMsg = 'Connection timeout - server not responding';
      } else if (e.code === 'ENOTFOUND') {
        errorMsg = 'Server not found - check your internet connection';
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      return { success: false, message: errorMsg };
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

  ipcMain.handle('hunter:cancel-search', async () => {
    try {
      const HunterEngine = require('../features/Hunter-engine');
      HunterEngine.cancelHunterSearch();
      return { success: true };
    } catch (e: any) {
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
      
      const models = await getAllQuery('SELECT * FROM ai_models');
      const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
      
      if (!thinker) {
        return { success: false, error: 'No Thinker AI model configured. Go to Settings > AI Models.' };
      }
      
      const DocGenerator = require('../features/doc-generator');
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

  // --- AI FETCH MODELS ---
  ipcMain.handle('ai:fetch-models', async (_, apiKey: string, role?: string) => {
    try {
      let provider = 'openrouter';
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
        try {
          const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
          });
          models = response.data.data?.map((m: any) => m.id).slice(0, 50) || [];
          
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
          models = [
            'openai/gpt-4-turbo', 'openai/gpt-4o', 'openai/gpt-4o-mini',
            'anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'anthropic/claude-3-haiku',
            'meta-llama/llama-3-70b-instruct', 'meta-llama/llama-3-8b-instruct',
            'mistralai/mixtral-8x7b-instruct', 'google/gemini-pro'
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
      
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => m.role === 'HR AI' && m.status === 'active') ||
                   models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j: any) => j.url === jobUrl);
      
      let jobContext = '';
      if (job) {
        jobContext = `
Job Title: ${job.job_title || 'Unknown'}
Company: ${job.company_name || 'Unknown'}
Requirements: ${job.required_skills || 'Not specified'}
Description: ${job.description?.substring(0, 500) || 'Not available'}`;
      } else if (jobUrl) {
        jobContext = `Job URL: ${jobUrl} (Details not yet analyzed)`;
      }
      
      let userContext = '';
      if (userProfile) {
        userContext = `
Name: ${userProfile.name || 'Not provided'}
Title: ${userProfile.title || 'Not provided'}
Skills: ${userProfile.skills || 'Not provided'}
Experience: ${userProfile.summary || 'Not provided'}`;
      }
      
      const prompt = `You are an expert HR interviewer and career coach. A job seeker has a question about interviewing.

${jobContext ? `JOB CONTEXT:\n${jobContext}` : ''}

${userContext ? `CANDIDATE PROFILE:\n${userContext}` : ''}

USER'S QUESTION: "${question}"

Provide:
1. A suggested answer (personalized if profile available)
2. Tips for delivery

Respond in this format:
ANSWER:
[Your suggested answer here]

TIPS:
[Bullet points with tips]`;

      const response = await aiService.callAI(hrAI, prompt);
      
      let answer = '';
      let tips = '';
      
      if (response.includes('ANSWER:')) {
        const parts = response.split('TIPS:');
        answer = parts[0].replace('ANSWER:', '').trim();
        tips = parts[1]?.trim() || '';
      } else {
        answer = response;
      }
      
      return { success: true, answer, tips };
    } catch (e: any) {
      console.error('Custom question error:', e);
      return { success: false, error: e.message };
    }
  });

  // --- HR AI - INTERVIEW PREP ---
  ipcMain.handle('ai:generate-interview-prep', async (_, data) => {
    try {
      const { jobUrl, userId, generateMore } = data;
      
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => m.role === 'HR AI' && m.status === 'active') ||
                   models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j: any) => j.url === jobUrl);
      
      let jobDescription = '';
      let jobInfo = null;
      let importantApps: string[] = [];
      
      if (job) {
        jobDescription = `
Job Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || 'Not specified'}
Required Skills: ${job.required_skills || 'Not specified'}
Experience Level: ${job.experience_level || 'Not specified'}
Job Type: ${job.job_type || 'Not specified'}
Description: ${job.description || 'Not available'}`;
        
        jobInfo = {
          title: job.job_title,
          company: job.company_name,
          location: job.location
        };
        
        if (job.required_skills) {
          importantApps = job.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 8);
        }
      } else if (jobUrl) {
        try {
          const ScraperService = require('../scraper-service');
          // Use getJobPageContent instead of non-existent scrapeJobPage
          const pageData = await ScraperService.getJobPageContent(jobUrl, userId, aiService.callAI);
          if (pageData && pageData.content && pageData.content.length > 100) {
            // Ensure content is a clean string (no non-serializable data)
            const cleanContent = String(pageData.content || '').substring(0, 3000);
            jobDescription = `Job posting content from ${jobUrl}:\n${cleanContent}`;
            
            // Try to extract basic info from the content
            const titleMatch = cleanContent.match(/(?:job\s*title|position)[:\s]*([^\n]+)/i);
            const companyMatch = cleanContent.match(/(?:company|employer)[:\s]*([^\n]+)/i);
            const locationMatch = cleanContent.match(/(?:location|located)[:\s]*([^\n]+)/i);
            
            // Try to parse JSON-LD data if available
            let parsedTitle = titleMatch?.[1]?.trim();
            let parsedCompany = companyMatch?.[1]?.trim();
            let parsedLocation = locationMatch?.[1]?.trim();
            
            // If content looks like JSON (from JSON-LD extraction), try to parse it
            const strategyUsed = String(pageData.strategyUsed || '');
            if (strategyUsed.includes('JSON-LD') && cleanContent.startsWith('{')) {
              try {
                const jsonData = JSON.parse(cleanContent);
                parsedTitle = jsonData.title || jsonData.jobTitle || jsonData.name || parsedTitle;
                parsedCompany = jsonData.hiringOrganization?.name || jsonData.companyName || parsedCompany;
                parsedLocation = jsonData.jobLocation?.address?.addressLocality || 
                                 jsonData.jobLocation?.name || 
                                 jsonData.location || parsedLocation;
                
                // Extract skills from JSON if available
                if (jsonData.skills || jsonData.requiredSkills) {
                  const skills = jsonData.skills || jsonData.requiredSkills;
                  importantApps = (typeof skills === 'string' ? skills.split(',') : skills)
                    .map((s: string) => String(s).trim())
                    .filter(Boolean)
                    .slice(0, 8);
                }
              } catch (parseError) {
                console.log('Could not parse JSON-LD data:', parseError);
              }
            }
            
            // Ensure jobInfo contains only serializable primitives
            jobInfo = {
              title: String(parsedTitle || 'Position from URL'),
              company: String(parsedCompany || 'Company'),
              location: String(parsedLocation || 'See job posting')
            };
          }
        } catch (e) {
          console.error('Failed to scrape job URL:', e);
          jobDescription = `Job URL: ${jobUrl} (Could not fetch details - please ensure the URL is accessible)`;
        }
      }
      
      let userContext = '';
      if (userProfile) {
        userContext = `
Candidate Background:
- Name: ${userProfile.name || 'Job Seeker'}
- Current Title: ${userProfile.title || 'Professional'}
- Skills: ${userProfile.skills || 'Various'}
- Experience Summary: ${userProfile.summary || 'Experienced professional'}`;
      }
      
      const prompt = `You are an expert HR interviewer preparing a candidate for a job interview.

${jobDescription}

${userContext}

Generate ${generateMore ? '5 MORE different' : '10'} interview questions across these categories:
- get_to_know: Personal background and career goals
- psychological: Behavioral and situational questions
- aptitude: Problem-solving and analytical skills
- culture: Values alignment and team dynamics
- position_specific: Technical skills and role requirements

For each question provide:
1. The category (one of: get_to_know, psychological, aptitude, culture, position_specific)
2. The interview question
3. A suggested answer tailored to this candidate and job
4. Difficulty level (easy, medium, hard)
5. Tips for answering

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "id": "q1",
    "category": "get_to_know",
    "question": "Tell me about yourself",
    "suggestedAnswer": "...",
    "difficulty": "easy",
    "tips": "..."
  }
]`;

      const response = await aiService.callAI(hrAI, prompt);
      
      let questions = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse interview questions:', e);
        questions = [{
          id: 'q1',
          category: 'get_to_know',
          question: 'Tell me about yourself and your background.',
          suggestedAnswer: 'I am a professional with experience in...',
          difficulty: 'easy',
          tips: 'Keep your answer focused and relevant to the position.'
        }];
      }
      
      return { 
        success: true, 
        questions: questions.map((q: any) => ({
          id: String(q.id || ''),
          category: String(q.category || 'general'),
          question: String(q.question || ''),
          suggestedAnswer: String(q.suggestedAnswer || ''),
          difficulty: String(q.difficulty || 'medium'),
          tips: String(q.tips || '')
        })),
        jobInfo: jobInfo ? {
          title: String(jobInfo.title || ''),
          company: String(jobInfo.company || ''),
          location: String(jobInfo.location || '')
        } : null,
        importantApps: importantApps.map((a: any) => String(a))
      };
    } catch (e: any) {
      console.error('Interview prep error:', e);
      return { success: false, error: String(e.message || 'Unknown error') };
    }
  });

  // --- SMART APPLICATION ---
  ipcMain.handle('ai:smart-apply', async (_, data) => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      const models = await getAllQuery('SELECT * FROM ai_models');
      const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active') ||
                       models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
      
      (global as any).callAI = aiService.callAI;
      
      return await SmartApplicant.submitApplication(data.jobId, data.userId, observer, aiService.callAI);
    } catch (e: any) {
      console.error('Smart apply error:', e);
      return { success: false, status: 'failed', error: e.message };
    }
  });

  ipcMain.handle('ai:continue-application', async (_, data) => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      return await SmartApplicant.continueApplicationWithAnswers(data.jobId, data.userId, data.answers);
    } catch (e: any) {
      return { success: false, status: 'failed', error: e.message };
    }
  });

  ipcMain.handle('ai:cancel-application', async (_, jobId) => {
    try {
      const SmartApplicant = require('../features/smart-applicant');
      await SmartApplicant.cancelApplication(jobId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- ASK ABOUT CV (HR AI grilling based on Job + CV) ---
  ipcMain.handle('ai:ask-about-cv', async (_, data) => {
    try {
      // Safely extract primitive values from data to avoid clone errors
      const jobUrl = String(data?.jobUrl || '');
      const userId = Number(data?.userId) || 1;
      const difficultyLevel = Number(data?.difficultyLevel) || 5;
      
      console.log('\n🔥 === INTERVIEW INSIDER DEBUG ===');
      console.log('Job URL:', jobUrl);
      console.log('Difficulty:', difficultyLevel);
      
      const models = await getAllQuery('SELECT * FROM ai_models');
      const hrAI = models.find((m: any) => m.role === 'HR AI' && m.status === 'active') ||
                   models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
      
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      
      console.log('HR AI Model:', hrAI.model_name);
      
      // Get user profile (CV data)
      const profiles = await getAllQuery('SELECT * FROM user_profile');
      const userProfile = profiles[0];
      
      if (!userProfile) {
        return { success: false, error: 'No profile found. Please set up your LinkedIn Profile or Manual Profile in Settings first.' };
      }
      
      console.log('User Profile Found:', userProfile.name);
      
      // 🔥 CRITICAL: GET JOB INFO - THIS IS THE KEY TO SPECIFIC QUESTIONS
      let jobContext = '';
      let jobTitle = '';
      let jobCompany = '';
      let jobRequirements = '';
      
      // Try to find job in database first
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j: any) => j.url === jobUrl);
      
      if (job) {
        console.log('✅ Job found in database:', job.job_title);
        jobTitle = String(job.job_title || 'Unknown Position');
        jobCompany = String(job.company_name || 'Unknown Company');
        jobRequirements = String(job.required_skills || job.description || '').substring(0, 2000);
        
        jobContext = `JOB TITLE: ${jobTitle}
COMPANY: ${jobCompany}
REQUIRED SKILLS/QUALIFICATIONS: ${jobRequirements}
EXPERIENCE LEVEL: ${job.experience_level || 'Not specified'}`;
        
      } else if (jobUrl && jobUrl.startsWith('http')) {
        console.log('⚠️ Job not in database, scraping from URL...');
        
        // Scrape job info
        try {
          const ScraperService = require('../scraper-service');
          const pageData = await ScraperService.getJobPageContent(jobUrl, userId, aiService.callAI);
          
          console.log('Scraper result:', pageData.strategyUsed, 'Length:', pageData.content?.length || 0);
          
          if (pageData && pageData.content && pageData.content.length > 200) {
            const cleanContent = String(pageData.content).substring(0, 3000);
            jobContext = `JOB POSTING (scraped from ${jobUrl}):\n${cleanContent}`;
            console.log('✅ Scraped job content successfully');
          } else {
            console.error('❌ Scraping failed or content too short:', pageData.content?.length);
            return { 
              success: false, 
              error: 'Could not fetch job details from URL. The page may require login or the URL is invalid. Please add the job to your Job Search first.' 
            };
          }
        } catch (scrapeError: any) {
          console.error('❌ Scraping error:', scrapeError.message);
          return { 
            success: false, 
            error: `Failed to fetch job details: ${scrapeError.message}. Please add the job to your Job Search first.` 
          };
        }
      } else {
        console.error('❌ No valid job URL provided');
        return { 
          success: false, 
          error: 'No job URL provided. Please enter a job URL or select a job from your Job Search list.' 
        };
      }
      
      // 🔥 CRITICAL CHECK: Ensure we have substantial job context
      if (!jobContext || jobContext.length < 100) {
        console.error('❌ Job context too short or empty:', jobContext.length);
        return { 
          success: false, 
          error: 'Could not extract enough information from the job posting. Please ensure the URL is correct and the page is accessible.' 
        };
      }
      
      console.log('✅ Job context length:', jobContext.length);
      console.log('First 200 chars of job context:', jobContext.substring(0, 200));
      
      // Build CV context
      let cvContext = `CANDIDATE NAME: ${userProfile.name || 'Not provided'}
CURRENT TITLE: ${userProfile.title || 'Not provided'}
LOCATION: ${userProfile.location || 'Not provided'}
PROFESSIONAL SUMMARY: ${userProfile.summary || 'Not provided'}`;
      
      // Add experiences
      try {
        const experiences = Array.isArray(userProfile.experiences) ? userProfile.experiences : JSON.parse(userProfile.experiences || '[]');
        if (experiences.length > 0) {
          cvContext += '\n\nWORK EXPERIENCE:';
          experiences.slice(0, 5).forEach((exp: any, i: number) => {
            cvContext += `\n${i + 1}. ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`;
            if (exp.description) cvContext += `: ${exp.description.substring(0, 200)}`;
          });
        }
      } catch (e) {
        console.log('Could not parse experiences:', e);
      }
      
      // Add skills
      try {
        const skills = Array.isArray(userProfile.skills) ? userProfile.skills : JSON.parse(userProfile.skills || '[]');
        if (skills.length > 0) {
          cvContext += `\n\nSKILLS: ${skills.join(', ')}`;
        }
      } catch (e) {
        console.log('Could not parse skills:', e);
      }
      
      console.log('✅ CV context length:', cvContext.length);
      
      // Determine difficulty instruction
      let difficultyInstruction = '';
      if (difficultyLevel <= 3) {
        difficultyInstruction = 'Ask EASY questions focused on motivation and basic fit.';
      } else if (difficultyLevel <= 6) {
        difficultyInstruction = 'Ask MEDIUM difficulty questions with scenario-based examples.';
      } else if (difficultyLevel <= 8) {
        difficultyInstruction = 'Ask HARD questions that probe gaps and challenge assumptions.';
      } else {
        difficultyInstruction = 'Ask EXTREME difficulty questions - stress-test the candidate.';
      }
      
      // 🔥 ULTRA-SPECIFIC PROMPT
      const prompt = `You are an expert HR interviewer. Your ONLY job is to compare the CANDIDATE'S CV against THIS SPECIFIC JOB'S REQUIREMENTS.

${difficultyInstruction}

🎯 === THE SPECIFIC JOB REQUIREMENTS ===
${jobContext}

📄 === THE CANDIDATE'S CV ===
${cvContext}

🔍 === YOUR TASK ===
Generate exactly 5 interview questions that DIRECTLY address the GAP between what THIS JOB NEEDS and what the CANDIDATE'S CV SHOWS.

**CRITICAL RULES:**
1. **EVERY question MUST mention BOTH the job requirement AND the candidate's background**
2. **FOCUS on mismatches**: If job needs X but CV shows Y, ask about it
3. **NO GENERIC questions**: Do NOT ask "tell me about yourself" or "why this role?"
4. **BE SPECIFIC**: Use actual skills/requirements from the job description
5. **FORMAT**: "This job requires [SPECIFIC REQUIREMENT FROM JOB]. Your CV shows [WHAT CV HAS]. How would you..."

**EXAMPLE OF GOOD QUESTION:**
"This job requires 3+ years of Python experience. Your CV shows primarily Java development. How would you handle the transition to Python-heavy work, and what Python projects have you worked on?"

**EXAMPLE OF BAD QUESTION (DO NOT DO THIS):**
"Tell me about your experience with programming."

Respond ONLY with a valid JSON array:
[
  {
    "question": "This job requires [X from job]. Your CV shows [Y from CV]. How would you...",
    "answer": "A strong answer would...",
    "difficulty": "easy|medium|hard"
  }
]`;

      console.log('🚀 Calling AI with prompt length:', prompt.length);
      
      const response = await aiService.callAI(hrAI, prompt);
      
      console.log('✅ AI Response received, length:', response?.length || 0);
      
      let questions: Array<{ question: string; answer: string; difficulty: string }> = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.map((q: any) => ({
            question: String(q.question || ''),
            answer: String(q.answer || ''),
            difficulty: String(q.difficulty || 'medium')
          }));
          console.log('✅ Parsed', questions.length, 'questions');
        } else {
          console.error('❌ No JSON array found in response');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse questions:', parseError);
        return {
          success: false,
          error: 'AI response could not be parsed. Please try again.'
        };
      }
      
      // Validate questions are job-specific
      const validQuestions = questions.filter(q => {
        const isGeneric = q.question.toLowerCase().includes('tell me about yourself') ||
                         q.question.toLowerCase().includes('why this role') ||
                         q.question.length < 50;
        return !isGeneric;
      });
      
      if (validQuestions.length === 0) {
        console.error('❌ All questions were too generic');
        return {
          success: false,
          error: 'AI generated generic questions. Please ensure the job URL is valid and try again.'
        };
      }
      
      console.log('✅ Returning', validQuestions.length, 'valid questions');
      
      return { 
        success: true, 
        questions: validQuestions 
      };
    } catch (e: any) {
      console.error('❌ Interview Insider error:', e);
      return { success: false, error: String(e.message || 'Unknown error occurred') };
    }
  });

  // --- AUDITOR Q&A HANDLERS ---
  
  // Get pending questions for the Auditor
  ipcMain.handle('auditor:get-pending-questions', async (_, data) => {
    try {
      const { userId } = data;
      const db = getDatabase();
      const questions = db.auditor_questions || [];
      const pending = questions.filter((q: any) => q.user_id === userId && !q.answered);
      return { success: true, questions: pending };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  // Get learned criteria
  ipcMain.handle('auditor:get-learned-criteria', async (_, data) => {
    try {
      const { userId } = data;
      const db = getDatabase();
      const criteria = db.auditor_criteria || [];
      const userCriteria = criteria.filter((c: any) => c.user_id === userId);
      return { success: true, criteria: userCriteria };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  // Save a learned criteria (from user answering a question)
  ipcMain.handle('auditor:save-criteria', async (_, data) => {
    try {
      const { userId, questionId, jobId, criteria, answer } = data;
      
      const criteriaId = `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save the criteria
      await runQuery('INSERT INTO auditor_criteria', {
        id: criteriaId,
        user_id: userId,
        criteria: criteria,
        userAnswer: answer,
        job_id: jobId,
        timestamp: Date.now()
      });
      
      // Mark the question as answered
      if (questionId) {
        await runQuery('UPDATE auditor_questions SET answered = true WHERE id = ?', [questionId]);
      }
      
      return { success: true, criteriaId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  // Delete a learned criteria
  ipcMain.handle('auditor:delete-criteria', async (_, data) => {
    try {
      const { criteriaId } = data;
      await runQuery('DELETE FROM auditor_criteria WHERE id = ?', [criteriaId]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  // Update a learned criteria answer
  ipcMain.handle('auditor:update-criteria', async (_, data) => {
    try {
      const { criteriaId, newAnswer } = data;
      const db = getDatabase();
      const criteria = db.auditor_criteria?.find((c: any) => c.id === criteriaId);
      
      if (!criteria) {
        return { success: false, error: 'Criteria not found' };
      }
      
      await runQuery('UPDATE auditor_criteria', {
        id: criteriaId,
        user_answer: newAnswer
      });
      
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
  
  // Add a question from the Auditor (called during job analysis)
  ipcMain.handle('auditor:add-question', async (_, data) => {
    try {
      const { userId, jobId, question, criteria } = data;
      
      const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await runQuery('INSERT INTO auditor_questions', {
        id: questionId,
        user_id: userId,
        job_id: jobId,
        question: question,
        criteria: criteria,
        answered: false,
        timestamp: Date.now()
      });
      
      return { success: true, questionId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
