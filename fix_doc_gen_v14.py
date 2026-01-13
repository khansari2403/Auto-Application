import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix ReferenceError: targetLanguage and isGerman used before definition
# I'll move the detection logic to the very top of generateTailoredDocs
old_start = """export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();"""

new_start = """export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();
  
  // Detect language from job description
  const jobText = (job.job_title + ' ' + job.description).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';"""

content = content.replace(old_start, new_start)

# 2. Fix the loop where I previously broke the code by removing detection
# I'll ensure the loop uses the variables defined at the top
content = re.sub(r"// Detect language from job description[\s\S]*?const targetLanguage = isGerman \? 'GERMAN' : 'ENGLISH';", "", content)

# 3. Fix generateDocumentHTML to use the passed isGerman parameter correctly
# I'll ensure the salutation and closing are translated
old_salutation_logic = """  const salutation = isGerman ? 'Sehr geehrte Damen und Herren,' : 'Dear Hiring Manager,';
  const closing = isGerman ? 'Mit freundlichen Grüßen,' : 'Kind regards,';"""

new_salutation_logic = """  const salutation = isGerman ? 'Sehr geehrte Damen und Herren,' : 'Dear Hiring Manager,';
  const closing = isGerman ? 'Mit freundlichen Grüßen,' : 'Kind regards,';"""
# (Wait, this is already correct in the code, but I'll make sure it's used)

# 4. Fix CV relevance filter in the prompt
# I'll make the instruction even more explicit
old_cv_relevance = """RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. Omit everything else to keep the CV focused and professional."""
new_cv_relevance = """RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. If a skill or certification is not mentioned or implied as useful in the job description, DO NOT include it. A concise, relevant CV is mandatory."""

content = content.replace(old_cv_relevance, new_cv_relevance)

with open(file_path, 'w') as f:
    f.write(content)
