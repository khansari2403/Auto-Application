
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
            
    if 'export function generateCVHTML' in line:
        print(f"Start generateCVHTML at {i+1}. Balance: {balance}")
    if 'function saveDocumentFile' in line:
        print(f"Start saveDocumentFile at {i+1}. Balance: {balance}")
    if 'async function buildCompanyDeepDive' in line:
        print(f"Start buildCompanyDeepDive at {i+1}. Balance: {balance}")
    if 'export async function generateCompanyDeepDive' in line:
        print(f"Start generateCompanyDeepDive at {i+1}. Balance: {balance}")
        break
