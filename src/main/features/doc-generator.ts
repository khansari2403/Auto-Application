import { runQuery, getDatabase, logAction } from '../database';
import { getCompanyInfo } from '../scraper-service';

export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();
  const userProfile = db.user_profile.find((p: any) => p.id === userId) || db.user_profile[0];
  
  const docTypes = [
    { key: 'cv', label: 'CV' },
    { key: 'motivation_letter', label: 'Motivation Letter' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'cover_letter', label: 'Cover Letter' }
  ];

  // Step 0: Research Company
  let companyResearch = "";
  try {
    await logAction(userId, 'ai_thinker', `🔍 Researching ${job.company_name} mission and history...`, 'in_progress');
    companyResearch = await getCompanyInfo(job.company_name, userId, callAI);
  } catch (e) {
    console.error("Research failed:", e);
    companyResearch = "Research unavailable.";
  }

  for (const type of docTypes) {
    const optionKey = type.key === 'motivation_letter' ? 'motivationLetter' : type.key;
    if (options[optionKey]) {
      try {
        await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'generating' });

        let attempts = 0;
        let approved = false;
        let content = '';
        let feedback = '';

        while (attempts < 2 && !approved) {
          attempts++;
          
          const thinkerPrompt = `
            You are the "Thinker" agent. Your task is to generate a highly tailored ${type.label} that sounds 100% HUMAN with some common writing mistakes randomly.
            
            NEGATIVE PROMPT (DO NOT USE):
            - Clichés: "I am thrilled to apply", "In today's fast-paced world", "I am a passionate professional", "I believe I am a perfect fit".
            - AI Structures: Repetitive "I have..." or "My experience..." at the start of every sentence.
            - Formatting: No long hyphens (—), use standard dashes (-) if needed. No bullet points. Do not exceed more than one full page for motivation letters.
            
            STRICT 6-POINT STRUCTURE:
            1. CLEAR PURPOSE: State intent upfront. Who are you and why are you writing?
            2. RESEARCH: Reference specific facts from the company research below (Mission, History, News). Show you've done your homework.
            3. ALIGNMENT: Connect your personal goals to their mission. Why this company specifically?
            4. QUALIFICATIONS: Highlight 2-3 key achievements. Use METRICS (e.g., "increased efficiency by 20%").
            5. PASSION: Why this role? Why are you the best candidate? Convey genuine enthusiasm.
            6. CLOSING: Professional sign-off, thank the reader, and suggest next steps.
            
            LANGUAGE: Must match the Job Description language.
            CONTACT INFO: Include applicant's info at the very top.
            ATS FRIENDLY: Use clear headings no bullet points, and standard formatting. use keywoards from the job description.
            
          

            LANGUAGE REQUIREMENT:
            The output MUST be in the same language as the Job Description provided below.
            
            USER PROFILE:
            Name: ${userProfile?.name}
            Title: ${userProfile?.title}
            Experiences: ${userProfile?.experiences}
            Skills: ${userProfile?.skills}
            Contact Info: ${userProfile?.email || ''}, ${userProfile?.phone || ''}, ${userProfile?.location || ''}
            
            JOB DETAILS:
            Title: ${job.job_title}
            Company: ${job.company_name}
            Description: ${job.description}
            Required Skills: ${job.required_skills}
            
            COMPANY RESEARCH:
            ${companyResearch}
            
            ${feedback ? `PREVIOUS FEEDBACK FROM AUDITOR: ${feedback}\nPlease fix these issues in the new version.` : ''}
            
            STRICT GUIDELINES:
            1. HUMAN-LIKE CONTENT: Avoid AI-generated clichés. Do not use long hyphens (—) or repetitive word structures. Be authentic and concise.
            2. CONTACT INFO: Include the applicant's contact info at the top.
            3. ATS FRIENDLY: Use clear headings and standard formatting.
            4. MOTIVATION/COVER LETTER STRUCTURE:
               - 1. Clear Purpose: State intent upfront and introduce yourself briefly.
               - 2. Research & Specific Interest: Show you've done your homework. Reference the company's mission, history, or news from the research provided. Avoid generic statements.
               - 3. Alignment: Connect your aspirations to the organization's mission and values.
               - 4. Qualifications: Highlight key skills/experiences directly related to the role. QUANTIFY achievements with metrics (e.g., "reduced time by 30%").
               - 5. Passion: Convey genuine enthusiasm and explain why you are the best fit.
               - 6. Professional Closing: Reiterate eagerness, thank the reader, and offer next steps.
            5. 3 MAIN QUESTIONS: The letter must answer: Why this company? Why this role? Why am I the best candidate?
            6. NO PLACEHOLDERS: Do not use [Company Name] or [Date]. Use the actual data.
            
            Return ONLY the content of the ${type.label}.
          `;

          content = await callAI(thinker, thinkerPrompt);
          
          await logAction(userId, 'ai_auditor', `🧐 Auditing ${type.label} (Attempt ${attempts})`, 'in_progress');
          
          const auditorPrompt = `
            You are the "Auditor" agent. Review this ${type.label} for accuracy and quality.
            
            JOB: ${job.job_title} at ${job.company_name}
            CONTENT:
            ${content}
            
            CRITERIA:
            1. LANGUAGE: Is it in the same language as the job description?
            2. HUMAN-LIKE: Does it avoid AI clichés and long hyphens?
            3. CONTACT INFO: Is the applicant's contact info at the top?
            4. ATS FRIENDLY: Is the structure clear?
            5. RESEARCH: Does it reference specific company mission/history/news from the research?
            6. 3 QUESTIONS: Does it answer Why Company, Why Role, and Why Candidate?
            7. STRUCTURE: Does it follow the 6-point structure (Purpose, Research, Alignment, Qualifications, Passion, Closing)?
            8. QUANTIFIED: Are achievements quantified with metrics?
            9. NO PLACEHOLDERS: Are there any "[Insert...]" or "XYZ"?
            
            If it passes all criteria, respond with "APPROVED".
            If it fails, respond with "REJECTED: " followed by specific feedback on what to fix.
          `;

          const auditResponse = await callAI(auditor, auditorPrompt);
          
          if (auditResponse.toUpperCase().includes('APPROVED')) {
            approved = true;
            await logAction(userId, 'ai_auditor', `✅ ${type.label} approved`, 'completed', true);
          } else {
            feedback = auditResponse.replace(/REJECTED:/i, '').trim();
            await logAction(userId, 'ai_auditor', `❌ ${type.label} rejected: ${feedback}`, 'in_progress', false);
          }
        }

        if (approved) {
          // Save to documents table
          const docId = Date.now() + Math.floor(Math.random() * 1000);
          await runQuery('INSERT INTO documents', {
            id: docId,
            job_id: job.id,
            user_id: userId,
            document_type: type.key,
            content: content,
            version: 1,
            status: 'final'
          });

          await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'auditor_done' });
        } else {
          await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'failed' });
          await logAction(userId, 'ai_thinker', `❌ Failed to generate acceptable ${type.label} after 2 attempts`, 'failed', false);
        }

      } catch (e: any) {
        console.error(`Error generating ${type.key}:`, e);
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'failed' });
        await logAction(userId, 'ai_thinker', `❌ Error: ${e.message}`, 'failed', false);
      }
    }
  }
}