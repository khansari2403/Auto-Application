import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Ensure targetLanguage is passed to buildThinkerPrompt
content = content.replace("{ motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit }", 
                         "{ motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit, targetLanguage }")

with open(file_path, 'w') as f:
    f.write(content)
