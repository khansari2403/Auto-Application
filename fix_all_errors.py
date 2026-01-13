import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Clean up generateTailoredDocs
# We'll replace the entire function to be safe
func_pattern = r"export async function generateTailoredDocs\(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function\) \{[\s\S]*?\}\n\n// Build Thinker prompt"
match = re.search(func_pattern, content)

if match:
    new_func = """export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();
  
  // Detect language from job description
  const jobText = (job.job_title + ' ' + (job.description || '')).toLowerCase();
  const germanKeywords = ['kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'entwickler', 'ingenieur', 'manager', 'abschluss', 'studium', 'bewerbung', 'anschreiben', 'lebenslauf'];
  const isGerman = germanKeywords.some(k => jobText.includes(k));
  const targetLanguage = isGerman ? 'GERMAN' : 'ENGLISH';
  
  // Get profile based on Thinker's source settings
  let userProfile = await getProfileByThinkerSource(userId, thinker);
  
  if (!userProfile) {
    await logAction(userId, 'ai_thinker', '❌ No user profile found. Please create your profile first.', 'failed', false);
    return;
  }

  // Robust parsing of profile fields (handle both JSON strings and objects)
  const parseField = (field: any) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch (e) { return []; }
    }
    return [];
  };

  userProfile = {
    ...userProfile,
    experiences: parseField(userProfile.experiences),
    educations: parseField(userProfile.educations),
    skills: parseField(userProfile.skills),
    licenses: parseField(userProfile.licenses),
    languages: parseField(userProfile.languages)
  };

  // Get word limits from Thinker settings
  const motivationLetterWordLimit = thinker?.motivation_letter_word_limit || '450';
  const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';
  const cvPageLimit = thinker?.cv_page_limit || '2';

  // Step 0: Research Company
  let companyResearch = "";
  try {
    await logAction(userId, 'ai_thinker', `🔍 Researching ${job.company_name} mission and history...`, 'in_progress');
    companyResearch = await getCompanyInfo(job.company_name, userId, callAI);
  } catch (e) {
    console.error("Research failed:", e);
    companyResearch = "Research unavailable.";
  }

  for (const type of DOC_TYPES) {
    if (options[type.optionKey]) {
      try {
        await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');
        await runQuery('UPDATE job_listings', { id: String(job.id), [`${type.key}_status`]: 'generating', [`${type.key}_rejection_reason`: null });

        await logAction(userId, 'ai_thinker', `✍️ Generating ${type.label} (Auditor disabled - user choice respected)`, 'in_progress');
        
        // Build the prompt based on document type with custom word limits
        const thinkerPrompt = buildThinkerPrompt(
          type.key, 
          type.label, 
          userProfile, 
          job, 
          companyResearch, 
          '', 
          { motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit, targetLanguage }
        );
        
        let rawContent = await callAI(thinker, thinkerPrompt);
        
        if (!rawContent || rawContent.startsWith('Error:')) {
          throw new Error(rawContent || 'AI returned empty content');
        }
        
        const content = cleanAIOutput(rawContent);
        await logAction(userId, 'ai_thinker', `✅ ${type.label} generated successfully`, 'completed', true);

        // Generate HTML file
        let htmlContent: string;
        if (type.key === 'cv') {
          htmlContent = generateCVHTML(content, userProfile, job, isGerman);
        } else {
          htmlContent = generateDocumentHTML(content, type.label, userProfile, job, isGerman);
        }
        
        const filePath = saveDocumentFile(htmlContent, job.id, type.key, 'html', job.company_name, job.job_title);
        
        const docId = Date.now() + Math.floor(Math.random() * 1000);
        await runQuery('INSERT INTO documents', {
          id: docId,
          job_id: String(job.id),
          user_id: userId,
          document_type: type.key,
          content: content,
          file_path: filePath,
          version: 1,
          status: 'final',
          created_at: new Date().toISOString()
        });

        await runQuery('UPDATE job_listings', { 
          id: String(job.id), 
          [`${type.key}_status`]: 'auditor_done',
          [`${type.key}_path`]: filePath,
          [`${type.key}_rejection_reason`]: null
        });
        
        await logAction(userId, 'ai_thinker', `📄 ${type.label} saved to: ${filePath}`, 'completed', true);
        
        // Convert to PDF immediately
        try {
          const { convertHtmlToPdf } = require('./pdf-export');
          const pdfResult = await convertHtmlToPdf(filePath, userId);
          
          if (pdfResult.success && pdfResult.pdfPath) {
            await runQuery('UPDATE job_listings', { 
              id: String(job.id), 
              [`${type.key}_path`]: pdfResult.pdfPath 
            });
            await runQuery('UPDATE documents', {
              id: docId,
              file_path: pdfResult.pdfPath
            });
            await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
          }
        } catch (pdfErr) {
          console.error('Auto-PDF conversion failed:', pdfErr);
        }

      } catch (e: any) {
        console.error(`Error generating ${type.key}:`, e);
        await runQuery('UPDATE job_listings', { id: String(job.id), [`${type.key}_status`]: 'failed' });
        await logAction(userId, 'ai_thinker', `❌ Error: ${e.message}`, 'failed', false);
      }
    }
  }
}"""
    content = content.replace(match.group(0), new_func + "\n\n// Build Thinker prompt")

# 2. Clean up generateSingleDocument
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
  
  return { success: false, error: 'Document generation failed' };
}"""
    content = content.replace(match.group(0), new_func)

with open(file_path, 'w') as f:
    f.write(content)
