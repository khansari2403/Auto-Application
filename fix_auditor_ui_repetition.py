import sys

file_path = 'src/components/AuditorQAPanel.tsx'
content = open(file_path).read()

# Filter out duplicate criteria in yes/no groups
content = content.replace("const yesCriteria = learnedCriteria.filter(c => (c.userAnswer === 'yes' || (c as any).user_answer === 'yes'));",
                         "const yesCriteria = Array.from(new Map(learnedCriteria.filter(c => (c.userAnswer === 'yes' || (c as any).user_answer === 'yes')).map(c => [c.criteria, c])).values());")

content = content.replace("const noCriteria = learnedCriteria.filter(c => (c.userAnswer === 'no' || (c as any).user_answer === 'no'));",
                         "const noCriteria = Array.from(new Map(learnedCriteria.filter(c => (c.userAnswer === 'no' || (c as any).user_answer === 'no')).map(c => [c.criteria, c])).values());")

with open(file_path, 'w') as f:
    f.write(content)
