
// Trace from line 1
path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    prev = balance
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    if balance > 1 and i < 50:
       # Check where it increased.
       pass
    
    # Check after try-catch block (lines 15-22)
    if i == 22:
        print(f"Line 23: {line.strip()} Bal: {balance}")
