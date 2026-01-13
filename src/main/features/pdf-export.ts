import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { logAction, getDatabase } from '../database';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

const getDocsDir = () => {
  const docsPath = path.join(app.getPath('userData'), 'generated_docs');
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  return docsPath;
};

/**
 * Convert HTML file to PDF
 */
export async function convertHtmlToPdf(htmlPath: string, userId: number): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
  let browser: any = null;
  
  try {
    await logAction(userId, 'pdf', `📄 Converting to PDF: ${path.basename(htmlPath)}`, 'in_progress');
    
    // Read HTML content
    if (!fs.existsSync(htmlPath)) {
      return { success: false, error: 'HTML file not found' };
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    // Launch browser for PDF generation
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    // Generate PDF
    const pdfPath = htmlPath.replace('.html', '.pdf');
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    
    await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfPath)}`, 'completed', true);
    
    return { success: true, pdfPath };
    
  } catch (error: any) {
    console.error('PDF conversion error:', error);
    if (browser) await browser.close();
    await logAction(userId, 'pdf', `❌ PDF conversion failed: ${error.message}`, 'failed', false);
    return { success: false, error: error.message };
  }
}

/**
 * Convert all HTML documents for a job to PDF
 */
export async function convertAllJobDocsToPdf(jobId: number, userId: number): Promise<{ success: boolean; pdfs: string[]; errors: string[] }> {
  const db = getDatabase();
  const job = db.job_listings?.find((j: any) => j.id === jobId);
  
  if (!job) {
    return { success: false, pdfs: [], errors: ['Job not found'] };
  }
  
  const docTypes = ['cv', 'motivation_letter', 'cover_letter', 'portfolio', 'proposal'];
  const pdfs: string[] = [];
  const errors: string[] = [];
  
  for (const docType of docTypes) {
    const htmlPath = job[`${docType}_path`];
    if (htmlPath && fs.existsSync(htmlPath)) {
      const result = await convertHtmlToPdf(htmlPath, userId);
      if (result.success && result.pdfPath) {
        pdfs.push(result.pdfPath);
      } else if (result.error) {
        errors.push(`${docType}: ${result.error}`);
      }
    }
  }
  
  return { success: pdfs.length > 0, pdfs, errors };
}

/**
 * Generate PDF directly from content (without saving HTML first)
 */
export async function generatePdfFromContent(
  content: string, 
  fileName: string, 
  userId: number,
  options?: {
    title?: string;
    headerName?: string;
    headerTitle?: string;
    headerContact?: string;
  }
): Promise<{ success: boolean; pdfPath?: string; error?: string }> {
  let browser: any = null;
  
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options?.title || 'Document'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 0;
      background: #fff;
    }
    
    .header {
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #0077b5;
    }
    
    .name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 3px;
    }
    
    .title {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .contact {
      font-size: 11px;
      color: #444;
    }
    
    .content {
      font-size: 12px;
      text-align: justify;
      white-space: pre-wrap;
      line-height: 1.7;
    }
    
    .content p {
      margin-bottom: 10px;
    }
    
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
  </style>
</head>
<body>
  ${options?.headerName ? `
  <div class="header">
    <div class="name">${options.headerName}</div>
    ${options.headerTitle ? `<div class="title">${options.headerTitle}</div>` : ''}
    ${options.headerContact ? `<div class="contact">${options.headerContact}</div>` : ''}
  </div>
  ` : ''}
  
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    
    const pdfPath = path.join(getDocsDir(), `${fileName}.pdf`);
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    
    await browser.close();
    
    await logAction(userId, 'pdf', `✅ PDF generated: ${fileName}.pdf`, 'completed', true);
    return { success: true, pdfPath };
    
  } catch (error: any) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}
