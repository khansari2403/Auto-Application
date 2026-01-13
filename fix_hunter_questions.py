import sys
import re

file_path = 'src/main/features/Hunter-engine.ts'
content = open(file_path).read()

# Improve question phrasing for different categories
content = content.replace('question: `Do you speak ${langCapitalized}?`,', 
                         'question: `Are you proficient in ${langCapitalized}? (Required for this position)`,')

content = content.replace('question: `Do you have ${name}?`,',
                         'question: `Do you hold a valid ${name}? (This certification is mentioned in the job description)`,')

# Fix "Not specified" and repetition
# I'll wrap the question generation in a check for valid criteria
content = content.replace('for (const { question, criteria, category } of questionsToInsert) {',
                         'for (const { question, criteria, category } of questionsToInsert) {\n      if (!criteria || criteria.toLowerCase().includes("not_specified")) continue;')

with open(file_path, 'w') as f:
    f.write(content)
