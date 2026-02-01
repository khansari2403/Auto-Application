
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
            
    if 'const sortDesc =' in line:
        print(f"Start sortDesc at {i+1}. Balance: {balance}")
    if 'const renderExperiences =' in line:
        print(f"Start renderExperiences at {i+1}. Balance: {balance}")
    if 'const renderEducations =' in line:
        print(f"Start renderEducations at {i+1}. Balance: {balance}")
    if 'const summaryText =' in line:
        print(f"Start summaryText at {i+1}. Balance: {balance}")
    if 'if (isMimicPersona)' in line:
        print(f"Start isMimicPersona at {i+1}. Balance: {balance}")
    if 'const skills = userProfile?.skills' in line:
        print(f"Start Layout 2 at {i+1}. Balance: {balance}")
