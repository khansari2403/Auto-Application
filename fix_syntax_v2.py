import sys

file_path = 'src/main/ipc/ai-models-handlers.ts'
content = open(file_path).read()

# Fix the literal \n and redundant lines in the update handler
import re

# Find the block of if statements for cvPageLimit
pattern = r"if \(data\.cvPageLimit !== undefined\) dbData\.cv_page_limit = data\.cvPageLimit;\s+if \(data\.cv_page_limit !== undefined\) dbData\.cv_page_limit = data\.cv_page_limit;\\n\s+if \(data\.cvPageLimit !== undefined\) dbData\.cv_page_limit = data\.cvPageLimit;\\n\s+if \(data\.cv_page_limit !== undefined\) dbData\.cv_page_limit = data\.cv_page_limit;"

replacement = """if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;
      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;"""

content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
