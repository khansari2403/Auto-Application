import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. More aggressive stripping of AI-generated headers/closings
old_strip = """    // Remove common AI-generated headers that we already provide in the template
    cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte|Sehr geehrter|Hallo|Guten Tag)[^,:]*[,:]/i, '').trim();
    // Remove redundant sign-offs and everything after them
    cleanContent = cleanContent.replace(/(Kind regards|Best regards|Sincerely|Yours truly|Mit freundlichen Grüßen|MFG|Freundliche Grüße)[\\s\\S]*$/i, '').trim();"""

new_strip = """    // Remove common AI-generated headers that we already provide in the template
    // This regex is more aggressive to catch multiple lines of headers
    cleanContent = cleanContent.replace(/^(?:Date|To|From|Subject|Attention|Dear|Sehr geehrte|Sehr geehrter|Hallo|Guten Tag)[\\s\\S]*?[,:]/i, '').trim();
    
    // Remove redundant sign-offs and everything after them
    // We look for common sign-offs and strip everything from that point to the end of the string
    const signOffs = ['Kind regards', 'Best regards', 'Sincerely', 'Yours truly', 'Mit freundlichen Grüßen', 'MFG', 'Freundliche Grüße', 'Hochachtungsvoll'];
    const signOffRegex = new RegExp(`(?:${signOffs.join('|')})[\\\\s\\\\S]*$`, 'i');
    cleanContent = cleanContent.replace(signOffRegex, '').trim();"""

content = content.replace(old_strip, new_strip)

# 2. Ensure language matching is robust in prompts
# I'll add a specific instruction to the baseContext or at the start of each prompt
content = content.replace("const baseContext = `", 
                         "const baseContext = `\\nLANGUAGE REQUIREMENT: You MUST write the entire document in the SAME LANGUAGE as the job description provided below. If the job is in German, write in German. If in English, write in English. This is CRITICAL.\\n")

with open(file_path, 'w') as f:
    f.write(content)
