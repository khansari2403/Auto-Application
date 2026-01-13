import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Refine prompts to strictly forbid AI-generated headers/closings
content = content.replace('9. Output ONLY the letter content, starting with the date and recipient. DO NOT include your own header if the system provides one.', 
                         '9. Output ONLY the letter body content. DO NOT include a date, recipient address, salutation (like \"Dear...\"), or closing (like \"Kind regards\"). The system will provide these automatically.')

content = content.replace('5. Output ONLY the letter content, starting with \"Dear Hiring Manager\" or similar. DO NOT include your own header.',
                         '5. Output ONLY the letter body content. DO NOT include a salutation (like \"Dear...\") or closing (like \"Kind regards\"). The system will provide these automatically.')

# 2. Update generateDocumentHTML to be more robust
# I'll make sure the salutation and closing are ONLY in the template
content = content.replace('cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte)[^,:]*[,:]/i, \\'\\').trim();',
                         'cleanContent = cleanContent.replace(/^(Dear|To|Attention|Sehr geehrte|Sehr geehrter|Hallo)[^,:]*[,:]/i, \\'\\').trim();')

# 3. Ensure PDF conversion uses the correct path and handles errors better
content = content.replace("const { convertHtmlToPdf } = require('./pdf-export');",
                         "const { convertHtmlToPdf } = require('./pdf-export');")

with open(file_path, 'w') as f:
    f.write(content)
