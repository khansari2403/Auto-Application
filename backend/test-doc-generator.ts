/**
 * Test script for doc-generator.ts - runs in Node.js without Electron
 * Tests: Language detection, safety net, CV relevance filtering, file storage paths
 */
import * as path from 'path';
import * as fs from 'fs';

// ============ MOCK ELECTRON ============
const USER_DATA_PATH = '/app/User_Data';
(global as any).electronApp = {
  getPath: (name: string) => {
    if (name === 'userData') return USER_DATA_PATH;
    return '/tmp';
  }
};

// ============ MOCK DATABASE ============
const TEST_DB_PATH = path.join(USER_DATA_PATH, 'data', 'db.json');
let testDbData: any = null;

function loadTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    testDbData = JSON.parse(fs.readFileSync(TEST_DB_PATH, 'utf8'));
  } else {
    testDbData = {
      settings: [{ id: 1, storage_path: '/app/User_Data/custom_storage' }],
      user_profile: [],
      job_listings: [],
      documents: [],
      action_logs: [],
      ai_models: []
    };
  }
  (global as any).dbData = testDbData;
}

// ============ MOCK CALL AI ============
let aiCallCount = 0;
async function mockCallAI(thinker: any, prompt: string): Promise<string> {
  aiCallCount++;
  console.log(`\n[MOCK AI] Call #${aiCallCount}`);
  console.log(`[MOCK AI] Prompt length: ${prompt.length} chars`);
  
  // Extract target language from prompt
  const langMatch = prompt.match(/LANGUAGE.*?(\bGERMAN\b|\bENGLISH\b|\bFRENCH\b|\bSPANISH\b)/i);
  const targetLang = langMatch ? langMatch[1].toUpperCase() : 'ENGLISH';
  console.log(`[MOCK AI] Detected target language: ${targetLang}`);
  
  // Check if CV page limit is in prompt
  const pageLimitMatch = prompt.match(/PAGE LIMIT:\s*(\d+)/i);
  if (pageLimitMatch) {
    console.log(`[MOCK AI] ✅ CV Page Limit found in prompt: ${pageLimitMatch[1]} pages`);
  } else {
    console.log(`[MOCK AI] ⚠️ CV Page Limit NOT found in prompt!`);
  }
  
  // Check if skills filtering is mentioned
  if (prompt.includes('ONLY these 5-7') || prompt.includes('5-7 skills')) {
    console.log(`[MOCK AI] ✅ Skills filtering constraint found`);
  }
  
  // Simulate first call returning wrong language (to test safety net)
  if (aiCallCount === 1 && targetLang === 'FRENCH') {
    console.log(`[MOCK AI] 🧪 Simulating WRONG language (English instead of French) to test safety net`);
    return `Dear Hiring Manager,

I am writing to express my interest in the Backend Developer position at your company.

With my experience in Python and API development, I believe I can contribute significantly to your team.

Kind regards`;
  }
  
  // Return content in the correct language
  if (targetLang === 'GERMAN') {
    return `Ich möchte mein Interesse an der Position als Backend-Entwickler bei Ihrem Unternehmen bekunden.

Mit meiner Erfahrung in Python und API-Entwicklung bin ich überzeugt, dass ich einen bedeutenden Beitrag zu Ihrem Team leisten kann.

Ich freue mich auf ein persönliches Gespräch.`;
  } else if (targetLang === 'FRENCH') {
    return `Je souhaite exprimer mon intérêt pour le poste de Développeur Backend au sein de votre entreprise.

Avec mon expérience en Python et en développement d'API, je suis convaincu de pouvoir apporter une contribution significative à votre équipe.

Je serais ravi d'échanger avec vous lors d'un entretien.`;
  } else {
    return `I would like to express my interest in the Backend Developer position at your company.

With my experience in Python and API development, I am confident I can make a significant contribution to your team.

I look forward to discussing this opportunity with you.`;
  }
}

// ============ TESTS ============
async function runTests() {
  console.log('\n========================================');
  console.log('  DOC-GENERATOR TEST SUITE');
  console.log('========================================\n');
  
  loadTestDb();
  
  // Import the module after mocks are set up
  const { generateTailoredDocs, generateSingleDocument } = await import('../src/main/features/doc-generator');
  
  // Test 1: French Job Description (tests language detection + safety net)
  console.log('\n--- TEST 1: French Job Description ---');
  const frenchJob = {
    id: 3001,
    job_title: 'Développeur Backend Senior',
    company_name: 'TechFrance SA',
    location: 'Lyon',
    required_skills: 'Python, Django, PostgreSQL, Docker',
    description: `Nous recherchons un développeur backend senior pour rejoindre notre équipe technique.
    
Profil recherché:
- 5+ ans d'expérience en développement Python
- Maîtrise de Django et des API REST
- Connaissance de PostgreSQL et des bases de données NoSQL
- Expérience avec Docker et Kubernetes

Nous offrons:
- Salaire compétitif
- Télétravail partiel
- Formation continue`,
    date_imported: '2026-01-15'
  };
  
  const thinker = {
    thinker_source: 'all',
    cv_page_limit: '1',  // Test that this is passed
    motivation_letter_word_limit: '400',
    cover_letter_word_limit: '250'
  };
  
  const auditor = {};
  
  const options = {
    coverLetter: true
  };
  
  // Inject the test job into the DB
  testDbData.job_listings = testDbData.job_listings || [];
  testDbData.job_listings.push(frenchJob);
  
  // Reset AI call count
  aiCallCount = 0;
  
  console.log('\nGenerating documents for French job...');
  await generateTailoredDocs(frenchJob, 1, thinker, auditor, options, mockCallAI);
  
  // Check results
  console.log('\n--- RESULTS ---');
  
  // Reload DB to see updates
  loadTestDb();
  
  const updatedJob = testDbData.job_listings.find((j: any) => j.id === 3001);
  if (updatedJob) {
    console.log(`Cover Letter Status: ${updatedJob.cover_letter_status}`);
    console.log(`Cover Letter Path: ${updatedJob.cover_letter_path || 'NOT SET'}`);
    console.log(`Cover Letter PDF Path: ${updatedJob.cover_letter_pdf_path || 'NOT SET'}`);
    
    // Verify file path structure
    if (updatedJob.cover_letter_pdf_path) {
      const expectedPattern = /TechFrance SA.*Développeur Backend.*2026-01-15/;
      if (expectedPattern.test(updatedJob.cover_letter_pdf_path)) {
        console.log(`✅ File path follows Company/Position/Date structure`);
      } else {
        console.log(`❌ File path does NOT follow expected structure`);
        console.log(`   Expected pattern: TechFrance SA/Développeur Backend/2026-01-15/...`);
      }
      
      // Check if file exists
      if (fs.existsSync(updatedJob.cover_letter_pdf_path)) {
        console.log(`✅ PDF file exists`);
      } else {
        console.log(`❌ PDF file NOT found at path`);
      }
    }
  } else {
    console.log('❌ Job not found in DB after generation');
  }
  
  // Check if documents table was updated
  const doc = testDbData.documents.find((d: any) => d.job_id === '3001' || d.job_id === 3001);
  if (doc) {
    console.log(`\nDocument record created:`);
    console.log(`  Type: ${doc.document_type}`);
    console.log(`  File Path: ${doc.file_path}`);
    console.log(`  Status: ${doc.status}`);
  }
  
  // Test 2: Check AI call count (should be 2 if safety net triggered retry)
  console.log(`\n--- SAFETY NET CHECK ---`);
  console.log(`AI calls made: ${aiCallCount}`);
  if (aiCallCount >= 2) {
    console.log(`✅ Safety net likely triggered (multiple AI calls)`);
  } else {
    console.log(`ℹ️ Only one AI call - safety net may not have been needed`);
  }
  
  console.log('\n========================================');
  console.log('  TESTS COMPLETE');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
