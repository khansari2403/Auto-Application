import { ipcMain } from 'electron';
import { runQuery, getAllQuery, getDatabase } from '../database';
import * as aiService from '../ai-service';
import axios from 'axios';

export function registerAIHandlers(): string[] {
  const channels = [
    'hunter:start-search',
    'ai:process-application',
    'ai:generate-tailored-docs',
    'ai:fetch-models',
    'ai:test-model',
    'ai:generate-interview-prep',
    'ai:ask-custom-question',
    'ai:smart-apply',
    'ai:continue-application',
    'ai:cancel-application'
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
            jobDescription = `Job posting content from ${jobUrl}:\n${pageData.content.substring(0, 3000)}`;
            
            // Try to extract basic info from the content
            const titleMatch = pageData.content.match(/(?:job\s*title|position)[:\s]*([^\n]+)/i);
            const companyMatch = pageData.content.match(/(?:company|employer)[:\s]*([^\n]+)/i);
            const locationMatch = pageData.content.match(/(?:location|located)[:\s]*([^\n]+)/i);
            
            // Try to parse JSON-LD data if available
            let parsedTitle = titleMatch?.[1]?.trim();
            let parsedCompany = companyMatch?.[1]?.trim();
            let parsedLocation = locationMatch?.[1]?.trim();
            
            // If content looks like JSON (from JSON-LD extraction), try to parse it
            if (pageData.strategyUsed?.includes('JSON-LD') && pageData.content.startsWith('{')) {
              try {
                const jsonData = JSON.parse(pageData.content);
                parsedTitle = jsonData.title || jsonData.jobTitle || jsonData.name || parsedTitle;
                parsedCompany = jsonData.hiringOrganization?.name || jsonData.companyName || parsedCompany;
                parsedLocation = jsonData.jobLocation?.address?.addressLocality || 
                                 jsonData.jobLocation?.name || 
                                 jsonData.location || parsedLocation;
                
                // Extract skills from JSON if available
                if (jsonData.skills || jsonData.requiredSkills) {
                  const skills = jsonData.skills || jsonData.requiredSkills;
                  importantApps = (typeof skills === 'string' ? skills.split(',') : skills)
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .slice(0, 8);
                }
              } catch (parseError) {
                console.log('Could not parse JSON-LD data:', parseError);
              }
            }
            
            jobInfo = {
              title: parsedTitle || 'Position from URL',
              company: parsedCompany || 'Company',
              location: parsedLocation || 'See job posting'
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
        questions,
        jobInfo,
        importantApps
      };
    } catch (e: any) {
      console.error('Interview prep error:', e);
      return { success: false, error: e.message };
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

  return channels;
}
