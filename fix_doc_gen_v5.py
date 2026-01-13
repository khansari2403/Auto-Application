import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix generateDocumentHTML to remove redundant salutations and closings
old_html_func = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Ensure content doesn't have redundant headers if AI generated them
  let cleanContent = content;
  if (isLetter) {
    // Remove common AI-generated headers that we already provide in the template
    cleanContent = cleanContent.replace(/^(Dear|To|Attention)[^,:]*[,:]/i, '').trim();
    // If it still starts with a date or address, try to strip it
    cleanContent = cleanContent.replace(/^\\d{1,2}\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
    cleanContent = cleanContent.replace(/^[A-Z][a-z]+,\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
  }

  return `<!DOCTYPE html>
<html lang=\\\"en\\\">
<head>
  <meta charset=\\\"UTF-8\\\">
  <meta name=\\\"viewport\\\" content=\\\"width=device-width, initial-scale=1.0\\\">
  <title>${title}</title>\n  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 80px;
      background: #fff;
    }
    
    .letterhead {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
    
    .applicant-info {
      text-align: left;
    }
    
    .applicant-name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .applicant-contact {
      font-size: 13px;
      color: #666;
    }
    
    .applicant-contact p { margin: 1px 0; }
    
    .date-section {
      text-align: right;
      font-size: 14px;
      color: #444;
      margin-bottom: 30px;
    }
    
    .recipient-info {
      margin-bottom: 35px;
      font-size: 14px;
      color: #222;
      line-height: 1.5;
    }
    
    .recipient-info p { margin: 2px 0; }
    
    .salutation {
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 15px;
    }
    
    .content {
      font-size: 15px;
      text-align: justify;
      white-space: pre-wrap;
      margin-bottom: 40px;
    }
    
    .signature {
      margin-top: 40px;
    }
    
    .closing {
      margin-bottom: 30px;
      font-size: 15px;
    }
    
    .signature-name {
      font-weight: 700;
      font-size: 16px;
      color: #0077b5;
    }

    @media print {
      body { padding: 40px; }
      .letterhead { margin-bottom: 30px; }
    }
  </style>
</head>
<body>
  ${isLetter ? `
  <div class=\\\"letterhead\\\">
    <div class=\\\"applicant-info\\\">
      <div class=\\\"applicant-name\\\">${userProfile?.name || 'Your Name'}</div>
      <div class=\\\"applicant-contact\\\">
        ${userProfile?.email ? `<p>${userProfile.email}</p>` : ''}
        ${userProfile?.phone ? `<p>${userProfile.phone}</p>` : ''}
        ${userProfile?.location ? `<p>${userProfile.location}</p>` : ''}
      </div>
    </div>
    <div style=\\\"text-align: right; font-size: 12px; color: #999;\\\">
      ${docType.toUpperCase()}
    </div>
  </div>
  
  <div class=\\\"date-section\\\">${currentDate}</div>
  
  <div class=\\\"recipient-info\\\">
    <p><strong>To: Hiring Manager</strong></p>\n    <p>${job?.company_name || 'Company Name'}</p>
    ${job?.location ? `<p>${job.location}</p>` : ''}
  </div>
  
  <div class=\\\"salutation\\\">Dear Hiring Manager,</div>
  ` : `
  <div class=\\\"header\\\" style=\\\"margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0077b5;\\\">
    <div style=\\\"font-size: 32px; font-weight: 700; color: #0077b5; margin-bottom: 5px;\\\">${userProfile?.name || 'Your Name'}</div>
    <div style=\\\"font-size: 18px; color: #555; margin-bottom: 15px;\\\">${userProfile?.title || 'Professional Title'}</div>
    <div style=\\\"font-size: 14px; color: #666; display: flex; gap: 20px;\\\">
      ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
      ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
      ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
    </div>
  </div>
  `}
  
  <div class=\\\"content\\\">${cleanContent.replace(/\\n/g, '<br>')}</div>
  
  ${isLetter ? `
  <div class=\\\"signature\\\">
    <div class=\\\"closing\\\">Kind regards,</div>
    <div class=\\\"signature-name\\\">${userProfile?.name || 'Your Name'}</div>
  </div>
  ` : ''}
</body>
</html>`;
}"""

new_html_func = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Ensure content doesn't have redundant headers if AI generated them
  let cleanContent = content;
  if (isLetter) {
    // Remove common AI-generated headers that we already provide in the template
    cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte)[^,:]*[,:]/i, '').trim();
    // Remove redundant sign-offs
    cleanContent = cleanContent.replace(/(Kind regards|Best regards|Sincerely|Mit freundlichen Grüßen|MFG)[^.]*$/i, '').trim();
    // Remove redundant name at the end
    if (userProfile?.name) {
      const nameEscaped = userProfile.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const nameRegex = new RegExp(nameEscaped + '$', 'i');
      cleanContent = cleanContent.replace(nameRegex, '').trim();
    }
    // If it still starts with a date or address, try to strip it
    cleanContent = cleanContent.replace(/^\\d{1,2}\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
    cleanContent = cleanContent.replace(/^[A-Z][a-z]+,\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
  }

  // Detect language for salutation and closing
  const isGerman = job?.description?.toLowerCase().includes('kenntnisse') || 
                   job?.description?.toLowerCase().includes('erfahrung') ||
                   job?.job_title?.toLowerCase().includes('entwickler');
  
  const salutation = isGerman ? 'Sehr geehrte Damen und Herren,' : 'Dear Hiring Manager,';
  const closing = isGerman ? 'Mit freundlichen Grüßen,' : 'Kind regards,';

  return `<!DOCTYPE html>
<html lang=\\\"en\\\">
<head>
  <meta charset=\\\"UTF-8\\\">
  <meta name=\\\"viewport\\\" content=\\\"width=device-width, initial-scale=1.0\\\">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 80px;
      background: #fff;
    }
    
    .letterhead {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
    
    .applicant-info {
      text-align: left;
    }
    
    .applicant-name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .applicant-contact {
      font-size: 13px;
      color: #666;
    }
    
    .applicant-contact p { margin: 1px 0; }
    
    .date-section {
      text-align: right;
      font-size: 14px;
      color: #444;
      margin-bottom: 30px;
    }
    
    .recipient-info {
      margin-bottom: 35px;
      font-size: 14px;
      color: #222;
      line-height: 1.5;
    }
    
    .recipient-info p { margin: 2px 0; }
    
    .salutation {
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 15px;
    }
    
    .content {
      font-size: 15px;
      text-align: justify;
      white-space: pre-wrap;
      margin-bottom: 40px;
    }
    
    .signature {
      margin-top: 40px;
    }
    
    .closing {
      margin-bottom: 10px;
      font-size: 15px;
    }
    
    .signature-name {
      font-weight: 700;
      font-size: 16px;
      color: #0077b5;
    }

    @media print {
      body { padding: 40px; }
      .letterhead { margin-bottom: 30px; }
    }
  </style>
</head>
<body>
  ${isLetter ? `
  <div class=\\\"letterhead\\\">
    <div class=\\\"applicant-info\\\">
      <div class=\\\"applicant-name\\\">${userProfile?.name || 'Your Name'}</div>
      <div class=\\\"applicant-contact\\\">
        ${userProfile?.email ? `<p>${userProfile.email}</p>` : ''}
        ${userProfile?.phone ? `<p>${userProfile.phone}</p>` : ''}
        ${userProfile?.location ? `<p>${userProfile.location}</p>` : ''}
      </div>
    </div>
    <div style=\\\"text-align: right; font-size: 12px; color: #999;\\\">
      ${docType.toUpperCase()}
    </div>
  </div>
  
  <div class=\\\"date-section\\\">${currentDate}</div>
  
  <div class=\\\"recipient-info\\\">
    <p><strong>To: Hiring Manager</strong></p>
    <p>${job?.company_name || 'Company Name'}</p>
    ${job?.location ? `<p>${job.location}</p>` : ''}
  </div>
  
  <div class=\\\"salutation\\\">${salutation}</div>
  ` : `
  <div class=\\\"header\\\" style=\\\"margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0077b5;\\\">
    <div style=\\\"font-size: 32px; font-weight: 700; color: #0077b5; margin-bottom: 5px;\\\">${userProfile?.name || 'Your Name'}</div>
    <div style=\\\"font-size: 18px; color: #555; margin-bottom: 15px;\\\">${userProfile?.title || 'Professional Title'}</div>
    <div style=\\\"font-size: 14px; color: #666; display: flex; gap: 20px;\\\">
      ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
      ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
      ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
    </div>
  </div>
  `}
  
  <div class=\\\"content\\\">${cleanContent.replace(/\\n/g, '<br>')}</div>
  
  ${isLetter ? `
  <div class=\\\"signature\\\">
    <div class=\\\"closing\\\">${closing}</div>
    <div class=\\\"signature-name\\\">${userProfile?.name || 'Your Name'}</div>
  </div>
  ` : ''}
</body>
</html>`;
}"""

content = content.replace(old_html_func, new_html_func)

# 2. Update prompts to enforce language matching
content = content.replace("6. Language: Match the job description language", 
                         "6. LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.")

content = content.replace("Language: Match the job description language.",
                         "LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.")

content = content.replace("7. Language: Match the job description",
                         "7. LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.")

with open(file_path, 'w') as f:
    f.write(content)
