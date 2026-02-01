
path = '/app/src/main/features/doc-generator.ts'

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
    
    # Check if we are at the line of generateCompanyDeepDive
    if 'export async function generateCompanyDeepDive' in line:
        print(f"Line {i+1}: generateCompanyDeepDive found. Balance: {balance}")
        if balance != 0:
            print("ERROR: Balance should be 0 here!")
            # Backtrack to find where it went wrong?
            # It's hard to know where it went wrong without parsing.
            # But we know it should be 0.
            
    if balance < 0:
        print(f"Line {i+1}: Negative balance! {balance}")
        break

print(f"Final balance: {balance}")
