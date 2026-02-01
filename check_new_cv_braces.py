
path = '/app/new_generate_cv_v3.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
for char in content:
    if char == '{':
        balance += 1
    elif char == '}':
        balance -= 1

print(f"Balance: {balance}")
