import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Refine prompts
content = content.replace('9. Output ONLY the letter content, starting with the date and recipient. DO NOT include your own header if the system provides one.', 
                         '9. Output ONLY the letter body content. DO NOT include a date, recipient address, salutation (like "Dear..."), or closing (like "Kind regards"). The system will provide these automatically.')

content = content.replace('5. Output ONLY the letter content, starting with "Dear Hiring Manager" or similar. DO NOT include your own header.',
                         '5. Output ONLY the letter body content. DO NOT include a salutation (like "Dear...") or closing (like "Kind regards"). The system will provide these automatically.')

# 2. Update generateDocumentHTML
# We'll use a more robust regex to strip AI-generated headers/closings
old_strip = """    // Remove common AI-generated headers that we already provide in the template
    cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte)[^,:]*[,:]/i, '').trim();
    // Remove redundant sign-offs
    cleanContent = cleanContent.replace(/(Kind regards|Best regards|Sincerely|Mit freundlichen Grüßen|MFG)[^.]*$/i, '').trim();"""

new_strip = """    // Remove common AI-generated headers that we already provide in the template
    cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte|Sehr geehrter|Hallo|Guten Tag)[^,:]*[,:]/i, '').trim();
    // Remove redundant sign-offs and everything after them
    cleanContent = cleanContent.replace(/(Kind regards|Best regards|Sincerely|Yours truly|Mit freundlichen Grüßen|MFG|Freundliche Grüße)[\\s\\S]*$/i, '').trim();"""

content = content.replace(old_strip, new_strip)

with open(file_path, 'w') as f:
    f.write(content)
