
path = '/app/src/main/features/doc-generator.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'validateAndFixCVLanguage' in content:
    print("validateAndFixCVLanguage found.")
else:
    print("validateAndFixCVLanguage MISSING!")

if 'export async function generateCompanyDeepDive' in content:
    print("generateCompanyDeepDive found.")
