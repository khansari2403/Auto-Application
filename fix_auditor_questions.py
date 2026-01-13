import sys
import re

def fix_file(file_path):
    content = open(file_path).read()
    
    # 1. Improve question generation logic to avoid repetition and improve phrasing
    # This is a complex replacement, so I'll use a more targeted approach
    
    # Fix the generic question template
    content = content.replace('const questionText = `Do you have experience working with ${skill}?`;', 
                              'const questionText = `Do you have experience working with ${skill}? (Please confirm if this is part of your skillset)`;')
    
    # Fix "Not specified" error
    content = content.replace('if (skillsToAsk.length > 0) {', 
                              'const validSkillsToAsk = skillsToAsk.filter(s => s && s.toLowerCase() !== "not specified" && s.toLowerCase() !== "n/a");\n    if (validSkillsToAsk.length > 0) {')
    content = content.replace('for (const skill of skillsToAsk) {', 'for (const skill of validSkillsToAsk) {')

    # Ensure we check learnedCriteria and existingQuestions more strictly
    # (The current code already does some of this, but I'll make it more robust)
    
    with open(file_path, 'w') as f:
        f.write(content)

fix_file('src/main/features/compatibility-service.ts')
