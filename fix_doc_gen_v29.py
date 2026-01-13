import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Fix generateSingleDocument
# We'll replace the entire function to be safe
func_pattern = r"export async function generateSingleDocument\([\s\S]*?\}\n$"
match = re.search(func_pattern, content)

if match:
    new_func = """export async function generateSingleDocument(
  jobId: number, 
  userId: number, 
  docType: string, 
  thinker: any, 
  auditor: any, 
  callAI: Function
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const db = getDatabase();
  const job = db.job_listings?.find((j: any) => String(j.id) === String(jobId));
  const userProfile = db.user_profile?.find((p: any) => p.id === userId) || db.user_profile?.[0];
  
  if (!job) return { success: false, error: 'Job not found' };
  if (!userProfile) return { success: false, error: 'User profile not found' };
  
  const options: any = {};
  const typeConfig = DOC_TYPES.find(t => t.key === docType);
  if (typeConfig) {
    options[typeConfig.optionKey] = true;
  }
  
  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI);
  
  // Refresh job data to get file path
  const updatedJob = db.job_listings?.find((j: any) => String(j.id) === String(jobId));
  const filePath = updatedJob?.[`${docType}_path`];
  
  if (filePath) {
    return { success: true, filePath };
  }
  
  return { success: false, error: 'Document generation failed' };\n}"""
    content = content.replace(match.group(0), new_func)

with open(file_path, 'w') as f:
    f.write(content)
