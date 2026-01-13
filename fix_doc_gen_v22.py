import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix ReferenceError: targetLanguage and isGerman used before definition in generateTailoredDocs
# I'll move the detection logic to the very top of generateTailoredDocs
old_start = """export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();"""

new_start = """export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();
  
  // Detect language from job description
  const jobText = (job.job_title + ' ' + (job.description || '')).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';"""

if new_start not in content:
    content = content.replace(old_start, new_start)

# 2. Fix the ReferenceError in generateDocumentHTML
# I'll ensure isGerman is passed correctly
content = content.replace("const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {", 
                         "const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {")

# 3. Fix the redundant "Dear Hiring Manager" and "Kind regards"
# I'll update the stripping logic to be even more aggressive
old_strip_logic = """    // 1. Remove everything before the actual body (headers, dates, addresses, salutations)
    const lines = cleanContent.split('\\n');
    let bodyStartIndex = 0;
    const headerPatterns = [
      /date/i, /subject/i, /to:/i, /from:/i, /dear/i, /sehr geehrte/i, /hallo/i, /guten tag/i, 
      /^\\d{1,2}\\./, /^[A-Z][a-z]+, \\d/, /hiring manager/i, /geehrter/i, /geehrte/i, /manager/i
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
    cleanContent = lines.slice(bodyStartIndex).join('\\n').trim();

    // 2. Remove redundant sign-offs and everything after them
    const signOffs = ['Kind regards', 'Best regards', 'Sincerely', 'Yours truly', 'Mit freundlichen Grüßen', 'MFG', 'Freundliche Grüße', 'Hochachtungsvoll', 'Viele Grüße'];
    const signOffRegex = new RegExp(`(?:${signOffs.join('|')})[\\\\s\\\\S]*$`, 'i');
    cleanContent = cleanContent.replace(signOffRegex, '').trim();"""

new_strip_logic = """    // 1. Remove everything before the actual body (headers, dates, addresses, salutations)
    const lines = cleanContent.split('\\n');
    let bodyStartIndex = 0;
    const headerPatterns = [
      /date/i, /subject/i, /to:/i, /from:/i, /dear/i, /sehr geehrte/i, /hallo/i, /guten tag/i, 
      /^\\d{1,2}\\./, /^[A-Z][a-z]+, \\d/, /hiring manager/i, /geehrter/i, /geehrte/i, /manager/i
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
    cleanContent = lines.slice(bodyStartIndex).join('\\n').trim();

    // 2. Remove redundant sign-offs and everything after them
    const signOffs = ['Kind regards', 'Best regards', 'Sincerely', 'Yours truly', 'Mit freundlichen Grüßen', 'MFG', 'Freundliche Grüße', 'Hochachtungsvoll', 'Viele Grüße'];
    const signOffRegex = new RegExp(`(?:${signOffs.join('|')})[\\\\s\\\\S]*$`, 'i');
    cleanContent = cleanContent.replace(signOffRegex, '').trim();"""

if new_strip_logic not in content:
    content = content.replace(old_strip_logic, new_strip_logic)

# 4. Fix CV relevance filter in the prompt
# I'll make the instruction even more explicit
old_cv_relevance = """RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. If a skill or certification is not mentioned or implied as useful in the job description, DO NOT include it. A concise, relevant CV is mandatory. DO NOT list more than 5-7 key skills and 3-5 relevant certifications."""
new_cv_relevance = """RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. If a skill or certification is not mentioned or implied as useful in the job description, DO NOT include it. A concise, relevant CV is mandatory. DO NOT list more than 5-7 key skills and 3-5 relevant certifications."""

if new_cv_relevance not in content:
    content = content.replace(old_cv_relevance, new_cv_relevance)

with open(file_path, 'w') as f:
    f.write(content)
