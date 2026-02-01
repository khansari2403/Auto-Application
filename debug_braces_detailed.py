
path = '/app/new_generate_cv_v3.ts'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
    
    # Print if balance seems wrong (e.g. nested deeply unexpectedly) or just every 20 lines
    # Also look for function definitions to see if they start at expected balance
    if 'if (isMimicPersona)' in line:
        print(f"Line {i+1}: isMimicPersona (Bal: {balance})")
    if 'return `<!DOCTYPE html>' in line:
        print(f"Line {i+1}: return HTML (Bal: {balance})")
    
    # If we hit the end of the isMimicPersona block (line 344 approx)
    if i == 343:
         print(f"Line {i+1}: {line.strip()} (Bal: {balance})")

print(f"Final: {balance}")
