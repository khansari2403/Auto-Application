import { getDatabase, logAction, runQuery, getAllQuery } from '../database';
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import * as fs from 'fs';
import * as SecretaryService from './secretary-service';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

const getUserDataDir = () => path.join(app.getPath('userData'), 'browser_data');
const getDocsDir = () => path.join(app.getPath('userData'), 'generated_docs');

// Question types that the AI might need to ask
type QuestionCategory = 'personal' | 'experience' | 'availability' | 'salary' | 'visa' | 'education' | 'skills' | 'other';

interface UserQuestion {
  id: number;
  job_id?: number;
  question: string;
  answer: string;
  category: QuestionCategory;
  created_at: string;
  updated_at: string;
}

interface ApplicationState {
  jobId: number;
  userId: number;
  status: 'started' | 'form_filling' | 'questions_pending' | 'uploading' | 'reviewing' | 'submitted' | 'failed';
  currentStep: string;
  pendingQuestions: Array<{ field: string; question: string; options?: string[] }>;
  browser?: Browser;
  page?: Page;
}

// Global state for active applications
const activeApplications: Map<number, ApplicationState> = new Map();

/**
 * Find similar questions from the Q&A database
 */
async function findSimilarAnswer(question: string, category: QuestionCategory): Promise<string | null> {
  const db = getDatabase();
  const questions = db.questions || [];
  
  // Simple keyword matching (can be enhanced with AI similarity)
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(/\s+/).filter(w => w.length > 3);
  
  for (const q of questions) {
    if (q.category === category) {
      const storedLower = q.question.toLowerCase();
      const matchCount = keywords.filter(k => storedLower.includes(k)).length;
      if (matchCount >= keywords.length * 0.5) {
        return q.answer;
      }
    }
  }
  
  return null;
}

/**
 * Save a question-answer pair to the database
 */
async function saveQuestionAnswer(
  question: string, 
  answer: string, 
  category: QuestionCategory,
  jobId?: number
): Promise<void> {
  const db = getDatabase();
  
  // Check if similar question exists
  const existingIndex = db.questions.findIndex((q: any) => 
    q.question.toLowerCase() === question.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Update existing
    db.questions[existingIndex].answer = answer;
    db.questions[existingIndex].updated_at = new Date().toISOString();
  } else {
    // Add new
    db.questions.push({
      id: Date.now(),
      job_id: jobId,
      question,
      answer,
      category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Trigger DB save
  await runQuery('UPDATE settings', { id: 1, last_qa_update: new Date().toISOString() });
}

/**
 * Get all saved Q&A pairs
 */
export async function getAllQuestions(): Promise<UserQuestion[]> {
  const db = getDatabase();
  return db.questions || [];
}

/**
 * Update a Q&A answer
 */
export async function updateQuestionAnswer(questionId: number, newAnswer: string): Promise<{ success: boolean }> {
  const db = getDatabase();
  const index = db.questions.findIndex((q: any) => q.id === questionId);
  
  if (index >= 0) {
    db.questions[index].answer = newAnswer;
    db.questions[index].updated_at = new Date().toISOString();
    await runQuery('UPDATE settings', { id: 1, last_qa_update: new Date().toISOString() });
    return { success: true };
  }
  
  return { success: false };
}

/**
 * Delete a Q&A pair
 */
export async function deleteQuestion(questionId: number): Promise<{ success: boolean }> {
  const db = getDatabase();
  const initialLength = db.questions.length;
  db.questions = db.questions.filter((q: any) => q.id !== questionId);
  
  if (db.questions.length < initialLength) {
    await runQuery('UPDATE settings', { id: 1, last_qa_update: new Date().toISOString() });
    return { success: true };
  }
  
  return { success: false };
}

/**
 * Analyze form fields and determine what information is needed
 */
async function analyzeFormFields(page: Page, observerModel: any, callAI: Function): Promise<any[]> {
  // Take screenshot
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  // Also get DOM information
  const formInfo = await page.evaluate(() => {
    const fields: any[] = [];
    
    // Find all input fields
    document.querySelectorAll('input, select, textarea').forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const label = el.labels?.[0]?.textContent || 
                      el.placeholder || 
                      el.name || 
                      el.id ||
                      el.getAttribute('aria-label') || '';
        
        fields.push({
          type: el.type || el.tagName.toLowerCase(),
          name: el.name,
          id: el.id,
          label: label.trim(),
          required: el.required,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          options: el.tagName === 'SELECT' ? Array.from(el.options).map((o: any) => o.text) : undefined
        });
      }
    });
    
    // Find file upload buttons
    document.querySelectorAll('input[type="file"], button[class*="upload"], [data-testid*="upload"]').forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        fields.push({
          type: 'file',
          label: el.textContent?.trim() || 'Upload',
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    });
    
    // Find submit button
    const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button[class*="submit"], button:contains("Submit"), button:contains("Apply")');
    if (submitBtn) {
      const rect = (submitBtn as HTMLElement).getBoundingClientRect();
      fields.push({
        type: 'submit',
        label: (submitBtn as HTMLElement).textContent?.trim() || 'Submit',
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
    
    return fields;
  });
  
  // If we have an AI model, enhance with vision
  if (observerModel && callAI) {
    try {
      const prompt = `Analyze this job application form screenshot. Identify all form fields and their purpose.
      
Return a JSON array of objects with:
- field: field name/purpose (e.g., "first_name", "email", "resume_upload", "cover_letter", "salary_expectation")
- type: input type (text, email, file, select, textarea, checkbox, submit)
- required: true/false
- x: approximate x coordinate (0-1280)
- y: approximate y coordinate (0-800)
- question: if this is a question that needs user input (e.g., "What are your salary expectations?")
- category: personal|experience|availability|salary|visa|education|skills|other

Current DOM fields detected: ${JSON.stringify(formInfo.slice(0, 10))}`;

      const response = await callAI(observerModel, prompt, `data:image/png;base64,${screenshot}`);
      
      // Try to parse AI response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiFields = JSON.parse(jsonMatch[0]);
        return [...formInfo, ...aiFields.filter((f: any) => !formInfo.find((df: any) => 
          Math.abs(df.x - f.x) < 50 && Math.abs(df.y - f.y) < 50
        ))];
      }
    } catch (e) {
      console.log('AI field analysis failed, using DOM only');
    }
  }
  
  return formInfo;
}

/**
 * Map user profile data to form fields
 */
function mapProfileToField(fieldLabel: string, fieldType: string, userProfile: any): string | null {
  const label = fieldLabel.toLowerCase();
  
  // Name fields
  if (label.includes('first name') || label === 'firstname' || label === 'vorname') {
    return userProfile.name?.split(' ')[0] || '';
  }
  if (label.includes('last name') || label === 'lastname' || label === 'nachname' || label.includes('surname')) {
    return userProfile.name?.split(' ').slice(1).join(' ') || '';
  }
  if (label.includes('full name') || label === 'name') {
    return userProfile.name || '';
  }
  
  // Contact fields
  if (label.includes('email') || label.includes('e-mail')) {
    return userProfile.email || '';
  }
  if (label.includes('phone') || label.includes('tel') || label.includes('mobile')) {
    return userProfile.phone || '';
  }
  
  // Location fields
  if (label.includes('city') || label.includes('stadt')) {
    return userProfile.location?.split(',')[0]?.trim() || '';
  }
  if (label.includes('country') || label.includes('land')) {
    return userProfile.location?.split(',').pop()?.trim() || '';
  }
  if (label.includes('address') || label.includes('location') || label.includes('adresse')) {
    return userProfile.location || '';
  }
  
  // Professional fields
  if (label.includes('current title') || label.includes('job title') || label.includes('position')) {
    return userProfile.title || '';
  }
  if (label.includes('linkedin')) {
    return userProfile.linkedin_url || '';
  }
  if (label.includes('website') || label.includes('portfolio')) {
    return userProfile.website || '';
  }
  
  // Summary/About
  if (label.includes('summary') || label.includes('about') || label.includes('introduction')) {
    return userProfile.summary || '';
  }
  
  return null;
}

/**
 * Determine field category for Q&A
 */
function categorizeField(label: string): QuestionCategory {
  const l = label.toLowerCase();
  if (l.includes('salary') || l.includes('compensation') || l.includes('gehalt')) return 'salary';
  if (l.includes('visa') || l.includes('work permit') || l.includes('authorization')) return 'visa';
  if (l.includes('experience') || l.includes('years') || l.includes('erfahrung')) return 'experience';
  if (l.includes('education') || l.includes('degree') || l.includes('university')) return 'education';
  if (l.includes('available') || l.includes('start date') || l.includes('notice')) return 'availability';
  if (l.includes('skill') || l.includes('proficiency') || l.includes('language')) return 'skills';
  if (l.includes('name') || l.includes('email') || l.includes('phone') || l.includes('address')) return 'personal';
  return 'other';
}

/**
 * Main application submission function
 */
export async function submitApplication(
  jobId: number, 
  userId: number, 
  observerModel: any, 
  callAI: Function
): Promise<{ success: boolean; status: string; pendingQuestions?: any[]; error?: string }> {
  
  console.log(`\n========== SMART APPLICATION SUBMISSION FOR JOB ${jobId} ==========`);
  
  let browser: Browser | null = null;
  
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    const userProfile = db.user_profile.find((p: any) => p.id === userId) || db.user_profile[0];
    
    if (!job) {
      return { success: false, status: 'failed', error: 'Job not found' };
    }
    
    if (!userProfile) {
      return { success: false, status: 'failed', error: 'User profile not found. Please create your profile first.' };
    }
    
    const applicationUrl = job.application_url || job.url;
    if (!applicationUrl) {
      return { success: false, status: 'failed', error: 'No application URL found' };
    }
    
    await logAction(userId, 'ai_applicant', `🚀 Starting smart application for ${job.company_name}`, 'in_progress');
    
    // Initialize application state
    const appState: ApplicationState = {
      jobId,
      userId,
      status: 'started',
      currentStep: 'Opening application page',
      pendingQuestions: []
    };
    activeApplications.set(jobId, appState);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      userDataDir: getUserDataDir(),
      args: ['--no-sandbox', '--start-maximized', '--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Hide webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    
    appState.browser = browser;
    appState.page = page;
    
    // Navigate to application
    await logAction(userId, 'ai_applicant', `📄 Opening: ${applicationUrl}`, 'in_progress');
    await page.goto(applicationUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Random delay
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
    
    // Check if we need to login/register
    const needsAuth = await checkIfNeedsAuthentication(page);
    
    if (needsAuth.needsLogin) {
      await logAction(userId, 'ai_applicant', '🔑 Login required. Attempting to login...', 'in_progress');
      const loginResult = await handleLogin(page, userId, userProfile, callAI);
      
      if (!loginResult.success) {
        if (loginResult.needsRegistration) {
          await logAction(userId, 'ai_applicant', '📝 Registration required...', 'in_progress');
          const regResult = await handleRegistration(page, userId, userProfile, callAI);
          
          if (!regResult.success) {
            return { success: false, status: 'failed', error: 'Registration failed: ' + regResult.error };
          }
        } else {
          return { success: false, status: 'failed', error: 'Login failed: ' + loginResult.error };
        }
      }
    }
    
    // Start form filling
    appState.status = 'form_filling';
    await logAction(userId, 'ai_applicant', '📝 Analyzing application form...', 'in_progress');
    
    // Analyze form fields
    const formFields = await analyzeFormFields(page, observerModel, callAI);
    console.log(`Found ${formFields.length} form fields`);
    
    const pendingQuestions: any[] = [];
    
    // Process each field
    for (const field of formFields) {
      if (field.type === 'submit') continue;
      
      // Try to get value from profile
      let value = mapProfileToField(field.label, field.type, userProfile);
      
      // If no direct mapping, check Q&A database
      if (!value && field.label) {
        const category = categorizeField(field.label);
        value = await findSimilarAnswer(field.label, category);
        
        if (value) {
          await logAction(userId, 'ai_applicant', `💡 Found answer from Q&A database for "${field.label}"`, 'in_progress');
        }
      }
      
      // Handle file uploads
      if (field.type === 'file') {
        const uploadResult = await handleFileUpload(page, field, jobId, userId);
        if (!uploadResult.success) {
          await logAction(userId, 'ai_applicant', `⚠️ File upload issue: ${uploadResult.error}`, 'in_progress');
        }
        continue;
      }
      
      // If we have a value, fill it
      if (value) {
        await fillField(page, field, value);
        await logAction(userId, 'ai_applicant', `✓ Filled: ${field.label}`, 'in_progress');
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      } else if (field.required || field.question) {
        // Need user input for this field
        const category = categorizeField(field.label);
        pendingQuestions.push({
          field: field.name || field.id || field.label,
          label: field.label,
          question: field.question || `What is your ${field.label}?`,
          type: field.type,
          category,
          options: field.options,
          x: field.x,
          y: field.y
        });
      }
    }
    
    // If we have pending questions, return them
    if (pendingQuestions.length > 0) {
      appState.status = 'questions_pending';
      appState.pendingQuestions = pendingQuestions;
      
      await logAction(userId, 'ai_applicant', `❓ ${pendingQuestions.length} questions need your input`, 'in_progress');
      
      // Save state and return
      return {
        success: true,
        status: 'questions_pending',
        pendingQuestions
      };
    }
    
    // All fields filled, proceed to upload documents
    appState.status = 'uploading';
    await logAction(userId, 'ai_applicant', '📎 Uploading application documents...', 'in_progress');
    
    // Final review before submission
    appState.status = 'reviewing';
    await logAction(userId, 'ai_applicant', '🔍 Final review before submission...', 'in_progress');
    
    // Take screenshot for user review
    const reviewScreenshot = await page.screenshot({ encoding: 'base64' });
    
    // Submit application
    const submitBtn = formFields.find(f => f.type === 'submit');
    if (submitBtn) {
      await page.mouse.click(submitBtn.x, submitBtn.y);
      await new Promise(r => setTimeout(r, 3000));
      
      // Check for success indicators
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      const isSuccess = pageText.includes('thank you') || 
                       pageText.includes('submitted') || 
                       pageText.includes('application received') ||
                       pageText.includes('erfolgreich');
      
      if (isSuccess) {
        appState.status = 'submitted';
        await logAction(userId, 'ai_applicant', `✅ Application submitted successfully to ${job.company_name}!`, 'completed', true);
        await runQuery('UPDATE job_listings', { id: jobId, status: 'applied' });
        
        // Start monitoring for confirmation email
        SecretaryService.monitorConfirmations(userId).catch(console.error);
        
        return { success: true, status: 'submitted' };
      }
    }
    
    // If we got here without clear success, ask for user review
    return {
      success: true,
      status: 'review_needed',
      pendingQuestions: [{
        field: 'manual_submit',
        question: 'Please review the form and click Submit manually. The form appears ready.',
        type: 'action'
      }]
    };
    
  } catch (error: any) {
    console.error('Application submission error:', error);
    await logAction(userId, 'ai_applicant', `❌ Application failed: ${error.message}`, 'failed', false);
    return { success: false, status: 'failed', error: error.message };
    
  } finally {
    // Don't close browser immediately - user might need to review
    setTimeout(async () => {
      if (browser && activeApplications.get(jobId)?.status === 'submitted') {
        await browser.close();
        activeApplications.delete(jobId);
      }
    }, 30000);
  }
}

/**
 * Continue application after user answers questions
 */
export async function continueApplicationWithAnswers(
  jobId: number,
  userId: number,
  answers: Array<{ field: string; answer: string; saveForLater: boolean }>
): Promise<{ success: boolean; status: string; error?: string }> {
  
  const appState = activeApplications.get(jobId);
  
  if (!appState || !appState.page) {
    return { success: false, status: 'failed', error: 'Application session expired. Please start again.' };
  }
  
  try {
    const page = appState.page;
    
    // Fill in the answers
    for (const ans of answers) {
      const pendingQ = appState.pendingQuestions.find(q => q.field === ans.field);
      
      if (pendingQ) {
        await fillField(page, pendingQ, ans.answer);
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        
        // Save to Q&A database if requested
        if (ans.saveForLater) {
          await saveQuestionAnswer(
            pendingQ.question || pendingQ.label,
            ans.answer,
            pendingQ.category || 'other',
            jobId
          );
          await logAction(userId, 'ai_applicant', `💾 Saved answer for future use: "${pendingQ.label}"`, 'in_progress');
        }
      }
    }
    
    // Clear pending questions
    appState.pendingQuestions = [];
    
    // Re-analyze form to check if more questions are needed
    const db = getDatabase();
    const models = await getAllQuery('SELECT * FROM ai_models');
    const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active');
    
    // Continue with submission
    return await submitApplication(jobId, userId, observer, (global as any).callAI);
    
  } catch (error: any) {
    return { success: false, status: 'failed', error: error.message };
  }
}

/**
 * Check if page requires authentication
 */
async function checkIfNeedsAuthentication(page: Page): Promise<{ needsLogin: boolean; needsRegistration?: boolean }> {
  const url = page.url().toLowerCase();
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  
  const loginIndicators = ['sign in', 'log in', 'login', 'anmelden', 'einloggen'];
  const registerIndicators = ['sign up', 'register', 'create account', 'registrieren'];
  
  const needsLogin = loginIndicators.some(i => url.includes(i) || pageText.includes(i));
  const needsRegistration = registerIndicators.some(i => pageText.includes(i));
  
  return { needsLogin, needsRegistration };
}

/**
 * Handle login process
 */
async function handleLogin(
  page: Page, 
  userId: number, 
  userProfile: any,
  callAI: Function
): Promise<{ success: boolean; needsRegistration?: boolean; error?: string }> {
  
  try {
    // Look for email/username and password fields
    const emailField = await page.$('input[type="email"], input[name*="email"], input[name*="user"], input[id*="email"]');
    const passwordField = await page.$('input[type="password"]');
    
    if (emailField && passwordField) {
      // Try to use stored credentials or profile email
      await emailField.type(userProfile.email || '', { delay: 50 + Math.random() * 50 });
      
      // For password, we need to ask user or use stored credential
      // For now, indicate that login is needed
      await logAction(userId, 'ai_applicant', '🔑 Please enter your password to continue', 'in_progress');
      
      return { success: false, error: 'Password required. Please login manually in the browser window.' };
    }
    
    return { success: false, needsRegistration: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle registration process
 */
async function handleRegistration(
  page: Page,
  userId: number,
  userProfile: any,
  callAI: Function
): Promise<{ success: boolean; error?: string }> {
  
  try {
    await logAction(userId, 'ai_applicant', '📝 Attempting automatic registration...', 'in_progress');
    
    // Find registration form fields
    const fields = await page.$$eval('input, select', (inputs: any[]) => 
      inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      }))
    );
    
    // Fill in registration fields
    for (const field of fields) {
      const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
      
      if (field.type === 'email' || field.name?.includes('email')) {
        await page.type(selector, userProfile.email || '');
      } else if (field.name?.includes('first') || field.name?.includes('vorname')) {
        await page.type(selector, userProfile.name?.split(' ')[0] || '');
      } else if (field.name?.includes('last') || field.name?.includes('nachname')) {
        await page.type(selector, userProfile.name?.split(' ').slice(1).join(' ') || '');
      }
      
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    }
    
    // Password field - generate or ask user
    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      await logAction(userId, 'ai_applicant', '🔐 Please create a password in the browser window', 'in_progress');
      return { success: false, error: 'Please complete registration manually and create a password.' };
    }
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fill a form field with a value
 */
async function fillField(page: Page, field: any, value: string): Promise<void> {
  try {
    // Try multiple selector strategies
    let selector = '';
    if (field.id) selector = `#${field.id}`;
    else if (field.name) selector = `[name="${field.name}"]`;
    else if (field.x && field.y) {
      // Click by coordinates
      await page.mouse.click(field.x, field.y);
      await page.keyboard.type(value, { delay: 30 + Math.random() * 50 });
      return;
    }
    
    if (selector) {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await element.type(value, { delay: 30 + Math.random() * 50 });
      }
    }
  } catch (e) {
    console.log(`Could not fill field: ${field.label || field.name}`);
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload(
  page: Page, 
  field: any, 
  jobId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    
    // Determine which file to upload based on field label
    const label = (field.label || '').toLowerCase();
    let docPath = '';
    
    if (label.includes('cv') || label.includes('resume') || label.includes('lebenslauf')) {
      docPath = job?.cv_path;
    } else if (label.includes('cover') || label.includes('anschreiben')) {
      docPath = job?.cover_letter_path;
    } else if (label.includes('motivation')) {
      docPath = job?.motivation_letter_path;
    } else if (label.includes('portfolio')) {
      docPath = job?.portfolio_path;
    }
    
    if (!docPath || !fs.existsSync(docPath)) {
      // Check for PDF version
      const pdfPath = docPath?.replace('.html', '.pdf');
      if (pdfPath && fs.existsSync(pdfPath)) {
        docPath = pdfPath;
      } else {
        return { success: false, error: `Document not found: ${label}` };
      }
    }
    
    // Find file input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        field.x && field.y ? page.mouse.click(field.x, field.y) : fileInput.click()
      ]);
      
      await fileChooser.accept([docPath]);
      await logAction(userId, 'ai_applicant', `📎 Uploaded: ${path.basename(docPath)}`, 'in_progress');
      return { success: true };
    }
    
    return { success: false, error: 'No file input found' };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an active application
 */
export async function cancelApplication(jobId: number): Promise<void> {
  const appState = activeApplications.get(jobId);
  if (appState?.browser) {
    await appState.browser.close();
  }
  activeApplications.delete(jobId);
}
