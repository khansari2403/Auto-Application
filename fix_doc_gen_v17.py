import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Ensure isGerman is passed to generateTailoredDocs if needed, 
# but actually generateTailoredDocs defines its own isGerman now.
# Let's check the calls inside generateTailoredDocs.

# I'll make sure the calls to generateDocumentHTML and generateCVHTML use the isGerman defined at the top of generateTailoredDocs.
# (This was already done in v12, but let's verify)

# One more thing: the user said CV is still in English.
# I'll add a very strong instruction to the CV prompt.
content = content.replace("CRITICAL: You MUST write the CV in the SAME LANGUAGE as the job description. If the job is in German, the CV MUST be in German.",
                         "CRITICAL LANGUAGE REQUIREMENT: You MUST write the entire CV in ${targetLanguage}. This includes all section headings, job descriptions, and summaries. If the job description is in German, the CV MUST be 100% in German.")

with open(file_path, 'w') as f:
    f.write(content)
