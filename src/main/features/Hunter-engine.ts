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

/**
 * Translate location to website's language for better search results
 * German job boards need "Deutschland" instead of "Germany", etc.
 */
function translateLocationForWebsite(location: string, websiteUrl: string): string {
  const locationLower = location.toLowerCase();
  
  // Detect website language from URL
  const isGermanSite = websiteUrl.includes('.de') || 
                      websiteUrl.includes('arbeitsagentur') || 
                      websiteUrl.includes('stepstone.de') ||
                      websiteUrl.includes('xing.de');
  
  const isFrenchSite = websiteUrl.includes('.fr');
  const isSpanishSite = websiteUrl.includes('.es');
  const isItalianSite = websiteUrl.includes('.it');
  
  // Common country translations
  const countryTranslations: Record<string, Record<string, string>> = {
    'de': { // German
      'germany': 'Deutschland',
      'berlin': 'Berlin',
      'munich': 'München',
      'cologne': 'Köln',
      'hamburg': 'Hamburg',
      'frankfurt': 'Frankfurt',
      'austria': 'Österreich',
      'switzerland': 'Schweiz',
      'europe': 'Europa'
    },
    'fr': { // French
      'france': 'France',
      'paris': 'Paris',
      'germany': 'Allemagne',
      'spain': 'Espagne',
      'italy': 'Italie',
      'europe': 'Europe'
    },
    'es': { // Spanish
      'spain': 'España',
      'madrid': 'Madrid',
      'barcelona': 'Barcelona',
      'germany': 'Alemania',
      'france': 'Francia',
      'europe': 'Europa'
    },
    'it': { // Italian
      'italy': 'Italia',
      'rome': 'Roma',
      'milan': 'Milano',
      'germany': 'Germania',
      'spain': 'Spagna',
      'france': 'Francia',
      'europe': 'Europa'
    }
  };
  
  // Apply translation based on detected language
  if (isGermanSite && countryTranslations['de'][locationLower]) {
    const translated = countryTranslations['de'][locationLower];
    console.log(`Hunter: Translating location "${location}" → "${translated}" for German site`);
    return translated;
  } else if (isFrenchSite && countryTranslations['fr'][locationLower]) {
    const translated = countryTranslations['fr'][locationLower];
    console.log(`Hunter: Translating location "${location}" → "${translated}" for French site`);
    return translated;
  } else if (isSpanishSite && countryTranslations['es'][locationLower]) {
    const translated = countryTranslations['es'][locationLower];
    console.log(`Hunter: Translating location "${location}" → "${translated}" for Spanish site`);
    return translated;
  } else if (isItalianSite && countryTranslations['it'][locationLower]) {
    const translated = countryTranslations['it'][locationLower];
    console.log(`Hunter: Translating location "${location}" → "${translated}" for Italian site`);
    return translated;
  }
  
  // Return original if no translation found
  return location;
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
 * Generate Auditor Questions for uncertain job requirements
 * Creates yes/no questions for requirements the Auditor can't verify
 */
async function generateAuditorQuestions(
  userId: number, 
  jobId: number, 
  jobData: any, 
  compatResult: any
): Promise<void> {
  try {
    const db = getDatabase();
    const existingQuestions = db.auditor_questions || [];
    const learnedCriteria = (db.auditor_criteria || []).filter((c: any) => c.user_id === userId);
    
    // Get user's profile
    const profiles = await getAllQuery('SELECT * FROM user_profile');
    const profile = profiles[0];
    
    // Parse user data
    const userLanguages = profile?.languages ? (typeof profile.languages === 'string' ? JSON.parse(profile.languages) : profile.languages) : [];
    const userLanguagesLower = userLanguages.map((l: string) => l.toLowerCase());
    
    const userSkills = profile?.skills ? (typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills) : [];
    const userSkillsLower = userSkills.map((s: string) => s.toLowerCase());
    
    const userLicenses = profile?.licenses ? (typeof profile.licenses === 'string' ? JSON.parse(profile.licenses) : profile.licenses) : [];
    const userLicensesLower = userLicenses.map((l: string) => l.toLowerCase());
    
    // Search profiles for language proficiencies
    const searchProfiles = await getAllQuery('SELECT * FROM search_profiles');
    const activeProfile = searchProfiles.find((p: any) => p.is_active === 1) || searchProfiles[0];
    let languageProficiencies: string[] = [];
    try {
      if (activeProfile?.language_proficiencies) {
        languageProficiencies = Object.keys(JSON.parse(activeProfile.language_proficiencies)).map(l => l.toLowerCase());
      }
    } catch (e) {}
    
    // Extract potential question-worthy requirements from job
    const jobDesc = (jobData.description || '').toLowerCase();
    const languages = (jobData.languages || '').toLowerCase();
    const requiredSkills = (jobData.required_skills || '').toLowerCase();
    
    const questionsToAdd: Array<{ question: string; criteria: string; category: string }> = [];
    
    // Helper to check if criteria already exists
    const criteriaExists = (criteria: string) => {
      const criteriaLower = criteria.toLowerCase();
      return learnedCriteria.some((c: any) => c.criteria.toLowerCase() === criteriaLower) ||
             existingQuestions.some((q: any) => 
               q.user_id === userId && q.criteria.toLowerCase() === criteriaLower && !q.answered
             );
    };
    
    // ========== 1. LANGUAGE QUESTIONS ==========
    const commonLanguages = ['english', 'german', 'french', 'spanish', 'italian', 'dutch', 'portuguese', 'chinese', 'japanese', 'korean', 'russian', 'arabic', 'turkish', 'polish', 'czech', 'hungarian', 'greek', 'hebrew', 'hindi', 'vietnamese', 'swedish', 'norwegian', 'danish', 'finnish'];
    
    for (const lang of commonLanguages) {
      if ((jobDesc.includes(lang) || languages.includes(lang)) &&
          !userLanguagesLower.some(l => l.includes(lang)) &&
          !languageProficiencies.some(l => l.includes(lang))) {
        
        const criteria = `speak_${lang}`;
        if (!criteriaExists(criteria)) {
          const langCapitalized = lang.charAt(0).toUpperCase() + lang.slice(1);
          questionsToAdd.push({
            question: `Do you speak ${langCapitalized}?`,
            criteria,
            category: 'language'
          });
        }
      }
    }
    
    // ========== 2. CERTIFICATION QUESTIONS ==========
    const certPatterns = [
      { pattern: /\b(pmp|project management professional)\b/i, name: 'PMP certification' },
      { pattern: /\b(scrum master|csm|psm)\b/i, name: 'Scrum Master certification' },
      { pattern: /\b(aws certified|aws certification)\b/i, name: 'AWS certification' },
      { pattern: /\b(azure certified|microsoft certified)\b/i, name: 'Azure/Microsoft certification' },
      { pattern: /\b(gcp certified|google cloud)\b/i, name: 'Google Cloud certification' },
      { pattern: /\b(cissp|security+|comptia security)\b/i, name: 'Security certification (CISSP/Security+)' },
      { pattern: /\b(cpa|certified public accountant)\b/i, name: 'CPA certification' },
      { pattern: /\b(six sigma|lean)\b/i, name: 'Six Sigma/Lean certification' },
      { pattern: /\b(itil)\b/i, name: 'ITIL certification' },
      { pattern: /\b(prince2)\b/i, name: 'PRINCE2 certification' },
      { pattern: /\b(cfa|chartered financial analyst)\b/i, name: 'CFA certification' },
      { pattern: /\b(ccna|ccnp|cisco certified)\b/i, name: 'Cisco certification (CCNA/CCNP)' },
      { pattern: /\b(oracle certified)\b/i, name: 'Oracle certification' },
      { pattern: /\b(salesforce certified)\b/i, name: 'Salesforce certification' },
      { pattern: /\b(kubernetes certified|cka|ckad)\b/i, name: 'Kubernetes certification' },
    ];
    
    for (const { pattern, name } of certPatterns) {
      if (pattern.test(jobDesc)) {
        const hasIt = userLicensesLower.some(l => pattern.test(l)) || userSkillsLower.some(s => pattern.test(s));
        if (!hasIt) {
          const criteria = `cert_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (!criteriaExists(criteria)) {
            questionsToAdd.push({
              question: `Do you have ${name}?`,
              criteria,
              category: 'certification'
            });
          }
        }
      }
    }
    
    // ========== 3. SPECIFIC TOOL/TECHNOLOGY QUESTIONS ==========
    const techPatterns = [
      { pattern: /\b(sap)\b/i, name: 'SAP', question: 'Do you have experience working with SAP?' },
      { pattern: /\b(salesforce)\b/i, name: 'Salesforce', question: 'Do you have experience with Salesforce?' },
      { pattern: /\b(jira|confluence)\b/i, name: 'Jira/Confluence', question: 'Are you experienced with Jira and Confluence?' },
      { pattern: /\b(tableau|power bi)\b/i, name: 'BI Tools', question: 'Do you have experience with Tableau or Power BI?' },
      { pattern: /\b(autocad|solidworks|catia)\b/i, name: 'CAD Software', question: 'Do you have experience with CAD software (AutoCAD, SolidWorks, etc.)?' },
      { pattern: /\b(matlab|simulink)\b/i, name: 'MATLAB', question: 'Do you have experience with MATLAB/Simulink?' },
      { pattern: /\b(blockchain|web3|smart contract)\b/i, name: 'Blockchain', question: 'Do you have experience with blockchain/Web3 development?' },
    ];
    
    for (const { pattern, name, question } of techPatterns) {
      if (pattern.test(jobDesc) || pattern.test(requiredSkills)) {
        const hasIt = userSkillsLower.some(s => pattern.test(s));
        if (!hasIt) {
          const criteria = `tool_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (!criteriaExists(criteria)) {
            questionsToAdd.push({
              question,
              criteria,
              category: 'tool'
            });
          }
        }
      }
    }
    
    // ========== 4. WORK AUTHORIZATION QUESTIONS ==========
    const workAuthPatterns = [
      { pattern: /\b(work permit|arbeitserlaubnis|visa sponsorship)\b/i, criteria: 'work_permit', question: 'Do you have a valid work permit for this location?' },
      { pattern: /\b(eu citizen|eu passport|european union citizen)\b/i, criteria: 'eu_citizen', question: 'Are you an EU citizen?' },
      { pattern: /\b(security clearance)\b/i, criteria: 'security_clearance', question: 'Do you have or can you obtain security clearance?' },
      { pattern: /\b(driver.?s? license|führerschein)\b/i, criteria: 'drivers_license', question: "Do you have a driver's license?" },
    ];
    
    for (const { pattern, criteria, question } of workAuthPatterns) {
      if (pattern.test(jobDesc)) {
        if (!criteriaExists(criteria)) {
          questionsToAdd.push({
            question,
            criteria,
            category: 'work_authorization'
          });
        }
      }
    }
    
    // ========== 5. TRAVEL/RELOCATION QUESTIONS ==========
    const travelPatterns = [
      { pattern: /\b(travel required|willingness to travel|reisebereitschaft)\b/i, criteria: 'willing_travel', question: 'Are you willing to travel for work?' },
      { pattern: /\b(relocat|umzugsbereitschaft)\b/i, criteria: 'willing_relocate', question: 'Are you willing to relocate for this position?' },
      { pattern: /\b(on.?site|onsite only|no remote)\b/i, criteria: 'onsite_ok', question: 'Are you able to work on-site at the office location?' },
    ];
    
    for (const { pattern, criteria, question } of travelPatterns) {
      if (pattern.test(jobDesc)) {
        if (!criteriaExists(criteria)) {
          questionsToAdd.push({
            question,
            criteria,
            category: 'work_preference'
          });
        }
      }
    }
    
    // Limit to max 5 new questions at a time to avoid overwhelming the user
    const questionsToInsert = questionsToAdd.slice(0, 5);
    
    // Insert questions into database
    for (const { question, criteria, category } of questionsToInsert) {
      const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await runQuery('INSERT INTO auditor_questions', {
        id: questionId,
        user_id: userId,
        job_id: jobId,
        question,
        criteria,
        category,
        answered: false,
        timestamp: Date.now()
      });
      
      console.log(`Generated Auditor question (${category}): ${question}`);
    }
    
    if (questionsToInsert.length > 0) {
      console.log(`Generated ${questionsToInsert.length} Auditor questions for job ${jobId}`);
    }
    
  } catch (e: any) {
    console.log('Error generating Auditor questions:', e.message);
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
          
          // Translate location for website's language
          const translatedLocation = translateLocationForWebsite(profile.location || '', website.website_url);
          
          // Scrape job URLs - Use AI-assisted scraping for LinkedIn
          let jobUrls: string[] = [];
          const ScraperService = require('../scraper-service');
          
          if (website.website_url.includes('linkedin.com')) {
            // Try standard scraping first
            jobUrls = await scrapeJobs(
              website.website_url, 
              query, 
              translatedLocation, 
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
              translatedLocation,
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
            translatedLocation, 
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