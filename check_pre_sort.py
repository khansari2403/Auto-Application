
path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    if i == 55:
        print(f"Line 56: {line.strip()} Bal: {balance}")
