import sys

file_path = 'src/main/ipc/ai-models-handlers.ts'
content = open(file_path).read()

# Add cv_page_limit to ai-models:add
content = content.replace("cover_letter_word_limit: data.coverLetterWordLimit,", 
                         "cover_letter_word_limit: data.coverLetterWordLimit,\n        cv_page_limit: data.cvPageLimit,")

# Add cv_page_limit to ai-models:update
content = content.replace("if (data.cover__letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;",
                         "if (data.cover_letter_word_limit !== undefined) dbData.cover_letter_word_limit = data.cover_letter_word_limit;\n      if (data.cvPageLimit !== undefined) dbData.cv_page_limit = data.cvPageLimit;\n      if (data.cv_page_limit !== undefined) dbData.cv_page_limit = data.cv_page_limit;")

with open(file_path, 'w') as f:
    f.write(content)
