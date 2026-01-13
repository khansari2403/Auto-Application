import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Add more logging to PDF conversion
old_pdf_block = """          // Convert to PDF immediately
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
          }"""

new_pdf_block = """          // Convert to PDF immediately
          try {
            console.log(`Attempting PDF conversion for: ${filePath}`);
            const { convertHtmlToPdf } = require('./pdf-export');
            const pdfResult = await convertHtmlToPdf(filePath, userId);
            console.log('PDF conversion result:', pdfResult);
            
            if (pdfResult.success && pdfResult.pdfPath) {
              console.log(`Updating job_listings with PDF path: ${pdfResult.pdfPath}`);
              await runQuery('UPDATE job_listings', { 
                id: String(job.id), 
                [`${type.key}_path`]: pdfResult.pdfPath 
              });
              await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
            } else {
              console.error('PDF conversion failed or returned no path:', pdfResult.error);
              await logAction(userId, 'pdf', `❌ PDF conversion failed: ${pdfResult.error}`, 'failed', false);
            }
          } catch (pdfErr: any) {
            console.error('Auto-PDF conversion exception:', pdfErr);
            await logAction(userId, 'pdf', `❌ PDF error: ${pdfErr.message}`, 'failed', false);
          }"""

content = content.replace(old_pdf_block, new_pdf_block)

with open(file_path, 'w') as f:
    f.write(content)
