import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Ensure isGerman is defined before use in generateTailoredDocs loop
# I'll move the detection logic up
old_loop_start = """  for (const type of DOC_TYPES) {
    if (options[type.optionKey]) {"""

new_loop_start = """  // Detect language from job description
  const jobText = (job.job_title + ' ' + job.description).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';

  for (const type of DOC_TYPES) {
    if (options[type.optionKey]) {"""

content = content.replace(old_loop_start, new_loop_start)

# Remove the duplicate detection I added in v11
content = content.replace("""  // Detect language from job description
  const jobText = (job.job_title + ' ' + job.description).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';""", "")

with open(file_path, 'w') as f:
    f.write(content)
