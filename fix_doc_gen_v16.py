import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Fix the ReferenceError in generateSingleDocument
# It needs to detect language too
old_single_doc = """  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI);"""

new_single_doc = """  // Detect language
  const jobText = (job.job_title + ' ' + job.description).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));

  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI);"""

content = content.replace(old_single_doc, new_single_doc)

with open(file_path, 'w') as f:
    f.write(content)
