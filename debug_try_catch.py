
path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    if i < 14 or i > 23: continue
    
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    print(f"Line {i+1}: {line.strip()} Bal: {balance}")
