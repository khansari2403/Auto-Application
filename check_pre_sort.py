
// If Line 57 Bal is 3.
// generateCVHTML { -> 1
// try { -> 2
// catch } -> 1
// labels = { ... } -> 1
// sidebarLabels = { ... } -> 1
// htmlLangMap = { ... } -> 1
// formatContent = ...
// cleanDate = ... { if { ... } return ... } -> 1

// So before sortDesc (line 57), balance should be 1.
// If it is 2 (3 after opening brace), then there is an open brace before sortDesc.

path = '/app/new_generate_cv_v3.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{': balance += 1
        elif char == '}': balance -= 1
    
    if i < 57 and balance > 1:
        # Check if it returns to 1
        pass
    
    if i == 55: # Line 56
        print(f"Line 56: {line.strip()} Bal: {balance}")
