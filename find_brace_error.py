
path = '/app/new_generate_cv_v3.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
lines = content.split('\n')

for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
    
    if balance != 0:
       # Print lines where balance is non-zero (careful with multi-line blocks)
       pass

print(f"Final Balance: {balance}")

# Find line where it goes to 1 and never returns
balance = 0
for i, line in enumerate(lines):
    prev_balance = balance
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            
    if balance > prev_balance:
        # potentially opening a block
        pass
    if balance > 0 and i > 300: # check towards end
        print(f"Line {i+1}: {line.strip()} (Bal: {balance})")
