import { getDatabase, runQuery, getAllQuery, logAction } from './database';
import axios from 'axios';

// Import Feature Modules
import * as HunterEngine from './features/Hunter-engine';
import * as DocGenerator from './features/doc-generator';
import * as GhostJobNetwork from './features/ghost-job-network';
import * as SecretaryService from './features/secretary-service';
import { startHuntingScheduler as initScheduler } from './features/scheduler';
import * as AppSubmitter from './features/application-submitter';

let huntingInterval: NodeJS.Timeout | null = null;

export async function callAI(model: any, prompt: string, fileData?: string): Promise<string> {
  console.log('\n----- CALL AI -----');
  console.log('Model:', model?.model_name);
  console.log('Prompt length:', prompt.length);
  
  try {
    if (!model) {
      console.log('❌ No model provided');
      return "Error: No AI model provided";
    }
    
    let apiKey = model.api_key ? model.api_key.trim() : '';
    let modelName = model.model_name || 'gpt-3.5-turbo';
    
    // If no API key in model, try to find from database by role
    if (!apiKey && model.role) {
      console.log(`Looking for API key by role: ${model.role}`);
      const models = await getAllQuery('SELECT * FROM ai_models');
      const dbModel = models.find((m: any) => m.role === model.role && m.status === 'active');
      if (dbModel) {
        apiKey = dbModel.api_key?.trim() || '';
        modelName = dbModel.model_name || modelName;
        console.log(`Found model: ${modelName}, key: ${apiKey?.substring(0, 15)}...`);
      }
    }
    
    if (!apiKey) {
      console.log('❌ No API key found');
      return "Error: No API key configured. Go to Settings > AI Models and add your API key.";
    }
    
    // Determine endpoint
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    
    if (model.model_type === 'local' || model.api_endpoint?.includes('localhost')) {
      endpoint = model.api_endpoint || 'http://localhost:11434/v1/chat/completions';
    } else if (apiKey.startsWith('tgp_v1_')) {
      endpoint = 'https://api.together.xyz/v1/chat/completions';
    }
    
    console.log('Endpoint:', endpoint);
    console.log('Model name:', modelName);
    
    // Build request
    const requestBody: any = {
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts job information. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    };
    
    // Add image if provided (for vision models)
    if (fileData && modelName.includes('vision') || modelName.includes('gpt-4o')) {
      requestBody.messages[1] = {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: fileData } }
        ]
      };
    }
    
    console.log('Making API request...');
    
    const response = await axios.post(endpoint, requestBody, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 60000
    });
    
    const content = response.data.choices[0].message.content;
    console.log('AI Response (first 500 chars):', content?.substring(0, 500));
    console.log('----- END CALL AI -----\n');
    
    return content;
    
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.log('❌ AI Error:', errorMsg);
    console.log('Full error:', err.response?.data || err.message);
    return "Error: " + errorMsg;
  }
}

export async function startHunterSearch(userId: number) {
  console.log('startHunterSearch called with userId:', userId);
  return await HunterEngine.startHunterSearch(userId, callAI);
}

export async function analyzeJobUrl(jobId: number, userId: number, url: string) {
  console.log('analyzeJobUrl called:', { jobId, userId, url });
  const models = await getAllQuery('SELECT * FROM ai_models');
  const hunter = models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
  const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
  return await HunterEngine.analyzeJobUrl(jobId, userId, url, hunter, auditor || hunter, callAI);
}

export async function processApplication(jobId: number, userId: number, userConsentGiven: boolean = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j: any) => j.id === jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const models = await getAllQuery('SELECT * FROM ai_models');
    const thinker = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
    const auditor = models.find((m: any) => m.role === 'Auditor' && m.status === 'active');
    const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active') || thinker;

    // Step 1: Generate Docs (The "Skeleton" call)
    if (thinker && auditor) {
      await DocGenerator.generateTailoredDocs(job, userId, thinker, auditor, { cv: true, coverLetter: true }, callAI);
    }

    // Step 2: Trigger AI Mouse Submission (The "Skeleton" link)
    console.log(`AI Service: Docs ready for job ${jobId}. Handing over to AI Mouse...`);
    return await AppSubmitter.submitApplication(jobId, userId, observer, callAI);

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function startHuntingScheduler(userId: number) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = initScheduler(userId, startHunterSearch, callAI);
}

export async function submitApplication(jobId: number, userId: number) {
  const models = await getAllQuery('SELECT * FROM ai_models');
  const observer = models.find((m: any) => m.role === 'Observer' && m.status === 'active') || 
                   models.find((m: any) => m.role === 'Hunter' && m.status === 'active');
  
  return await AppSubmitter.submitApplication(jobId, userId, observer, callAI);
}

/**
 * Process uploaded document with Librarian AI
 */
export async function processDocumentWithLibrarian(docId: number, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the document
    const docs = await getAllQuery('SELECT * FROM documents');
    const doc = docs.find((d: any) => d.id === docId);
    
    if (!doc) {
      return { success: false, error: 'Document not found' };
    }
    
    // Get Librarian AI model
    const models = await getAllQuery('SELECT * FROM ai_models');
    const librarian = models.find((m: any) => m.role === 'Librarian' && m.status === 'active');
    
    if (!librarian) {
      // Update document status to show no Librarian configured
      await runQuery('UPDATE documents', { id: docId, ai_status: 'failed: No Librarian AI configured' });
      return { success: false, error: 'No Librarian AI model configured. Add one in Settings > AI Team.' };
    }
    
    // Update status to reading
    await runQuery('UPDATE documents', { id: docId, ai_status: 'reading' });
    
    // Build prompt based on file type
    let prompt = '';
    const fileType = doc.file_type || '';
    const fileName = doc.file_name || 'document';
    
    if (fileType.includes('image')) {
      // For images, we need a vision-capable model
      prompt = `You are a document analysis AI. Please analyze this image which appears to be a professional document (possibly a CV, certificate, or credential).

Extract and summarize:
1. Document type (CV, Certificate, Diploma, ID, etc.)
2. Key information (name, dates, qualifications, skills, etc.)
3. Any notable achievements or details

Provide a concise 2-3 sentence summary of the document's contents.`;
      
      // Update status to analyzing
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      // Call AI with image data
      const summary = await callAI(librarian, prompt, doc.content);
      
      // Update document with AI summary
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: summary 
      });
      
    } else if (fileType.includes('pdf')) {
      // For PDFs, extract text if possible
      prompt = `You are a document analysis AI. A PDF document named "${fileName}" has been uploaded.

Based on the filename and context, this appears to be a professional document. Please provide:
1. What type of document this likely is
2. Suggested categories (CV, Certificate, Cover Letter, etc.)
3. A brief description of what such a document typically contains

Note: This is a PDF file and the actual content cannot be directly read. Provide helpful guidance based on the filename.`;
      
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      const summary = await callAI(librarian, prompt);
      
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: summary || `PDF Document: ${fileName}. Configure a vision-capable model for detailed analysis.`
      });
      
    } else {
      // For other document types
      prompt = `Document "${fileName}" (type: ${fileType}) was uploaded. 
      
Provide a brief assessment of what this document type typically contains and how it might be useful for job applications.`;
      
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      const summary = await callAI(librarian, prompt);
      
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: summary 
      });
    }
    
    await logAction(userId, 'librarian', `📚 Analyzed document: ${fileName}`, 'completed', true);
    return { success: true };
    
  } catch (error: any) {
    console.error('Librarian processing error:', error);
    await runQuery('UPDATE documents', { id: docId, ai_status: `failed: ${error.message}` });
    return { success: false, error: error.message };
  }
}

/**
 * Process all pending documents
 */
export async function processAllPendingDocuments(userId: number): Promise<void> {
  try {
    const docs = await getAllQuery('SELECT * FROM documents');
    const pending = docs.filter((d: any) => !d.ai_status || d.ai_status === 'pending');
    
    for (const doc of pending) {
      await processDocumentWithLibrarian(doc.id, userId);
    }
  } catch (error) {
    console.error('Failed to process pending documents:', error);
  }
}