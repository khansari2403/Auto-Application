
import fs

path_source = '/app/src/main/features/doc-generator.ts'
path_new = '/app/new_generate_cv.ts'

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

# Find the last closing brace before saveDocumentFile.
# Actually, the original code had saveDocumentFile right after.
# I will cut until `end_idx` which starts `function saveDocumentFile`.
# But I need to include the newline before it.

# The new content replaces everything from start_marker UP TO end_marker.
# But `new_content` contains the closing `}` of generateCVHTML.
# `source[end_idx]` is the start of `function saveDocumentFile`.
# So replacing `source[start_idx:end_idx]` should work, assuming I didn't leave any extra braces.

# Let's check if there's any garbage between the end of generateCVHTML and start of saveDocumentFile in source.
# There was `// Save document to file...`.
# I should preserve that comment if possible, but it's not critical.

# Better: Find the exact position of `// Save document to file` if it exists.
comment_marker = '// Save document to file'
comment_idx = source.find(comment_marker, start_idx)

if comment_idx != -1 and comment_idx < end_idx:
    end_idx = comment_idx

final_content = source[:start_idx] + new_content + "\n\n" + source[end_idx:]

with open(path_source, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Successfully replaced generateCVHTML")
