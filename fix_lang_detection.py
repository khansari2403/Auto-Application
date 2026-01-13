import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Improve language detection
old_detection = """  // Detect language for salutation and closing
  const isGerman = job?.description?.toLowerCase().includes('kenntnisse') || 
                   job?.description?.toLowerCase().includes('erfahrung') ||
                   job?.job_title?.toLowerCase().includes('entwickler');"""

new_detection = """  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));"""

content = content.replace(old_detection, new_detection)

# Also update the date format for German
content = content.replace("const currentDate = new Date().toLocaleDateString('en-US', {", 
                         "const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {")

with open(file_path, 'w') as f:
    f.write(content)
