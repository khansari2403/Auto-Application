import { getDatabase, logAction, runQuery } from '../database';
import { getFormCoordinates, executeMouseAction } from '../scraper-service';
import puppeteer from 'puppeteer';
import path from 'path';
import { app } from 'electron';

export async function submitApplication(jobId: number, userId: number, observerModel: any, callAI: Function) {
  console.log(`\n========== SUBMITTING APPLICATION FOR JOB ${jobId} ==========`);
  
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    const userProfile = db.user_profile.find((p: any) => p.id === userId) || db.user_profile[0];
    const tailoredDoc = db.documents.find((d: any) => d.job_id === jobId && d.document_type === 'cv');

    if (!job || !job.application_url) {
      throw new Error("Job or application URL not found");
    }

    await logAction(userId, 'ai_mouse', `🖱️ Starting automated submission for ${job.company_name}`, 'in_progress');

    const browser = await puppeteer.launch({ 
      headless: false,
      userDataDir: path.join(app.getPath('userData'), 'browser_data'),
      args: ['--no-sandbox', '--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(job.application_url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Step 1: Get coordinates via AI Observer
    const coordinates = await getFormCoordinates(page, userId, observerModel, callAI);
    console.log("Form coordinates identified:", coordinates);

    // Step 2: Fill form using AI Mouse
    for (const coord of coordinates) {
      let value = "";
      if (coord.field === 'first_name') value = userProfile.name.split(' ')[0];
      else if (coord.field === 'last_name') value = userProfile.name.split(' ').slice(1).join(' ');
      else if (coord.field === 'email') value = userProfile.email || "";
      else if (coord.field === 'phone') value = userProfile.phone || "";
      
      if (value) {
        await executeMouseAction(page, { type: 'type', x: coord.x, y: coord.y, text: value });
      } else if (coord.field.includes('upload') && tailoredDoc) {
        // Save content to a temporary file for uploading
        const fs = require('fs');
        const tempPath = path.join(app.getPath('temp'), `tailored_cv_${jobId}.txt`);
        fs.writeFileSync(tempPath, tailoredDoc.content);
        await executeMouseAction(page, { type: 'upload', x: coord.x, y: coord.y, filePath: tempPath });
      }
    }

    // Step 3: Final Review & Submit
    const submitBtn = coordinates.find((c: any) => c.field === 'submit');
    if (submitBtn) {
      await logAction(userId, 'ai_auditor', '🧐 Final visual check before submission...', 'in_progress');
      await executeMouseAction(page, { type: 'click', x: submitBtn.x, y: submitBtn.y });
      await logAction(userId, 'ai_mouse', `✅ Application submitted to ${job.company_name}`, 'completed', true);
      await runQuery('UPDATE job_listings', { id: jobId, status: 'submitted' });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    return { success: true };

  } catch (error: any) {
    console.error("Submission Error:", error);
    await logAction(userId, 'ai_mouse', `❌ Submission failed: ${error.message}`, 'failed', false);
    return { success: false, error: error.message };
  }
}