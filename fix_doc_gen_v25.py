import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Final check for targetLanguage and isGerman definition
# I'll make sure they are defined before the loop and used correctly
if "const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';" not in content:
    content = content.replace("const isGerman = germanKeywords.some(k => jobText.includes(k));", 
                             "const isGerman = germanKeywords.some(k => jobText.includes(k));\\n  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';")

with open(file_path, 'w') as f:
    f.write(content)
