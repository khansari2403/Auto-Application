import { runQuery, getDatabase, getAllQuery } from '../database';
import { scrapeJobs, getJobPageContent } from '../scraper-service';
import { reportGhostJob } from './ghost-job-network';

export async function startHunterSearch(userId: number, callAI: Function) {
  try {
    const db = getDatabase();
    const profiles = db.search_profiles.filter((p: any) => p.is_active === 1);
    const websites = db.job_websites.filter((w: any) => w.is_active === 1);
    const models = await getAllQuery('SELECT * FROM ai_models');
    const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
    if (!hunter) return { success: false, error: 'Hunter missing' };

    for (const profile of profiles) {
      for (const website of websites) {
        const queryPrompt = `Generate a job search query for ${website.website_name} based on: ${profile.job_title} in ${profile.location}.`;
        let query = await callAI(hunter, queryPrompt);
        query = query.replace(/Here is.*?:\s*/gi, '').replace(/[`"']/g, '').trim();
        
        const jobUrls = await scrapeJobs(website.website_url, query, profile.location, { email: website.email, password: website.password }, userId, callAI);
        for (const url of jobUrls) {
          const existing = db.job_listings.find((j: any) => j.url === url);
          if (!existing) {
            const jobId = Date.now();
            await runQuery('INSERT INTO job_listings', { id: jobId, url, source: website.website_name, status: 'analyzing' });
            analyzeJobUrl(jobId, userId, url, hunter, models.find((m: any) => m.role === 'Auditor'), callAI).catch(console.error);
          }
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string, hunter: any, auditor: any, callAI: Function, isRetry: boolean = false) {
  const pageData = await getJobPageContent(url, isRetry, userId);
  if (!pageData.content || pageData.content.length < 100) {
    if (!isRetry) return await analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI, true);
    return;
  }
  await runQuery('UPDATE job_listings', { id: jobId, description: pageData.content, status: 'draft_saved' });
  const prompt = `Analyze this job listing. Extract in STRICT JSON: { "jobTitle": "...", "companyName": "...", "location": "...", "jobType": "...", "experienceLevel": "...", "salaryRange": "...", "industry": "...", "requiredSkills": "...", "educationLevel": "...", "remoteOnsite": "...", "benefits": "...", "companySize": "...", "companyRating": "...", "deadline": "...", "certifications": "...", "languages": "...", "visaSponsorship": "...", "relocation": "...", "travelRequirement": "...", "shiftSchedule": "...", "role": "...", "postedDate": "...", "applicationUrl": "...", "isGhostJob": "boolean" }. \n\nContent: ${pageData.content.substring(0, 10000)}`;
  const result = await callAI(hunter, prompt);
  try {
    const data = JSON.parse(result.replace(/```json|```/g, '').trim());
    await runQuery('UPDATE job_listings', { id: jobId, ...data, status: 'analyzed', date_imported: new Date().toLocaleDateString() });
    if (data.isGhostJob) await reportGhostJob(data, "Flagged during analysis");
  } catch (e) {
    await runQuery('UPDATE job_listings', { id: jobId, status: 'manual_review' });
  }
}