
// Check for unbalanced braces in doc-generator.ts, ignoring strings/comments (simple approach)
// We will track quote state.

path = '/app/src/main/features/doc-generator.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
in_quote = False
quote_char = ''
in_comment = False # single line //
in_multiline = False # /* */

lines = content.split('\n')

for i, line in enumerate(lines):
    j = 0
    while j < len(line):
        char = line[j]
        
        # Comments
        if not in_quote and not in_comment and not in_multiline:
            if char == '/' and j+1 < len(line):
                if line[j+1] == '/':
                    in_comment = True
                    j += 1
                elif line[j+1] == '*':
                    in_multiline = True
                    j += 1
        
        elif in_multiline:
            if char == '*' and j+1 < len(line) and line[j+1] == '/':
                in_multiline = False
                j += 1
        
        # Quotes
        if not in_comment and not in_multiline:
            if char == '"' or char == "'" or char == '`':
                if not in_quote:
                    in_quote = True
                    quote_char = char
                elif char == quote_char:
                    # Check for escaped quote? Naive check
                    if j > 0 and line[j-1] == '\\':
                        pass # escaped
                    else:
                        in_quote = False
        
        # Braces
        if not in_quote and not in_comment and not in_multiline:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
        
        j += 1
    
    # Reset single line comment
    in_comment = False
    
    if 'export async function generateCompanyDeepDive' in line:
        print(f"Line {i+1}: generateCompanyDeepDive. Balance: {balance}")
        # if balance != 0: break 

print(f"Final Balance: {balance}")
