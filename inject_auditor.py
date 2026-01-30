
import os

path = '/app/src/main/features/doc-generator.ts'

# New logic for the loop body
new_logic = """    try {
      await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');
      await runQuery('UPDATE job_listings', {
        id: String(job.id),
        [`${type.key}_status`]: 'generating',
        [`${type.key}_rejection_reason`]: null
      });

      let attempts = 0;
      const maxAttempts = 3;
      let currentFeedback = '';
      let isVerified = false;
      let finalContent = '';

      // Retry Loop for Auditor Verification
      while (attempts < maxAttempts && !isVerified) {
        attempts++;
        
        if (attempts > 1) {
           await logAction(userId, 'ai_auditor', `🔄 Auditor requested changes. Retrying (${attempts}/${maxAttempts})...`, 'in_progress');
        }

        const thinkerPrompt = buildThinkerPrompt({
          docKey: type.key,
          docLabel: type.label,
          userProfile: filteredProfile,
          job,
          companyResearch,
          companyDeepDive,
          feedback: currentFeedback,
          constraints: {
            motivationLetterWordLimit,
            coverLetterWordLimit,
            cvPageLimit,
            targetLanguage,
            isGerman,
            cvStylePersona: thinker?.cv_style_persona || thinker?.cvStylePersona || 'Classic',
            referenceCvId: thinker?.reference_cv_id || thinker?.referenceCvId || ''
          }
        });

        const rawContent = await callAI(thinker, thinkerPrompt);
        if (!rawContent || String(rawContent).startsWith('Error:')) {
          throw new Error(rawContent || 'AI returned empty content');
        }

        let content = rawContent;
        if (type.key === 'cv') {
          // For CVs, we expect JSON. Only strip markdown fences.
          content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        } else {
          content = cleanAIOutput(rawContent);
          // Safety net: verify the AI body language matches the JD language.
          // If mismatch, automatically retry ONCE with extra-strict language instructions.
          content = await ensureTargetLanguageOrRetry({
            content,
            lang3,
            targetLanguage,
            callAI,
            thinker,
            originalPrompt: thinkerPrompt
          });
        }

        // For letters, ensure we never double greeting/closing
        if (type.key === 'motivation_letter' || type.key === 'cover_letter') {
          content = stripLetterGreetingAndClosing(content, isGerman);
        }

        // AUDITOR CHECK
        if (auditor) {
            const auditorPrompt = buildVerificationPrompt(type.key, type.label, content, filteredProfile);
            const auditorResponse = await callAI(auditor, auditorPrompt);
            
            if (auditorResponse && auditorResponse.includes("VERIFIED")) {
                isVerified = true;
                finalContent = content;
                await logAction(userId, 'ai_auditor', `✅ Auditor approved ${type.label}`, 'info');
            } else {
                const reason = auditorResponse ? auditorResponse.replace("FABRICATION DETECTED:", "").trim() : "Unknown verification error";
                currentFeedback = reason;
                
                if (attempts === maxAttempts) {
                    finalContent = content;
                    await logAction(userId, 'ai_auditor', `⚠️ Auditor validation failed after ${maxAttempts} attempts. Saving best effort.`, 'warning');
                }
            }
        } else {
            // No auditor configured, skip verification
            isVerified = true;
            finalContent = content;
        }
      }

      let content = finalContent;
      if (!content) throw new Error("Failed to generate content after Auditor checks.");

      await logAction(userId, 'ai_thinker', `✅ ${type.label} generated successfully`, 'completed', true);

      // Generate HTML file - pass targetLanguage and persona for proper localization & layout
      const htmlContent = type.key === 'cv'
        ? generateCVHTML(
            content,
            filteredProfile,
            job,
            isGerman,
            targetLanguage,
            thinker?.cv_style_persona || thinker?.cvStylePersona || 'Classic'
          )
        : generateDocumentHTML(content, type.label, filteredProfile, job, isGerman, targetLanguage);

      const htmlPath = saveDocumentFile(
        htmlContent,
        job.id,
        type.key,
        'html',
        job.company_name,
        job.job_title,
        dateFolder
      );

      const docId = Date.now() + Math.floor(Math.random() * 1000);
      await runQuery('INSERT INTO documents', {
        id: docId,
        job_id: String(job.id),
        user_id: userId,
        document_type: type.key,
        content: content,
        file_path: htmlPath,
        version: 1,
        status: 'final',
        created_at: new Date().toISOString()
      });

      // Save HTML path to job_listings
      await runQuery('UPDATE job_listings', {
        id: String(job.id),
        [`${type.key}_status`]: 'auditor_done',
        [`${type.key}_path`]: htmlPath,
        [`${type.key}_rejection_reason`]: null
      });

      await logAction(userId, 'ai_thinker', `📄 ${type.label} saved (HTML): ${htmlPath}`, 'completed', true);

      // Convert to PDF immediately
      try {
        const { convertHtmlToPdf } = await import('./pdf-export');
        console.log(`[PDF] Starting conversion for: ${htmlPath}`);
        const pdfResult = await convertHtmlToPdf(htmlPath, userId);

        if (pdfResult.success && pdfResult.pdfPath) {
          // Save pdfPath separately (do NOT overwrite html path)
          await runQuery('UPDATE job_listings', {
            id: String(job.id),
            [`${type.key}_pdf_path`]: pdfResult.pdfPath
          });

          // Update documents row to the PDF path (the user asked for resulting .pdf path saved)
          await runQuery('UPDATE documents', {
            id: docId,
            file_path: pdfResult.pdfPath
          });

          await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
          console.log(`[PDF] Success: ${pdfResult.pdfPath}`);
        } else {
          console.error(`[PDF] Conversion failed: ${pdfResult.error || 'Unknown error'}`);
          await logAction(userId, 'pdf', `⚠️ PDF conversion failed: ${pdfResult.error || 'Unknown'}`, 'failed', false);
        }
      } catch (pdfErr: any) {
        console.error('[PDF] Auto-PDF conversion error:', pdfErr?.message || pdfErr);
        await logAction(userId, 'pdf', `❌ PDF error: ${pdfErr?.message || 'Unknown'}`, 'failed', false);
      }

    }"""

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the block to replace
start_marker = "    try {\n      await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');"
end_marker = "    } catch (e: any) {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Markers not found. Start: {start_idx}, End: {end_idx}")
    exit(1)

# Include indentation for new logic?
# The replacement string already has indentation.
# Replace content[start_idx : end_idx] with new_logic + "\n"

final_content = content[:start_idx] + new_logic + "\n" + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Auditor loop injected successfully")
