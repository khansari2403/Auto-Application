
import os

path = '/app/src/main/features/doc-generator.ts'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Range to delete: 
# Start: Line 1817 (index 1816). content: `,1. Tailor...`
# End: Line 1842 (index 1841). content: `... curly braces.`, `

# Verify content
line_start = lines[1816]
if ',1. Tailor' not in line_start:
    print(f"Start line mismatch: {line_start}")
    exit(1)

line_end = lines[1841]
if 'curly braces.`,' not in line_end:
    print(f"End line mismatch: {line_end}")
    # It might be on a different line index if I miscounted.
    # Let's search for the end marker.
    for i in range(1816, len(lines)):
        if 'curly braces.`,' in lines[i]:
            print(f"Found end at {i+1}")
            end_index = i
            break
    else:
        print("End marker not found")
        exit(1)
else:
    end_index = 1841

# Fix start line
# Keep the ` at the start (from the previous prompt closing)
# The line looks like: `    `,1. Tailor...` (maybe indentation?)
# view_file showed: ``,1. Tailor...`
# If I just split on the first comma?

# Actually, I want to keep the backtick.
# And replace everything after it with a comma (for the object property separator).
parts = line_start.split('`,')
# parts[0] is indentation + backtick?
# No, `view_file` showed content starts at ``,1.`
# Wait, line 1817 in view_file was:
# 1817|`,1. Tailor...
# This means the line starts with backtick.
# So I should keep the backtick.

lines[1816] = lines[1816].split('`,')[0] + '`,\n'

# Delete intermediate lines
# Delete from 1817 to end_index (inclusive? no, end_index is the line with curly braces.` which I want to remove completely?)
# The end line is `... braces.`, `
# I want to remove that line too?
# Yes, because I added the comma in line 1816.

# So delete lines 1817 (index 1817) up to end_index (inclusive).
del lines[1817 : end_index + 1]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Cleanup successful")
