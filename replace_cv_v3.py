
import os

path_source = '/app/src/main/features/doc-generator.ts'
path_new = '/app/new_generate_cv_v3.ts'

with open(path_source, 'r', encoding='utf-8') as f:
    source = f.read()

with open(path_new, 'r', encoding='utf-8') as f:
    new_content = f.read()

start_marker = 'export function generateCVHTML('
end_marker = 'function saveDocumentFile('

start_idx = source.find(start_marker)
end_idx = source.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Markers not found: start={start_idx}, end={end_idx}")
    exit(1)

comment_marker = '// Save document to file'
comment_idx = source.find(comment_marker, start_idx)

if comment_idx != -1 and comment_idx < end_idx:
    end_idx = comment_idx

final_content = source[:start_idx] + new_content + "\n\n" + source[end_idx:]

with open(path_source, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Successfully replaced generateCVHTML with feature updates")
