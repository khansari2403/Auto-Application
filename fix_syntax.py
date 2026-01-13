import sys

file_path = 'src/main/ipc/ai-models-handlers.ts'
content = open(file_path).read()

# Fix the literal \n and redundant lines
old_block = """      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;
      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;\\n      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;\\n      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;"""

new_block = """      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;
      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;"""

content = content.replace(old_block, new_block)

with open(file_path, 'w') as f:
    f.write(content)
