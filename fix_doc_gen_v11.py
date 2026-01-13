import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Improve language detection and pass it to the prompt builder
old_gen_docs = """  // Get word limits from Thinker settings
  const motivationLetterWordLimit = thinker?.motivation_letter_word_limit || '450';
  const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';
  const cvPageLimit = thinker?.cv_page_limit || '2';"""

new_gen_docs = """  // Get word limits from Thinker settings
  const motivationLetterWordLimit = thinker?.motivation_letter_word_limit || '450';
  const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';
  const cvPageLimit = thinker?.cv_page_limit || '2';

  // Detect language from job description
  const jobText = (job.job_title + ' ' + job.description).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';"""

content = content.replace(old_gen_docs, new_gen_docs)

# Pass targetLanguage to buildThinkerPrompt
content = content.replace("motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit", 
                         "motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit, targetLanguage")

content = content.replace("wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string; cvPageLimit?: string }",
                         "wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string; cvPageLimit?: string; targetLanguage?: string }")

# 2. Update buildThinkerPrompt to use targetLanguage
old_prompt_builder = """function buildThinkerPrompt(
  docKey: string, 
  docLabel: string, 
  userProfile: any, 
  job: any, 
  companyResearch: string, 
  feedback: string,
  wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string; cvPageLimit?: string }
): string {
  const motivationWordLimit = wordLimits?.motivationLetterWordLimit || '450';
  const coverWordLimit = wordLimits?.coverLetterWordLimit || '280';
  const cvPageLimit = wordLimits?.cvPageLimit || '2';"""

new_prompt_builder = """function buildThinkerPrompt(
  docKey: string, 
  docLabel: string, 
  userProfile: any, 
  job: any, 
  companyResearch: string, 
  feedback: string,
  wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string; cvPageLimit?: string; targetLanguage?: string }
): string {
  const motivationWordLimit = wordLimits?.motivationLetterWordLimit || '450';
  const coverWordLimit = wordLimits?.coverLetterWordLimit || '280';
  const cvPageLimit = wordLimits?.cvPageLimit || '2';
  const targetLanguage = wordLimits?.targetLanguage || 'ENGLISH';"""

content = content.replace(old_prompt_builder, new_prompt_builder)

# 3. Enforce language and relevance in the base context of the prompt
content = content.replace("LANGUAGE REQUIREMENT: You MUST write the entire document in the SAME LANGUAGE as the job description provided below. If the job is in German, write in German. If in English, write in English. This is CRITICAL.",
                         "CRITICAL LANGUAGE REQUIREMENT: You MUST write the entire document in ${targetLanguage}. This is a non-negotiable requirement.")

# 4. Add a specific instruction for skills/certs relevance in the CV prompt
old_cv_reqs = """REQUIREMENTS:
1. Tailor the CV specifically to the job requirements
2. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile"""

new_cv_reqs = """REQUIREMENTS:
1. Tailor the CV specifically to the job requirements.
2. RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. Omit everything else to keep the CV focused and professional.
3. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile."""

content = content.replace(old_cv_reqs, new_cv_reqs)

with open(file_path, 'w') as f:
    f.write(content)
