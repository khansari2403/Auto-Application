import { runQuery, getDatabase } from '../database';

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

export async function reportGhostJob(jobId: number, userId: number, reason: string) {
  console.log(`GJN: Flagging job ${jobId} as Ghost. Reason: ${reason}`);
  await runQuery('UPDATE job_listings', { id: jobId, status: 'ghost_job_detected', ghost_reason: reason });
}
