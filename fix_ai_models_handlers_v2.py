import sys

file_path = 'src/main/ipc/ai-models-handlers.ts'
content = open(file_path).read()

# Fix the typo in my previous replacement and add the missing field
content = content.replace("if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;",
                         "if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;\\n      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;\\n      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;")

with open(file_path, 'w') as f:
    f.write(content)
