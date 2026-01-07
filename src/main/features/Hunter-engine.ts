import { runQuery, getDatabase, getAllQuery, logAction } from '../database';
import { scrapeJobs, getJobPageContent } from '../scraper-service';
import { reportGhostJob as reportGhostJobNetwork, isGhostJob as isGhostJobNetwork } from './ghost-job-network';
import * as CompatibilityService from './compatibility-service';

// Cancellation flag for Hunter search
let hunterCancelled = false;

// Track if hunter is currently searching
export let isSearching = false;

export function setSearchingState(state: boolean) {
  isSearching = state;
}

export function cancelHunterSearch() {
  hunterCancelled = true;
  console.log('Hunter search cancellation requested');
}

export function isHunterCancelled(): boolean {
  return hunterCancelled;
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string, hunter: any, auditor: any, callAI: Function) {
  console.log(`\n========== ANALYZING JOB ${jobId} ==========`);
  console.log(`URL: ${url}`);
  console.log(`Hunter model:`, hunter ? hunter.model_name : 'MISSING!');
  
  await logAction(userId, 'ai_hunter', `🔍 Analyzing: ${url}`, 'in_progress');
  
  // Step 1: Get page content
  console.log('Step 1: Getting page content...');
  const pageData = await getJobPageContent(url, userId, callAI);
  
  console.log(`Scraper result: strategy="${pageData.strategyUsed}", contentLength=${pageData.content.length}`);
  
  // Check if blocked or failed
  if (pageData.strategyUsed.includes('Blocked') || pageData.strategyUsed.includes('Failed')) {
    console.log('❌ Page was blocked or failed');
    await logAction(userId, 'ai_auditor', `❌ Blocked: ${url}`, 'failed', false);
    await runQuery('DELETE FROM job_listings', { id: jobId });
    return;
  }

  // Check minimum content
  if (!pageData.content || pageData.content.length < 100) {
    console.log('❌ Content too short:', pageData.content.length);
    await logAction(userId, 'ai_auditor', `❌ Empty content: ${url}`, 'failed', false);
    await runQuery('DELETE FROM job_listings', { id: jobId });
    return;
  }

  console.log('✅ Got content, first 500 chars:', pageData.content.substring(0, 500));
  await logAction(userId, 'ai_hunter', `📄 Got ${pageData.content.length} chars via ${pageData.strategyUsed}`, 'in_progress');

  // Step 2: Check if we have a valid Hunter AI model
  if (!hunter || !hunter.api_key) {
    console.log('❌ No Hunter AI model or missing API key!');
    await logAction(userId, 'ai_hunter', `❌ No Hunter AI configured!`, 'failed', false);
    
    // FALLBACK: Try to extract basic info without AI
    console.log('Attempting fallback extraction...');
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery('UPDATE job_listings', { 
        id: jobId, 
        ...fallbackData,
        status: 'analyzed', 
        date_imported: new Date().toLocaleDateString() 
      });
      console.log('✅ Saved with fallback data:', fallbackData);
    }
    return;
  }

  // Step 3: Build prompt for AI
  const isJsonLd = pageData.strategyUsed.includes('JSON-LD');
  console.log('Is JSON-LD:', isJsonLd);
  
  let prompt: string;
  if (isJsonLd) {
    prompt = `You are a job data extractor. Extract job details from this JSON-LD data.

Return ONLY a valid JSON object (no markdown, no explanation):
{"jobTitle":"exact job title","companyName":"company name","location":"city, country","jobType":"Full-time/Part-time/Contract","experienceLevel":"Junior/Mid/Senior","salaryRange":"salary or N/A","description":"2-3 sentence summary","requiredSkills":"comma separated","remoteOnsite":"Remote/Hybrid/Onsite"}

JSON-LD:
${pageData.content.substring(0, 6000)}`;
  } else {
    prompt = `You are a job data extractor. Extract job details from this job listing text.

Return ONLY a valid JSON object (no markdown, no explanation):
{"jobTitle":"exact job title","companyName":"company name","location":"city, country","jobType":"Full-time/Part-time/Contract","experienceLevel":"Junior/Mid/Senior","salaryRange":"salary or N/A","description":"2-3 sentence summary","requiredSkills":"comma separated","remoteOnsite":"Remote/Hybrid/Onsite"}

Job listing:
${pageData.content.substring(0, 6000)}`;
  }

  console.log('Step 3: Calling AI...');
  console.log('Prompt length:', prompt.length);
  
  // Step 4: Call AI
  let aiResponse: string;
  try {
    aiResponse = await callAI(hunter, prompt);
    console.log('AI Response:', aiResponse);
  } catch (aiError: any) {
    console.log('❌ AI call failed:', aiError.message);
    await logAction(userId, 'ai_hunter', `❌ AI error: ${aiError.message}`, 'failed', false);
    
    // Try fallback
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery('UPDATE job_listings', { id: jobId, ...fallbackData, status: 'analyzed', date_imported: new Date().toLocaleDateString() });
    } else {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review' });
    }
    return;
  }

  // Check for AI errors in response
  if (aiResponse.toLowerCase().includes('error:') || aiResponse.toLowerCase().includes('invalid api')) {
    console.log('❌ AI returned error:', aiResponse);
    await logAction(userId, 'ai_hunter', `❌ AI error: ${aiResponse.substring(0, 100)}`, 'failed', false);
    await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review' });
    return;
  }

  // Step 5: Parse AI response
  console.log('Step 5: Parsing AI response...');
  try {
    // Clean the response
    let cleanedResponse = aiResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/^[^{]*/, '')  // Remove anything before first {
      .replace(/[^}]*$/, '')  // Remove anything after last }
      .trim();
    
    // Try to find JSON
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ No JSON found in response');
      throw new Error('No JSON in response');
    }
    
    const data = JSON.parse(jsonMatch[0]);
    console.log('Parsed data:', data);
    
    // Validate required fields
    const jobTitle = data.jobTitle || data.title || data.job_title || '';
    const companyName = data.companyName || data.company || data.company_name || data.hiringOrganization?.name || '';
    
    if (!jobTitle || jobTitle.toLowerCase() === 'n/a' || jobTitle.toLowerCase() === 'unknown') {
      console.log('❌ Missing job title');
      await logAction(userId, 'ai_auditor', `❌ Missing job title`, 'failed', false);
      const fallbackData = extractBasicInfo(pageData.content, url);
      if (fallbackData.jobTitle) {
        await runQuery('UPDATE job_listings', { id: jobId, ...fallbackData, status: 'analyzed', date_imported: new Date().toLocaleDateString() });
      } else {
        await runQuery('DELETE FROM job_listings', { id: jobId });
      }
      return;
    }

    // Step 6: Save to database
    console.log('Step 6: Saving to database...');
    const updateData = {
      id: jobId,
      job_title: jobTitle,
      company_name: companyName || 'Unknown Company',
      location: data.location || data.jobLocation || 'N/A',
      job_type: data.jobType || data.employmentType || 'N/A',
      experience_level: data.experienceLevel || 'N/A',
      salary_range: data.salaryRange || data.salary || data.baseSalary || 'N/A',
      description: data.description || '',
      required_skills: data.requiredSkills || data.skills || 'N/A',
      remote_onsite: data.remoteOnsite || data.jobLocationType || 'N/A',
      posted_date: data.postedDate || data.datePosted || 'N/A',
      application_url: data.applicationUrl || data.url || url,
      status: 'analyzed',
      date_imported: new Date().toLocaleDateString()
    };
    
    console.log('Update data:', updateData);
    await runQuery('UPDATE job_listings', updateData);
    
    // Step 7: Calculate compatibility score (always, regardless of auto-apply setting)
    console.log('Step 7: Calculating compatibility score...');
    try {
      const compatResult = await CompatibilityService.calculateCompatibility(userId, jobId);
      console.log(`Compatibility: ${compatResult.score}% (${compatResult.level})`);
      await logAction(userId, 'ai_auditor', `📊 Match: ${compatResult.level.toUpperCase()} (${compatResult.score}%)`, 'completed', true);
      
      // Step 7b: Generate Auditor questions for uncertain requirements
      await generateAuditorQuestions(userId, jobId, updateData, compatResult);
      
    } catch (compatError: any) {
      console.log('Compatibility calculation error:', compatError.message);
    }
    
    await logAction(userId, 'ai_auditor', `✅ Extracted: ${jobTitle} at ${companyName}`, 'completed', true);
    console.log(`✅ SUCCESS: ${jobTitle} at ${companyName}`);
    
  } catch (parseError: any) {
    console.log('❌ Parse error:', parseError.message);
    await logAction(userId, 'ai_auditor', `❌ Parse failed`, 'failed', false);

    // Final fallback
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery('UPDATE job_listings', { id: jobId, ...fallbackData, status: 'analyzed', date_imported: new Date().toLocaleDateString() });
      console.log('✅ Saved with fallback:', fallbackData);
      
      // Calculate compatibility even for fallback data
      try {
        await CompatibilityService.calculateCompatibility(userId, jobId);
      } catch (e) {}
    } else {
      await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review' });
    }
  }
}

/**
 * CHECK IF JOB IS A GHOST JOB
 * Uses heuristics: age, company reputation, and description patterns.
 */
export async function isGhostJob(jobData: any, userId: number): Promise<{ isGhost: boolean, reason: string }> {
  console.log(`GJN: Checking reputation for ${jobData.company_name}...`);

  // 1. Check Age (Heuristic)
  if (jobData.posted_date && jobData.posted_date !== 'N/A') {
    try {
      const posted = new Date(jobData.posted_date);
      const now = new Date();
      const diffDays = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        return { isGhost: true, reason: "Job posted more than 30 days ago." };
      }
    } catch (e) {}
  }

  // 2. Check Company Reputation
  const db = getDatabase();
  const flaggedCompanies = (db.company_monitoring || [])
    .filter((c: any) => c.status === 'flagged')
    .map((c: any) => c.name.toLowerCase());
  
  if (flaggedCompanies.includes(jobData.company_name.toLowerCase())) {
    return { isGhost: true, reason: "Company is flagged in your monitoring list." };
  }

  // 3. Check for "Ghost" patterns in description
  const ghostKeywords = ['evergreen', 'pipeline', 'future opportunities', 'not a specific opening', 'general application'];
  const desc = (jobData.description || '').toLowerCase();
  if (ghostKeywords.some(k => desc.includes(k))) {
    return { isGhost: true, reason: "Description matches 'Evergreen/Pipeline' patterns." };
  }

  return { isGhost: false, reason: "" };
}

export async function reportGhostJobLocal(jobId: number, userId: number, reason: string) {
  console.log(`GJN: Flagging job ${jobId} as Ghost. Reason: ${reason}`);
  await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', ghost_reason: reason });
}

/**
 * FALLBACK: Extract basic info without AI
 */
function extractBasicInfo(content: string, url: string): any {
  console.log('Running fallback extraction...');
  
  const data: any = {
    application_url: url
  };
  
  // Try to extract from JSON-LD
  try {
    if (content.startsWith('{')) {
      const json = JSON.parse(content);
      data.job_title = json.title || json.jobTitle || json.name || '';
      data.company_name = json.hiringOrganization?.name || json.companyName || json.company || '';
      data.location = json.jobLocation?.address?.addressLocality || json.location || '';
      data.job_type = json.employmentType || '';
      data.description = json.description?.substring(0, 500) || '';
      console.log('Extracted from JSON:', data);
      return data;
    }
  } catch (e) {}
  
  // Try regex patterns on text
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  // Job title is often in first few lines or after specific keywords
  for (const line of lines.slice(0, 10)) {
    if (line.length > 5 && line.length < 100 && !line.includes('cookie') && !line.includes('Sign')) {
      if (!data.job_title) {
        data.job_title = line;
        break;
      }
    }
  }
  
  // Look for company name patterns
  const companyPatterns = [
    /(?:at|@|by|company[:\s]+)([A-Z][A-Za-z0-9\s&.-]+)/i,
    /([A-Z][A-Za-z0-9\s&.-]+)(?:\s+is hiring|\s+jobs)/i
  ];
  
  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      data.company_name = match[1].trim();
      break;
    }
  }
  
  // Location patterns
  const locationPatterns = [
    /(?:location|located in|based in)[:\s]+([A-Za-z\s,]+)/i,
    /(Berlin|Munich|Hamburg|Frankfurt|London|Paris|Amsterdam|Remote)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      data.location = match[1].trim();
      break;
    }
  }
  
  console.log('Fallback extracted:', data);
  return data;
}

export async function startHunterSearch(userId: number, callAI: Function) {
  console.log('\n========== STARTING HUNTER SEARCH ==========');
  
  // Reset cancellation flag at start
  hunterCancelled = false;
  
  // Set searching state
  isSearching = true;
  
  try {
    await logAction(userId, 'ai_hunter', '🚀 Starting job hunt...', 'in_progress');
    
    const db = getDatabase();
    const profiles = db.search_profiles.filter((p: any) => p.is_active === 1);
    const websites = db.job_websites.filter((w: any) => w.is_active === 1);
    const models = await getAllQuery('SELECT * FROM ai_models');
    
    console.log('Search profiles:', profiles.length);
    console.log('Job websites:', websites.length);
    console.log('AI models:', models.length);
    
    const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    console.log('Hunter:', hunter ? `${hunter.model_name} (key: ${hunter.api_key?.substring(0, 10)}...)` : 'NOT FOUND');
    console.log('Auditor:', auditor ? auditor.model_name : 'NOT FOUND (will use Hunter)');

    if (!hunter) {
      const errorMsg = 'No active Hunter AI model. Go to Settings > AI Models and add one with role "Hunter".';
      console.log('❌', errorMsg);
      await logAction(userId, 'ai_hunter', `❌ ${errorMsg}`, 'failed', false);
      isSearching = false;
      return { success: false, error: errorMsg };
    }
    
    if (profiles.length === 0) {
      const errorMsg = 'No active search profiles. Go to Search Profiles and create one.';
      console.log('❌', errorMsg);
      await logAction(userId, 'ai_hunter', `❌ ${errorMsg}`, 'failed', false);
      isSearching = false;
      return { success: false, error: errorMsg };
    }
    
    if (websites.length === 0) {
      const errorMsg = 'No active job websites. Go to Job Websites and add one.';
      console.log('❌', errorMsg);
      await logAction(userId, 'ai_hunter', `❌ ${errorMsg}`, 'failed', false);
      isSearching = false;
      return { success: false, error: errorMsg };
    }

    let totalJobsFound = 0;

    for (const profile of profiles) {
      // Check for cancellation
      if (hunterCancelled) {
        console.log('Hunter search cancelled by user');
        await logAction(userId, 'ai_hunter', `⏹️ Search cancelled. Found ${totalJobsFound} jobs before stopping.`, 'completed', true);
        isSearching = false;
        return { success: true, jobsFound: totalJobsFound, cancelled: true };
      }
      
      // Get all job titles from the profile (can be comma-separated)
      const jobTitles = (profile.job_titles || profile.job_title || '')
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
      
      if (jobTitles.length === 0) {
        console.log('No job titles found in profile, skipping');
        continue;
      }
      
      console.log(`\nProfile: ${jobTitles.join(', ')} in ${profile.location}`);
      
      // Search for EACH job title
      for (const jobTitle of jobTitles) {
        if (hunterCancelled) break;
        
        console.log(`\nSearching for job title: "${jobTitle}"`);
        await logAction(userId, 'ai_hunter', `🔍 Searching for: ${jobTitle}`, 'in_progress');
        
        for (const website of websites) {
          // Check for cancellation
          if (hunterCancelled) {
            console.log('Hunter search cancelled by user');
            await logAction(userId, 'ai_hunter', `⏹️ Search cancelled. Found ${totalJobsFound} jobs before stopping.`, 'completed', true);
            isSearching = false;
            return { success: true, jobsFound: totalJobsFound, cancelled: true };
          }
          
          console.log(`Website: ${website.website_name} (${website.website_url})`);
          
          await logAction(userId, 'ai_hunter', `🌐 Searching ${website.website_name} for "${jobTitle}"...`, 'in_progress');
          
          // Use the current job title for the search query
          const query = jobTitle;
          console.log(`Search query: "${query}"`);
          
          // Scrape job URLs - Use AI-assisted scraping for LinkedIn
          let jobUrls: string[] = [];
          const ScraperService = require('../scraper-service');
          
          if (website.website_url.includes('linkedin.com')) {
            // Try standard scraping first
            jobUrls = await scrapeJobs(
              website.website_url, 
              query, 
              profile.location || '', 
              { email: website.email, password: website.password }, 
              userId, 
              callAI
            );
          
          // If standard scraping fails, use AI-assisted approach
          if (jobUrls.length === 0 && hunter) {
            console.log('Standard LinkedIn scraping failed, trying AI-assisted approach...');
            await logAction(userId, 'ai_hunter', `🤖 Trying AI-assisted LinkedIn scraping...`, 'in_progress');
            jobUrls = await ScraperService.scrapeLinkedInJobsWithAI(
              query,
              profile.location || '',
              userId,
              callAI,
              hunter
            );
          }
        } else {
          // Standard scraping for non-LinkedIn sites
          jobUrls = await scrapeJobs(
            website.website_url, 
            query, 
            profile.location || '', 
            { email: website.email, password: website.password }, 
            userId, 
            callAI
          );
        }
        
        console.log(`Found ${jobUrls.length} URLs`);
        await logAction(userId, 'ai_hunter', `📥 Found ${jobUrls.length} jobs on ${website.website_name}`, 'completed', true);
        
        // Process each URL
        for (const url of jobUrls) {
          // Check for cancellation before each job
          if (hunterCancelled) {
            console.log('Hunter search cancelled by user');
            await logAction(userId, 'ai_hunter', `⏹️ Search cancelled. Found ${totalJobsFound} jobs before stopping.`, 'completed', true);
            return { success: true, jobsFound: totalJobsFound, cancelled: true };
          }
          
          // Skip duplicates
          const existing = db.job_listings.find((j: any) => j.url === url);
          if (existing) {
            console.log(`Skipping duplicate: ${url}`);
            continue;
          }
          
          // Create job entry
          const jobId = Date.now() + Math.floor(Math.random() * 1000);
          await runQuery('INSERT INTO job_listings', { 
            id: jobId, 
            url, 
            source: website.website_name, 
            status: 'analyzing' 
          });
          
          totalJobsFound++;
          console.log(`Added job ${jobId}: ${url}`);
          
          // Analyze immediately (wait for it to complete)
          await analyzeJobUrl(jobId, userId, url, hunter, auditor || hunter, callAI);
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      } // End of job titles loop
    }
    
    await logAction(userId, 'ai_hunter', `✅ Done! Processed ${totalJobsFound} jobs.`, 'completed', true);
    console.log(`\n========== HUNT COMPLETE: ${totalJobsFound} jobs ==========\n`);
    isSearching = false;
    return { success: true, jobsFound: totalJobsFound };
    
  } catch (error: any) { 
    console.error('Hunt error:', error);
    await logAction(userId, 'ai_hunter', `❌ Error: ${error.message}`, 'failed', false);
    isSearching = false;
    return { success: false, error: error.message }; 
  } finally {
    // Always reset searching state when done
    isSearching = false;
  }
}