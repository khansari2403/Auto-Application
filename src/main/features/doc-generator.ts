import { runQuery } from '../database';

export async function generateTailoredDocs(job: any, thinker: any, auditor: any, options: any, callAI: Function) {
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
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'generating' });
        const genPrompt = `Generate a tailored ${type.label} for: ${job.job_title} at ${job.company_name}. \nJob Description: ${job.description}`;
        const content = await callAI(thinker, genPrompt);
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'thinker_done' });
        const auditResult = await callAI(auditor, `Review this ${type.label}: ${content}. Answer APPROVED or REJECT.`);
        if (auditResult.toUpperCase().includes('APPROVED')) {
          await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'auditor_done' });
        } else {
          await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'failed' });
        }
      } catch (e) {
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'failed' });
      }
    }
  }
}