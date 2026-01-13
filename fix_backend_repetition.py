import sys

def fix_file(file_path):
    content = open(file_path).read()
    
    # Ensure we check for existing questions before adding new ones
    # This is already partially there, but I'll make it more robust
    
    # In compatibility-service.ts
    if 'compatibility-service.ts' in file_path:
        content = content.replace("!existingQuestions.some((q: any) => q.criteria === criteriaKey);",
                                 "!existingQuestions.some((q: any) => q.criteria === criteriaKey) && !learnedCriteria.some((c: any) => c.criteria === criteriaKey);")
    
    with open(file_path, 'w') as f:
        f.write(content)

fix_file('src/main/features/compatibility-service.ts')
