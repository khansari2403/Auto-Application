
import re

path = '/app/new_generate_cv_v3.ts'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0

def clean_line(text):
    text = re.sub(r'//.*', '', text)
    # text = re.sub(r'/\*.*?\*/', '', text) # ignore multiline for now line-by-line
    text = re.sub(r"'[^']*'", "''", text)
    text = re.sub(r'"[^"]*"', '""', text)
    text = re.sub(r'`[^`]*`', '``', text)
    text = re.sub(r'/[^/\n]+/[gimsuy]*', '', text) # regex
    return text

for i, line in enumerate(lines):
    # Handle template literals spanning lines? 
    # Python naive check won't handle multiline strings well.
    # But let's try line by line cleaning.
    
    cleaned = clean_line(line)
    for char in cleaned:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            
    # Print function boundaries or blocks
    if 'function generateCVHTML' in line: print(f"{i+1} func start: {balance}")
    if 'try {' in line: print(f"{i+1} try start: {balance}")
    if '} catch' in line: print(f"{i+1} catch: {balance}")
    if 'const labels' in line: print(f"{i+1} labels: {balance}")
    if 'const cleanDate' in line: print(f"{i+1} cleanDate: {balance}")
    if 'const sortDesc' in line: print(f"{i+1} sortDesc: {balance}")
    if 'const renderExperiences' in line: print(f"{i+1} renderExp: {balance}")
    if 'const renderEducations' in line: print(f"{i+1} renderEdu: {balance}")
    if 'if (isMimicPersona)' in line: print(f"{i+1} mimic: {balance}")
    if 'return `<!DOCTYPE html>' in line: print(f"{i+1} return: {balance}")
    
    if i == 421: # last line
        print(f"End: {balance}")
