
path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    prev = balance
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    if i == 22:
        print(f"Line 23: {line.strip()} Bal: {balance}")
    if i == 33:
        print(f"Line 34: {line.strip()} Bal: {balance}")
    if i == 43:
        print(f"Line 44: {line.strip()} Bal: {balance}")
    if i == 47:
        print(f"Line 48: {line.strip()} Bal: {balance}")
    if i == 54:
        print(f"Line 55: {line.strip()} Bal: {balance}")
