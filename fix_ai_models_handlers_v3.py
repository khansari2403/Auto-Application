import sys

file_path = 'src/main/ipc/ai-models-handlers.ts'
content = open(file_path).read()

# Let's just do a clean replacement for the update handler's field mapping
old_block = """      if (data.coverLetterWordLimit !== undefined) dbData.cover_letter_word_limit = data.coverLetterWordLimit;
      if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;"""

new_block = """      if (data.coverLetterWordLimit !== undefined) dbData.cover_letter_word_limit = data.coverLetterWordLimit;
      if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;
      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;
      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;"""

content = content.replace(old_block, new_block)

with open(file_path, 'w') as f:
    f.write(content)
