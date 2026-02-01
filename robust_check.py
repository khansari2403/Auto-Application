
import re

path = '/app/new_generate_cv_v3.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove comments
content = re.sub(r'//.*', '', content)
content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

# Remove strings
content = re.sub(r"'[^']*'", "''", content)
content = re.sub(r'"[^"]*"', '""', content)
content = re.sub(r'`[^`]*`', '``', content)

# Remove regex literals (simple heuristic: /.../g)
content = re.sub(r'/[^/\n]+/[gimsuy]*', '', content)

balance = 0
for i, char in enumerate(content):
    if char == '{':
        balance += 1
    elif char == '}':
        balance -= 1

print(f"Robust Balance: {balance}")
