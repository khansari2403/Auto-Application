import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Robust language detection
old_detection = """  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));"""

new_detection = """  // Detect language for salutation and closing
  const jobText = (job?.description + ' ' + job?.job_title).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));"""

content = content.replace(old_detection, new_detection)

# 2. Aggressive stripping of AI-generated headers/closings
# I'll replace the entire cleanContent logic in generateDocumentHTML
old_strip_logic = """  // Ensure content doesn't have redundant headers if AI generated them
  let cleanContent = content;
  if (isLetter) {
    // Remove common AI-generated headers that we already provide in the template
    // This regex is more aggressive to catch multiple lines of headers
    cleanContent = cleanContent.replace(/^(?:Date|To|From|Subject|Attention|Dear|Sehr geehrte|Sehr geehrter|Hallo|Guten Tag)[\\s\\S]*?[,:]/i, '').trim();
    
    // Remove redundant sign-offs and everything after them
    // We look for common sign-offs and strip everything from that point to the end of the string
    const signOffs = ['Kind regards', 'Best regards', 'Sincerely', 'Yours truly', 'Mit freundlichen Grüßen', 'MFG', 'Freundliche Grüße', 'Hochachtungsvoll'];
    const signOffRegex = new RegExp(`(?:${signOffs.join('|')})[\\\\s\\\\S]*$`, 'i');
    cleanContent = cleanContent.replace(signOffRegex, '').trim();
    // Remove redundant name at the end
    if (userProfile?.name) {
      const nameEscaped = userProfile.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const nameRegex = new RegExp(nameEscaped + '$', 'i');
      cleanContent = cleanContent.replace(nameRegex, '').trim();
    }
    // If it still starts with a date or address, try to strip it
    cleanContent = cleanContent.replace(/^\\d{1,2}\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
    cleanContent = cleanContent.replace(/^[A-Z][a-z]+,\\s+[A-Z][a-z]+\\s+\\d{4}/, '').trim();
  }"""

new_strip_logic = """  // Ensure content doesn't have redundant headers if AI generated them
  let cleanContent = content;
  if (isLetter) {
    // 1. Remove everything before the actual body (headers, dates, addresses, salutations)
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
    cleanContent = lines.slice(bodyStartIndex).join('\\n').trim();

    // 2. Remove redundant sign-offs and everything after them
    const signOffs = ['Kind regards', 'Best regards', 'Sincerely', 'Yours truly', 'Mit freundlichen Grüßen', 'MFG', 'Freundliche Grüße', 'Hochachtungsvoll', 'Viele Grüße'];
    const signOffRegex = new RegExp(`(?:${signOffs.join('|')})[\\\\s\\\\S]*$`, 'i');
    cleanContent = cleanContent.replace(signOffRegex, '').trim();
    
    // 3. Final cleanup of any remaining name at the end
    if (userProfile?.name) {
      const nameEscaped = userProfile.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      const nameRegex = new RegExp(nameEscaped + '$', 'i');
      cleanContent = cleanContent.replace(nameRegex, '').trim();
    }
  }"""

content = content.replace(old_strip_logic, new_strip_logic)

with open(file_path, 'w') as f:
    f.write(content)
