import sys

file_path = 'src/components/settings/AIModelsSection.tsx'
content = open(file_path).read()

# 1. Fix formData initialization (remove duplicates)
content = content.replace("coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", "coverLetterWordLimit: '280', cvPageLimit: '2'")

# 2. Ensure cvPageLimit is in handleSave
content = content.replace("motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2', cvPageLimit: '2'", 
                         "motivationLetterWordLimit: '450', coverLetterWordLimit: '280', cvPageLimit: '2'")

# 3. Ensure cvPageLimit is in startEdit
if "cvPageLimit: model.cv_page_limit || '2'" not in content:
    content = content.replace("coverLetterWordLimit: model.cover_letter_word_limit || '280'", 
                             "coverLetterWordLimit: model.cover_letter_word_limit || '280', cvPageLimit: model.cv_page_limit || '2'")

with open(file_path, 'w') as f:
    f.write(content)
