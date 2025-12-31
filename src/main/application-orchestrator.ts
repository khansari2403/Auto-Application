import { getDatabase, runQuery, getAllQuery } from '../database';
import { checkReputation } from './ghost-job-network';
import { generateTailoredDocs } from './doc-generator';

export async function processApplication(jobId: number, userId: number, callAI: Function, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };

    if (!userConsentGiven) {
      const reputation = await checkReputation(job.company_name, job.job_title);
      if (reputation.isFlagged) {
        await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', needs_user_consent: 1 });
        return { success: true, message: 'Paused for GJN reputation' };
      }
    }

    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');

    if (thinker && auditor) {
      const mockOptions = { cv: true, coverLetter: true, manualReview: true };
      await generateTailoredDocs(job, thinker, auditor, mockOptions, callAI);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function solveRoadblock(jobId: number) {
  await runQuery('UPDATE job_listings', { id: jobId, status: 'applied' });
  return { success: true };
}