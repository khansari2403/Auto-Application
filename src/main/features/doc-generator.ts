import { runQuery, getDatabase, logAction } from '../database';
import { getCompanyInfo } from '../scraper-service';
import * as fs from 'fs';
import * as path from 'path';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

// Get base documents directory in user data
const getBaseDocsDir = () => {
  const docsPath = path.join(app.getPath('userData'), 'generated_docs');
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  return docsPath;
};

// Get organized documents directory: Company/Position/
const getOrganizedDocsDir = (companyName: string, position: string) => {
  // Sanitize folder names (remove invalid characters)
  const sanitize = (str: string) => str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 50);
  
  const company = sanitize(companyName || 'Unknown_Company');
  const pos = sanitize(position || 'Unknown_Position');
  
  const docsPath = path.join(getBaseDocsDir(), company, pos);
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  return docsPath;
};

// Legacy: Get simple documents directory (for backwards compatibility)
const getDocsDir = () => {
  return getBaseDocsDir();
};

// Clean AI output - remove JSON artifacts and meta-text
function cleanAIOutput(content: string): string {
  let cleaned = content;
  
  // Remove JSON wrapper patterns
  cleaned = cleaned.replace(/^\s*\{\s*"(coverLetter|motivationLetter|cv|letter)"\s*:\s*"/i, '');
  cleaned = cleaned.replace(/"\s*\}\s*$/i, '');
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[a-z]*\n?/gi, '');
  cleaned = cleaned.replace(/```/g, '');
  
  // Remove meta-commentary at the start
  cleaned = cleaned.replace(/^Here is (the|your|a) (motivation letter|cover letter|CV|resume)[:\s]*/i, '');
  cleaned = cleaned.replace(/^(Below is|I've created|I have written)[^.]*\.\s*/i, '');
  
  // Remove em-dashes and replace with regular dashes
  cleaned = cleaned.replace(/—/g, '-');
  cleaned = cleaned.replace(/–/g, '-');
  
  // Remove escaped newlines and fix formatting
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\"/g, '"');
  
  // Remove any remaining JSON artifacts
  cleaned = cleaned.replace(/^\s*[\[{]/, '');
  cleaned = cleaned.replace(/[\]}]\s*$/, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Document type definitions
const DOC_TYPES = [
  { key: 'cv', label: 'CV', optionKey: 'cv' },
  { key: 'motivation_letter', label: 'Motivation Letter', optionKey: 'motivationLetter' },
  { key: 'cover_letter', label: 'Cover Letter', optionKey: 'coverLetter' },
  { key: 'portfolio', label: 'Portfolio', optionKey: 'portfolio' },
  { key: 'proposal', label: 'Proposal', optionKey: 'proposal' }
];

// Generate HTML template for document
function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }
    
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0077b5;
    }
    
    .name {
      font-size: 28px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
    }
    
    .title {
      font-size: 16px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .contact {
      font-size: 13px;
      color: #444;
    }
    
    .contact span {
      margin-right: 15px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .content {
      font-size: 14px;
      text-align: justify;
      white-space: pre-wrap;
    }
    
    .content p {
      margin-bottom: 12px;
    }
    
    .experience-item, .education-item {
      margin-bottom: 15px;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .item-title {
      font-weight: 600;
      font-size: 15px;
    }
    
    .item-company {
      color: #666;
      font-size: 14px;
    }
    
    .item-date {
      color: #888;
      font-size: 13px;
    }
    
    .item-description {
      font-size: 13px;
      color: #444;
      margin-top: 5px;
    }
    
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .skill-tag {
      background: #e3f2fd;
      color: #0077b5;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${userProfile?.name || 'Your Name'}</div>
    <div class="title">${userProfile?.title || 'Professional Title'}</div>
    <div class="contact">
      ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
      ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
      ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
    </div>
  </div>
  
  <div class="section">
    <div class="content">${content.replace(/\n/g, '<br>')}</div>
  </div>
</body>
</html>`;
}

// Generate CV HTML with full profile
function generateCVHTML(content: string, userProfile: any, job: any): string {
  const experiences = userProfile?.experiences || [];
  const educations = userProfile?.educations || [];
  const skills = userProfile?.skills || [];
  const certifications = userProfile?.licenses || [];
  
  let experiencesHTML = '';
  if (Array.isArray(experiences)) {
    experiencesHTML = experiences.map((exp: any) => `
      <div class="experience-item">
        <div class="item-header">
          <div>
            <span class="item-title">${exp.title || exp}</span>
            ${exp.company ? `<span class="item-company"> at ${exp.company}</span>` : ''}
          </div>
          <span class="item-date">${exp.startDate || ''} - ${exp.endDate || 'Present'}</span>
        </div>
        ${exp.location ? `<div style="color: #666; font-size: 13px;">${exp.location}</div>` : ''}
        ${exp.description ? `<div class="item-description">${exp.description}</div>` : ''}
      </div>
    `).join('');
  }
  
  let educationsHTML = '';
  if (Array.isArray(educations)) {
    educationsHTML = educations.map((edu: any) => `
      <div class="education-item">
        <div class="item-header">
          <div>
            <span class="item-title">${edu.degree || edu}</span>
            ${edu.field ? `<span class="item-company"> in ${edu.field}</span>` : ''}
          </div>
          <span class="item-date">${edu.startYear || ''} - ${edu.endYear || ''}</span>
        </div>
        ${edu.school ? `<div style="color: #666; font-size: 13px;">${edu.school}</div>` : ''}
      </div>
    `).join('');
  }
  
  let skillsHTML = '';
  if (Array.isArray(skills) && skills.length > 0) {
    skillsHTML = `<div class="skills-list">${skills.map((s: string) => `<span class="skill-tag">${s}</span>`).join('')}</div>`;
  }
  
  let certsHTML = '';
  if (Array.isArray(certifications) && certifications.length > 0) {
    certsHTML = `<div class="skills-list">${certifications.map((c: string) => `<span class="skill-tag" style="background: #fff3e0; color: #ef6c00;">${c}</span>`).join('')}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${userProfile?.name || 'Applicant'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 850px;
      margin: 0 auto;
      padding: 30px 40px;
      background: #fff;
    }
    
    .header {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0077b5;
    }
    
    .header-photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #0077b5;
    }
    
    .header-info { flex: 1; }
    .name { font-size: 32px; font-weight: 700; color: #0077b5; }
    .title { font-size: 18px; color: #444; margin: 5px 0; }
    .contact { font-size: 13px; color: #666; display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px; }
    
    .main { display: grid; grid-template-columns: 1fr 300px; gap: 30px; }
    .left-column { }
    .right-column { }
    
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .summary { font-size: 14px; color: #333; text-align: justify; }
    
    .experience-item, .education-item { margin-bottom: 18px; }
    .item-header { display: flex; justify-content: space-between; flex-wrap: wrap; }
    .item-title { font-weight: 600; font-size: 15px; color: #1a1a1a; }
    .item-company { color: #666; font-size: 14px; }
    .item-date { color: #888; font-size: 12px; }
    .item-description { font-size: 13px; color: #444; margin-top: 5px; }
    
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tag {
      background: #e3f2fd;
      color: #0077b5;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    
    @media print {
      body { padding: 15px; font-size: 12px; }
      .section-title { font-size: 11px; }
      .name { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${userProfile?.photo ? `<img src="${userProfile.photo}" class="header-photo" alt="Photo">` : ''}
    <div class="header-info">
      <div class="name">${userProfile?.name || 'Your Name'}</div>
      <div class="title">${userProfile?.title || 'Professional Title'}</div>
      <div class="contact">
        ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
        ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
        ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
      </div>
    </div>
  </div>
  
  <div class="main">
    <div class="left-column">
      ${userProfile?.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${userProfile.summary}</div>
        </div>
      ` : ''}
      
      ${experiencesHTML ? `
        <div class="section">
          <div class="section-title">Work Experience</div>
          ${experiencesHTML}
        </div>
      ` : ''}
      
      ${educationsHTML ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${educationsHTML}
        </div>
      ` : ''}
    </div>
    
    <div class="right-column">
      ${skillsHTML ? `
        <div class="section">
          <div class="section-title">Skills</div>
          ${skillsHTML}
        </div>
      ` : ''}
      
      ${certsHTML ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certsHTML}
        </div>
      ` : ''}
      
      ${userProfile?.languages?.length > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>
          <div class="skills-list">
            ${userProfile.languages.map((l: string) => `<span class="skill-tag" style="background: #e8f5e9; color: #388e3c;">${l}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

// Save document to file with organized directory structure
function saveDocumentFile(content: string, jobId: number, docType: string, format: 'html' | 'txt' = 'html', companyName?: string, position?: string): string {
  // Use organized directory if company/position available, otherwise use base directory
  const docsDir = (companyName && position) 
    ? getOrganizedDocsDir(companyName, position)
    : getDocsDir();
    
  const timestamp = Date.now();
  const fileName = `${docType}_job${jobId}_${timestamp}.${format}`;
  const filePath = path.join(docsDir, fileName);
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Document saved: ${filePath}`);
  
  return filePath;
}

// Main document generation function
export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();
  const userProfile = db.user_profile?.find((p: any) => p.id === userId) || db.user_profile?.[0];
  
  if (!userProfile) {
    await logAction(userId, 'ai_thinker', '❌ No user profile found. Please create your profile first.', 'failed', false);
    return;
  }

  // Step 0: Research Company
  let companyResearch = "";
  try {
    await logAction(userId, 'ai_thinker', `🔍 Researching ${job.company_name} mission and history...`, 'in_progress');
    companyResearch = await getCompanyInfo(job.company_name, userId, callAI);
  } catch (e) {
    console.error("Research failed:", e);
    companyResearch = "Research unavailable.";
  }

  for (const type of DOC_TYPES) {
    if (options[type.optionKey]) {
      try {
        await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'generating' });

        let attempts = 0;
        let approved = false;
        let content = '';
        let feedback = '';

        while (attempts < 2 && !approved) {
          attempts++;
          
          // Build the prompt based on document type
          const thinkerPrompt = buildThinkerPrompt(type.key, type.label, userProfile, job, companyResearch, feedback);
          
          let rawContent = await callAI(thinker, thinkerPrompt);
          
          // Clean the AI output to remove JSON artifacts and meta-text
          content = cleanAIOutput(rawContent);
          
          await logAction(userId, 'ai_auditor', `🧐 Auditing ${type.label} (Attempt ${attempts})`, 'in_progress');
          
          const auditorPrompt = buildAuditorPrompt(type.key, type.label, content, job);
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
          // Generate HTML file
          let htmlContent: string;
          if (type.key === 'cv') {
            htmlContent = generateCVHTML(content, userProfile, job);
          } else {
            htmlContent = generateDocumentHTML(content, type.label, userProfile, job);
          }
          
          // Save to file system with organized directory structure (Company/Position/Files)
          const filePath = saveDocumentFile(htmlContent, job.id, type.key, 'html', job.company_name, job.job_title);
          
          // Save to documents table
          const docId = Date.now() + Math.floor(Math.random() * 1000);
          await runQuery('INSERT INTO documents', {
            id: docId,
            job_id: job.id,
            user_id: userId,
            document_type: type.key,
            content: content,
            file_path: filePath,
            version: 1,
            status: 'final',
            created_at: new Date().toISOString()
          });

          await runQuery('UPDATE job_listings', { 
            id: job.id, 
            [`${type.key}_status`]: 'auditor_done',
            [`${type.key}_path`]: filePath,
            [`${type.key}_rejection_reason`]: null
          });
          
          await logAction(userId, 'ai_thinker', `📄 ${type.label} saved to: ${filePath}`, 'completed', true);
        } else {
          // Document rejected - save reason for user
          const rejectionMessage = `The document was rejected after 2 generation attempts. Reason: ${feedback}\n\nThis may indicate:\n- Profile data doesn't match job requirements well enough\n- Missing key experiences or skills for this role\n- The AI couldn't find enough relevant information to create a compelling document`;
          
          await runQuery('UPDATE job_listings', { 
            id: job.id, 
            [`${type.key}_status`]: 'rejected',
            [`${type.key}_rejection_reason`]: rejectionMessage
          });
          await logAction(userId, 'ai_thinker', `❌ Failed to generate acceptable ${type.label} after 2 attempts: ${feedback}`, 'failed', false);
        }

      } catch (e: any) {
        console.error(`Error generating ${type.key}:`, e);
        await runQuery('UPDATE job_listings', { id: job.id, [`${type.key}_status`]: 'failed' });
        await logAction(userId, 'ai_thinker', `❌ Error: ${e.message}`, 'failed', false);
      }
    }
  }
}

// Build Thinker prompt based on document type
function buildThinkerPrompt(docKey: string, docLabel: string, userProfile: any, job: any, companyResearch: string, feedback: string): string {
  const baseContext = `
USER PROFILE:
Name: ${userProfile?.name || 'N/A'}
Title: ${userProfile?.title || 'N/A'}
Location: ${userProfile?.location || 'N/A'}
Email: ${userProfile?.email || 'N/A'}
Phone: ${userProfile?.phone || 'N/A'}
Summary: ${userProfile?.summary || 'N/A'}
Experiences: ${JSON.stringify(userProfile?.experiences || [])}
Skills: ${JSON.stringify(userProfile?.skills || [])}
Education: ${JSON.stringify(userProfile?.educations || [])}
Certifications: ${JSON.stringify(userProfile?.licenses || [])}
Languages: ${JSON.stringify(userProfile?.languages || [])}

JOB DETAILS:
Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || 'N/A'}
Type: ${job.job_type || 'N/A'}
Description: ${job.description || 'N/A'}
Required Skills: ${job.required_skills || 'N/A'}

COMPANY RESEARCH:
${companyResearch || 'No additional company research available. Focus on what can be inferred from the job description.'}

${feedback ? `PREVIOUS FEEDBACK FROM AUDITOR: ${feedback}\nPlease fix these issues in the new version.` : ''}
`;

  const prompts: Record<string, string> = {
    cv: `You are a professional CV/Resume writer. Create a tailored CV for this job application.

${baseContext}

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT fabricate or hallucinate any information - use ONLY data from the provided profile
2. DO NOT invent job titles, companies, dates, or achievements not in the profile
3. DO NOT include any JSON formatting or markdown code blocks
4. DO NOT add meta-commentary like "Here is your CV"

REQUIREMENTS:
1. Tailor the CV specifically to the job requirements
2. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile
3. Use action verbs and quantify achievements where the data exists in the profile
4. Keep it ATS-friendly (no tables, columns, graphics)
5. Include contact information at the top (from the profile)
6. Language: Match the job description language
7. Structure: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications, Languages

STRUCTURE:
- CONTACT: Name, Title, Email, Phone, Location (from profile)
- PROFESSIONAL SUMMARY: 3-4 sentences summarizing experience relevant to this role
- WORK EXPERIENCE: List jobs from profile with title, company, dates, and bullet points
- EDUCATION: List degrees from profile
- SKILLS: List skills from profile, prioritizing those matching job requirements
- CERTIFICATIONS: List certifications from profile
- LANGUAGES: List languages from profile

OUTPUT FORMAT: Return ONLY the CV content in clean text format. Use clear section headings.`,

    motivation_letter: `You are an expert Motivation Letter writer. Create a compelling, HUMAN-SOUNDING motivation letter that fills ONE FULL PAGE (400-500 words).

${baseContext}

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT start with "Here is the motivation letter:" or any similar meta-text
2. DO NOT include JSON formatting like { "motivationLetter": ... }
3. DO NOT mention "I could not find..." or "Research was unavailable"
4. DO NOT use long em-dashes (—), use regular dashes (-) only
5. DO NOT use clichés: "I am thrilled", "passionate professional", "fast-paced world"
6. DO NOT start sentences with "I have..." or "I am..." repeatedly
7. DO NOT fabricate or hallucinate information - use ONLY data from the provided profile
8. DO NOT invent company facts not mentioned in the research - if unsure, focus on what's in the job posting
9. Output ONLY the letter content, starting with the date and recipient
10. MUST end with proper sign-off: "Kind regards," followed by the applicant's full name

STRUCTURE (follow exactly):
1. HEADER: Date, Company Address, "Dear Hiring Manager,"
2. OPENING (1 paragraph): State who you are, what position, and ONE compelling reason why this company
3. COMPANY CONNECTION (1 paragraph): Reference something specific about the company - their products, services, recent news, or values. If research is limited, focus on what's clear from the job posting
4. YOUR VALUE (2 paragraphs): 
   - First: Your most relevant experience with SPECIFIC metrics/achievements FROM YOUR ACTUAL PROFILE
   - Second: How your skills directly solve their needs mentioned in the job posting
5. WHY THIS ROLE (1 paragraph): Personal motivation - career goals, growth opportunity, alignment
6. CLOSING: Thank them, express enthusiasm for an interview
7. SIGN-OFF: "Kind regards," + new line + "${userProfile?.name || '[Your Name]'}"

MUST INCLUDE:
- At least 2 specific achievements with numbers/metrics FROM THE PROVIDED PROFILE
- At least 1 specific reference to the company (product, service, or value)
- Smooth transitions between paragraphs
- Professional but warm tone
- Proper sign-off with full name

Length: ONE FULL PAGE (400-500 words minimum). This is a formal document.
Language: Match the job description language.

Return ONLY the motivation letter content, starting directly with the date and ending with the sign-off.`,

    cover_letter: `You are an expert Cover Letter writer. Create a concise, professional cover letter.

${baseContext}

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT include any JSON formatting like { "coverLetter": ... }
2. DO NOT start with meta-text like "Here is the cover letter:"
3. DO NOT use long em-dashes (—), use regular dashes (-) only
4. DO NOT fabricate or hallucinate information not provided in the profile
5. Output ONLY the letter content, starting with "Dear Hiring Manager" or similar

REQUIREMENTS:
1. Be concise (250-300 words)
2. Address the hiring manager professionally
3. Highlight 2-3 most relevant qualifications with specific examples FROM THE PROVIDED PROFILE ONLY
4. Show enthusiasm for the specific role
5. Include a clear call to action
6. No clichés or AI-sounding phrases
7. Language: Match the job description
8. MUST end with proper sign-off: "Kind regards," followed by the applicant's full name

STRUCTURE:
- Opening: "Dear Hiring Manager," then state the position and express interest (1-2 sentences)
- Middle (2 paragraphs): Your relevant qualifications and why you're a great fit
- Closing: Thank them, suggest next steps
- Sign-off: "Kind regards," + new line + "${userProfile?.name || '[Your Name]'}"

Return ONLY the cover letter content, starting with "Dear Hiring Manager," and ending with the sign-off.`,

    portfolio: `You are a Portfolio Description writer. Create a portfolio summary for this job application.

${baseContext}

REQUIREMENTS:
1. Highlight 3-5 most relevant projects or achievements
2. For each project:
   - Brief description (2-3 sentences)
   - Technologies/skills used
   - Measurable impact/results
3. Tailor selection to the job requirements
4. Include links placeholders [Project Link] where appropriate

Return ONLY the portfolio description content.`,

    proposal: `You are a professional Proposal writer. Create a proposal for this job application.

${baseContext}

REQUIREMENTS:
1. Executive Summary: What you propose to do for them
2. Understanding: Show you understand their challenges
3. Approach: How you would tackle the role
4. Value Proposition: What unique value you bring
5. Next Steps: Suggest a meeting or discussion
6. Professional tone, business-focused

Return ONLY the proposal content.`
  };

  return prompts[docKey] || prompts['motivation_letter'];
}

// Build Auditor prompt
function buildAuditorPrompt(docKey: string, docLabel: string, content: string, job: any): string {
  return `You are the "Auditor" agent. Your job is to review this ${docLabel} for accuracy, quality, and FACTUAL CORRECTNESS.

JOB: ${job.job_title} at ${job.company_name}

CONTENT TO REVIEW:
${content}

EVALUATION CRITERIA:

**CRITICAL - HALLUCINATION CHECK:**
1. FACTUAL ACCURACY: Does the document contain any information that seems fabricated or not from the applicant's actual profile? Look for:
   - Specific company names, dates, or achievements that seem invented
   - Metrics or percentages that appear made up (e.g., "increased sales by 47%" without context)
   - Job titles or responsibilities that seem inconsistent
   - Skills or certifications not typically mentioned together
2. COMPANY FACTS: Are any company facts stated that could be false? (If unsure, flag as potentially fabricated)

**FORMAT & QUALITY:**
3. LANGUAGE: Is it in the same language as the job description?
4. HUMAN-LIKE: Does it avoid AI clichés (thrilled, passionate, fast-paced world)?
5. NO LONG HYPHENS: Are there any — or – characters? (Should use - instead)
6. PROPER GREETING: Does it start with "Dear Hiring Manager," or similar?
7. PROPER SIGN-OFF: Does it end with "Kind regards," followed by the applicant's name?
8. ATS FRIENDLY: Is the structure clear and professional?
9. TAILORED: Does it specifically reference the company or role?
10. NO PLACEHOLDERS: Are there any "[Insert...]", "XYZ", or "N/A" in critical fields?
11. LENGTH: Is it appropriate? (Motivation letter: 400-500 words, Cover letter: 250-300 words)
12. NO JSON/META: Does it start cleanly without JSON formatting or meta-text like "Here is..."?
13. NO APOLOGIES: Does it avoid phrases like "I could not find", "research unavailable"?

RESPONSE FORMAT:
If it passes ALL criteria, respond with exactly: "APPROVED"
If it fails any criteria (especially hallucination), respond with: "REJECTED: " followed by specific feedback on what to fix.`;
}

// Export individual document generator for direct calls
export async function generateSingleDocument(
  jobId: number, 
  userId: number, 
  docType: string, 
  thinker: any, 
  auditor: any, 
  callAI: Function
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const db = getDatabase();
  const job = db.job_listings?.find((j: any) => j.id === jobId);
  const userProfile = db.user_profile?.find((p: any) => p.id === userId) || db.user_profile?.[0];
  
  if (!job) return { success: false, error: 'Job not found' };
  if (!userProfile) return { success: false, error: 'User profile not found' };
  
  const options: any = {};
  const typeConfig = DOC_TYPES.find(t => t.key === docType);
  if (typeConfig) {
    options[typeConfig.optionKey] = true;
  }
  
  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI);
  
  // Refresh job data to get file path
  const updatedJob = db.job_listings?.find((j: any) => j.id === jobId);
  const filePath = updatedJob?.[`${docType}_path`];
  
  if (filePath) {
    return { success: true, filePath };
  }
  
  return { success: false, error: 'Document generation failed' };
}
