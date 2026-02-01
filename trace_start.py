
path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    prev = balance
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    if i == 56: # line 57
        print(f"Line 57: {line.strip()} Bal: {balance}")
    if i == 99: # line 100
        print(f"Line 100: {line.strip()} Bal: {balance}")
    if i == 180:
        print(f"Line 181: {line.strip()} Bal: {balance}")
