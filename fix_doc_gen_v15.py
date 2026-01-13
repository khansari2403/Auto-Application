import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Ensure generateDocumentHTML uses the correct salutation and closing based on isGerman
# I'll replace the hardcoded "Dear Hiring Manager" in the template
content = content.replace('<div class="salutation">Dear Hiring Manager,</div>', 
                         '<div class="salutation">${salutation}</div>')

content = content.replace('<div class="closing">Kind regards,</div>',
                         '<div class="closing">${closing}</div>')

with open(file_path, 'w') as f:
    f.write(content)
