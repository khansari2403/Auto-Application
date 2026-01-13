import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix ReferenceError: isGerman used before definition
old_html_start = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });"""

new_html_start = """function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');
  
  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));

  const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });"""

content = content.replace(old_html_start, new_html_start)

# Remove the duplicate detection logic later in the function
content = content.replace("""  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));""", "")

# 2. Refine CV prompt for relevance and language
old_cv_prompt = """cv: `You are a professional CV/Resume writer. Create a tailored CV for this job application.\n\n${baseContext}"""
new_cv_prompt = """cv: `You are a professional CV/Resume writer. Create a tailored CV for this job application.

CRITICAL: You MUST write the CV in the SAME LANGUAGE as the job description. If the job is in German, the CV MUST be in German.

${baseContext}

RELEVANCE RULE:
- Include ONLY skills and certifications that are DIRECTLY RELEVANT to this specific job.
- If a certification or skill has no connection to the job requirements, OMIT IT.
- Quality over quantity. A focused CV is better than a long list of irrelevant items."""

content = content.replace(old_cv_prompt, new_cv_prompt)

# 3. Fix the redundant "Dear Hiring Manager" and "Kind regards"
# I'll update the stripping logic to be even more aggressive
old_strip_logic = """    // 1. Remove everything before the actual body (headers, dates, addresses, salutations)
    // We look for the first paragraph that doesn't look like a header
    const lines = cleanContent.split('\\n');
    let bodyStartIndex = 0;
    const headerPatterns = [/date/i, /subject/i, /to:/i, /from:/i, /dear/i, /sehr geehrte/i, /hallo/i, /guten tag/i, /^\\d{1,2}\\./, /^[A-Z][a-z]+, \\d/];
    
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (headerPatterns.some(p => p.test(lines[i]))) {
        bodyStartIndex = i + 1;
      } else if (lines[i].trim().length > 0) {
        // If we find a substantial line that doesn't match header patterns, we might have reached the body
        // But let's be careful not to skip the first sentence
        break;
      }
    }
    cleanContent = lines.slice(bodyStartIndex).join('\\n').trim();"""

new_strip_logic = """    // 1. Remove everything before the actual body (headers, dates, addresses, salutations)
    const lines = cleanContent.split('\\n');
    let bodyStartIndex = 0;
    const headerPatterns = [
      /date/i, /subject/i, /to:/i, /from:/i, /dear/i, /sehr geehrte/i, /hallo/i, /guten tag/i, 
      /^\\d{1,2}\\./, /^[A-Z][a-z]+, \\d/, /hiring manager/i, /geehrter/i, /geehrte/i
    ];
    
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      if (headerPatterns.some(p => p.test(line))) {
        bodyStartIndex = i + 1;
      } else {
        // If we find a line that doesn't match header patterns, it's likely the start of the body
        break;
      }
    }
    cleanContent = lines.slice(bodyStartIndex).join('\\n').trim();"""

content = content.replace(old_strip_logic, new_strip_logic)

with open(file_path, 'w') as f:
    f.write(content)
