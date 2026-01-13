import sys

file_path = 'src/main/features/doc-generator.ts'
content = open(file_path).read()

# Update both job_listings and documents table with the PDF path
old_pdf_update = """            if (pdfResult.success && pdfResult.pdfPath) {
              console.log(`Updating job_listings with PDF path: ${pdfResult.pdfPath}`);
              await runQuery('UPDATE job_listings', { 
                id: String(job.id), 
                [`${type.key}_path`]: pdfResult.pdfPath 
              });
              await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
            }"""

new_pdf_update = """            if (pdfResult.success && pdfResult.pdfPath) {
              console.log(`Updating job_listings and documents with PDF path: ${pdfResult.pdfPath}`);
              // Update job_listings
              await runQuery('UPDATE job_listings', { 
                id: String(job.id), 
                [`${type.key}_path`]: pdfResult.pdfPath 
              });
              // Update documents table
              await runQuery('UPDATE documents', {
                id: docId,
                file_path: pdfResult.pdfPath
              });
              await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
            }"""

content = content.replace(old_pdf_update, new_pdf_update)

with open(file_path, 'w') as f:
    f.write(content)
