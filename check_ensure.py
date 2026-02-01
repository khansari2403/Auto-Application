
path = '/app/src/main/features/doc-generator.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
in_quote = False
quote_char = ''
in_comment = False
in_multiline = False

lines = content.split('\n')

for i, line in enumerate(lines):
    j = 0
    while j < len(line):
        char = line[j]
        if not in_quote and not in_comment and not in_multiline:
            if char == '/' and j+1 < len(line):
                if line[j+1] == '/':
                    in_comment = True
                    j += 2
                    continue
                elif line[j+1] == '*':
                    in_multiline = True
                    j += 2
                    continue
        if in_multiline:
            if char == '*' and j+1 < len(line) and line[j+1] == '/':
                in_multiline = False
                j += 2
                continue
            j += 1
            continue
        if in_comment:
            j += 1
            continue
        if char == '"' or char == "'" or char == '`':
            if not in_quote:
                in_quote = True
                quote_char = char
            elif char == quote_char:
                if j > 0 and line[j-1] == '\\':
                    pass
                else:
                    in_quote = False
        if not in_quote:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
        j += 1
    
    in_comment = False
    
    if i == 303:
        print(f"Line 304: {line.strip()} Bal: {balance}")
