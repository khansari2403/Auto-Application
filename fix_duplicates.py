import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix generateTailoredDocs
# Find the start of the function
func_start = content.find("export async function generateTailoredDocs")
func_end = content.find("  for (const type of DOC_TYPES) {", func_start)
func_body = content[func_start:func_end]

# Remove all language detection blocks in the body
pattern = r"// Detect language from job description[\s\S]*?const targetLanguage = isGerman \? 'GERMAN' : 'ENGLISH';"
func_body = re.sub(pattern, "", func_body)

# Add it once at the top
insertion = """  // Detect language from job description
  const jobText = (job.job_title + ' ' + (job.description || '')).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';\n"""

# Find where to insert (after db declaration)
db_line = "const db = getDatabase();"
func_body = func_body.replace(db_line, db_line + "\n" + insertion)

# Replace the old body with the new one
content = content[:func_start] + func_body + content[func_end:]

# 2. Fix generateSingleDocument
# Find the start of the function
func_start = content.find("export async function generateSingleDocument")
func_body = content[func_start:]

# Remove all language detection blocks
pattern = r"// Detect language[\s\S]*?const isGerman = germanKeywords\.some\(k => jobText\.includes\(k\)\);"
func_body = re.sub(pattern, "", func_body)

# Add it once at the top
insertion = """  // Detect language
  const jobText = (job.job_title + ' ' + (job.description || '')).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));\n"""

# Find where to insert (after userProfile declaration)
profile_line = "const userProfile = db.user_profile?.find((p: any) => p.id === userId) || db.user_profile?.[0];"
func_body = func_body.replace(profile_line, profile_line + "\n" + insertion)

# Replace the old body with the new one
content = content[:func_start] + func_body

with open(file_path, 'w') as f:
    f.write(content)
