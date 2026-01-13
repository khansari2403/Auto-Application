import sys
import re

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# 1. Add cv_page_limit to generateTailoredDocs
content = content.replace("const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';", 
                         "const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';\n  const cvPageLimit = thinker?.cv_page_limit || '2';")

content = content.replace("{ motivationLetterWordLimit, coverLetterWordLimit }", 
                         "{ motivationLetterWordLimit, coverLetterWordLimit, cvPageLimit }")

# 2. Update buildThinkerPrompt to include cvPageLimit and relevant certificates instruction
content = content.replace("wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string }",
                         "wordLimits?: { motivationLetterWordLimit: string; coverLetterWordLimit: string; cvPageLimit?: string }")

content = content.replace("const coverWordLimit = wordLimits?.coverLetterWordLimit || '280';",
                         "const coverWordLimit = wordLimits?.coverLetterWordLimit || '280';\n  const cvPageLimit = wordLimits?.cvPageLimit || '2';")

# Update CV prompt for page limit and relevant certificates
cv_prompt_update = """NOTE: CV generation MUST NOT exceed ${cvPageLimit} pages.
REQUIREMENTS:
1. Tailor the CV specifically to the job requirements
2. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile
3. Use action verbs and quantify achievements where the data exists in the profile
4. Keep it ATS-friendly (no tables, columns, graphics)
5. Include contact information at the top (from the profile)
6. Language: Match the job description language
7. Structure: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications, Languages
8. CERTIFICATIONS: Include ONLY certifications that are relevant to this specific position. Do not list irrelevant ones."""

content = content.replace("NOTE: CV generation is NOT subject to word limits. Use the full profile data.\\n\\nREQUIREMENTS:\\n1. Tailor the CV specifically to the job requirements\\n2. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile\\n3. Use action verbs and quantify achievements where the data exists in the profile\\n4. Keep it ATS-friendly (no tables, columns, graphics)\\n5. Include contact information at the top (from the profile)\\n6. Language: Match the job description language\\n7. Structure: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications, Languages", 
                         cv_prompt_update)

# 3. Update generateCVHTML to include photo
content = content.replace("${userProfile?.photo ? `<img src=\\\"${userProfile.photo}\\\" class=\\\"header-photo\\\" alt=\\\"Photo\\\">` : ''}",
                         "${userProfile?.photo ? `<img src=\\\"${userProfile.photo}\\\" class=\\\"header-photo\\\" alt=\\\"Photo\\\" style=\\\"width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #0077b5;\\\">` : ''}")

# 4. Convert to PDF immediately after saving HTML
content = content.replace("await logAction(userId, 'ai_thinker', `📄 ${type.label} saved to: ${filePath}`, 'completed', true);",
                         """await logAction(userId, 'ai_thinker', `📄 ${type.label} saved to: ${filePath}`, 'completed', true);
          
          // Convert to PDF immediately
          try {
            const { convertHtmlToPdf } = require('./pdf-export');
            const pdfResult = await convertHtmlToPdf(filePath, userId);
            if (pdfResult.success) {
              await runQuery('UPDATE job_listings', { 
                id: String(job.id), 
                [`${type.key}_path`]: pdfResult.pdfPath 
              });
              await logAction(userId, 'pdf', `✅ PDF created: ${pdfResult.pdfPath}`, 'completed', true);
            }
          } catch (pdfErr) {
            console.error('Auto-PDF conversion failed:', pdfErr);
          }""")

with open(file_path, 'w') as f:
    f.write(content)
