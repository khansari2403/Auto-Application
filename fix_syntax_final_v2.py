import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Fix the missing bracket in the rejection reason update
content = content.replace("[`${type.key}_rejection_reason`: null }", "[`${type.key}_rejection_reason`]: null }")

with open(file_path, 'w') as f:
    f.write(content)
