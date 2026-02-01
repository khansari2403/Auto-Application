
path = '/app/src/main/features/doc-generator.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

balance = 0
lines = content.split('\n')

for i, line in enumerate(lines):
    # Count braces
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            
    if 'async function validateAndFixCVLanguage' in line:
        print(f"Start validateAndFixCVLanguage at {i+1}. Balance: {balance}")
    if 'function stripLetterGreetingAndClosing' in line:
        print(f"Start stripLetterGreetingAndClosing at {i+1}. Balance: {balance}")
    if 'export function generateDocumentHTML' in line:
        print(f"Start generateDocumentHTML at {i+1}. Balance: {balance}")
    if 'function normalizeCvText' in line:
        print(f"Start normalizeCvText at {i+1}. Balance: {balance}")
    if 'export function generateCVHTML' in line:
        print(f"Start generateCVHTML at {i+1}. Balance: {balance}")
        break
