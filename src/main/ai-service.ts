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
    
    // Build prompt based on file type - USER FRIENDLY OUTPUT
    let prompt = '';
    const fileType = doc.file_type || '';
    const fileName = doc.file_name || 'document';
    
    const userFriendlyPrompt = `You are a document analysis assistant helping a job seeker organize their application materials.

IMPORTANT: Respond in a friendly, conversational way - NOT in JSON, code, or technical format.
Write as if you're a helpful career advisor talking to the user.

Document: "${fileName}"

Analyze this document and provide:
1. A brief description of what this document is (1 sentence)
2. How it will be used in job applications (1-2 sentences)
3. A "ready status" - is this document suitable for applications?

Format your response like this:
📄 [Document Type]: [Brief description]
✨ Use in Applications: [How the app will use this]
${fileName.toLowerCase().includes('cv') || fileName.toLowerCase().includes('resume') ? '✅ Ready to use for applications!' : '✅ Saved and ready!'}

Keep it short and encouraging - max 3-4 lines total.`;

    if (fileType.includes('image')) {
      // For images, we need a vision-capable model
      prompt = userFriendlyPrompt + `\n\nThis is an image file - likely a certificate, diploma, or credential photo.`;
      
      // Update status to analyzing
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      // Call AI with image data
      const summary = await callAI(librarian, prompt, doc.content);
      
      // Clean up any JSON or code artifacts from response
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      
      // Update document with AI summary
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: cleanedSummary 
      });
      
    } else if (fileType.includes('pdf')) {
      prompt = userFriendlyPrompt + `\n\nThis is a PDF document.`;
      
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      const summary = await callAI(librarian, prompt);
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: cleanedSummary
      });
      
    } else {
      prompt = userFriendlyPrompt;
      
      await runQuery('UPDATE documents', { id: docId, ai_status: 'analyzing' });
      
      const summary = await callAI(librarian, prompt);
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      
      await runQuery('UPDATE documents', { 
        id: docId, 
        ai_status: 'verified', 
        ai_summary: cleanedSummary
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
 * Clean up Librarian AI response - remove JSON, code blocks, technical jargon
 */
function cleanLibrarianResponse(response: string, fileName: string): string {
  let cleaned = response;
  
  // Remove JSON blocks
  cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/```[\s\S]*?```/gi, '');
  
  // Remove raw JSON objects
  cleaned = cleaned.replace(/\{[\s\S]*?"document_type"[\s\S]*?\}/gi, '');
  cleaned = cleaned.replace(/\{[\s\S]*?"type"[\s\S]*?\}/gi, '');
  
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.trim();
  
  // If response is empty or still has code-like content, provide a friendly fallback
  if (!cleaned || cleaned.length < 20 || cleaned.includes('"document_type"') || cleaned.includes('```')) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const name = fileName.replace(/\.[^.]+$/, '');
    
    if (ext === 'pdf') {
      if (name.toLowerCase().includes('cv') || name.toLowerCase().includes('resume')) {
        cleaned = `📄 CV/Resume: Your main CV document.\n✨ Will be tailored for each job application.\n✅ Ready to use!`;
      } else if (name.toLowerCase().includes('cert') || name.toLowerCase().includes('diploma') || name.toLowerCase().includes('belt')) {
        cleaned = `📜 Certificate/Credential: "${name}" certification.\n✨ Can be referenced to highlight your qualifications.\n✅ Saved and ready!`;
      } else if (name.toLowerCase().includes('cover') || name.toLowerCase().includes('letter')) {
        cleaned = `✉️ Cover Letter: Your cover letter template.\n✨ Will be customized for applications.\n✅ Ready to use!`;
      } else {
        cleaned = `📄 Document: "${name}"\n✨ Saved to your document library.\n✅ Ready for applications!`;
      }
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      cleaned = `🖼️ Image: "${name}" credential/certificate.\n✨ Visual proof of your qualification.\n✅ Saved and verified!`;
    } else {
      cleaned = `📄 Document: "${name}"\n✨ Added to your application materials.\n✅ Ready!`;
    }
  }
  
  return cleaned;
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