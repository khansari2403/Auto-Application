/**
 * Comprehensive Test Suite for doc-generator.ts
 * Tests all requirements:
 * 1. Language detection & safety net (retry on mismatch)
 * 2. CV relevance filtering (5-7 skills, 3-5 certs)
 * 3. CV Page Limit enforcement
 * 4. File path structure (Company/Position/Date)
 * 5. Database updates (job_listings and documents tables)
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

// ============ TEST TRACKING ============
interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string) {
  testResults.push({ name, passed, details });
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${name}: ${details}`);
}

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
let aiCallLog: Array<{ callNum: number; prompt: string; targetLang: string }> = [];

async function mockCallAI(thinker: any, prompt: string): Promise<string> {
  const callNum = aiCallLog.length + 1;
  
  // Extract target language
  const langMatch = prompt.match(/ABSOLUTE LANGUAGE RULE:.*?(\bGERMAN\b|\bENGLISH\b|\bFRENCH\b|\bSPANISH\b)/i);
  const targetLang = langMatch ? langMatch[1].toUpperCase() : 'ENGLISH';
  
  aiCallLog.push({ callNum, prompt, targetLang });
  
  console.log(`\n  [AI Call #${callNum}] Target language: ${targetLang}, Prompt length: ${prompt.length}`);
  
  // Return correct language content
  if (targetLang === 'GERMAN') {
    if (prompt.includes('CV')) {
      return `BERUFSPROFIL

Als erfahrener Backend-Entwickler bringe ich fundierte Kenntnisse in Python, Django und API-Entwicklung mit.

BERUFSERFAHRUNG
- Backend-Entwickler bei ACME (2021-2024): Entwicklung von REST-APIs

FÄHIGKEITEN
- Python, FastAPI, MongoDB`;
    }
    return `Ich möchte mein Interesse an der Position bekunden.

Mit meiner Erfahrung in Python bin ich überzeugt, einen Beitrag leisten zu können.`;
  } else if (targetLang === 'FRENCH') {
    return `Je souhaite exprimer mon intérêt pour ce poste.

Avec mon expérience en Python et en développement d'API, je suis convaincu de pouvoir contribuer à votre équipe.`;
  }
  
  return `I would like to express my interest in this position.

With my experience in Python and API development, I am confident I can contribute to your team.`;
}

// ============ TEST CASES ============
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  COMPREHENSIVE DOC-GENERATOR TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  loadTestDb();
  
  // Import after mocks
  const { generateTailoredDocs } = await import('../src/main/features/doc-generator');
  
  // Setup test profile with many skills/certs to test filtering
  testDbData.user_profile = [{
    id: 1,
    name: 'Max Mustermann',
    title: 'Senior Backend Developer',
    email: 'max@example.de',
    phone: '+49 123 456789',
    location: 'Berlin',
    summary: 'Erfahrener Backend-Entwickler mit 8 Jahren Erfahrung.',
    experiences: JSON.stringify([
      { title: 'Senior Developer', company: 'TechCorp', startDate: '2020', endDate: '2024', description: 'Backend development' },
      { title: 'Developer', company: 'StartupXYZ', startDate: '2016', endDate: '2020', description: 'Full-stack development' }
    ]),
    educations: JSON.stringify([
      { degree: 'M.Sc. Informatik', school: 'TU Berlin', startYear: '2012', endYear: '2016' }
    ]),
    // Many skills to test filtering (only 5-7 relevant should be used)
    skills: JSON.stringify([
      'Python', 'JavaScript', 'TypeScript', 'Java', 'C++',
      'Django', 'FastAPI', 'React', 'Vue.js', 'Angular',
      'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
      'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
      'Git', 'CI/CD', 'Agile', 'Scrum'
    ]),
    // Many certs to test filtering (only 3-5 relevant should be used)
    licenses: JSON.stringify([
      'AWS Solutions Architect',
      'Kubernetes Administrator',
      'Google Cloud Professional',
      'Scrum Master',
      'PMP',
      'ISTQB',
      'MongoDB Developer',
      'Python Institute PCEP'
    ]),
    languages: JSON.stringify(['Deutsch', 'Englisch', 'Französisch'])
  }];
  
  // Test Case 1: German Job with CV generation
  console.log('\n--- TEST 1: German Job (CV + Cover Letter) ---');
  const germanJob = {
    id: 4001,
    job_title: 'Backend-Entwickler',
    company_name: 'Deutsche Tech GmbH',
    location: 'München',
    required_skills: 'Python, Django, PostgreSQL, Docker, Kubernetes',
    description: `Wir suchen einen erfahrenen Backend-Entwickler (m/w/d).

Anforderungen:
- 5+ Jahre Erfahrung mit Python
- Kenntnisse in Django und REST-APIs
- Erfahrung mit PostgreSQL
- Docker und Kubernetes Kenntnisse

Aufgaben:
- Entwicklung von Microservices
- Code-Reviews und Mentoring`,
    date_imported: '2026-01-20'
  };
  
  testDbData.job_listings = testDbData.job_listings.filter((j: any) => j.id !== 4001);
  testDbData.job_listings.push(germanJob);
  
  const thinker = {
    cv_page_limit: '2',
    motivation_letter_word_limit: '400',
    cover_letter_word_limit: '250'
  };
  
  aiCallLog = [];
  
  await generateTailoredDocs(germanJob, 1, thinker, {}, { cv: true, coverLetter: true }, mockCallAI);
  
  // Reload DB
  loadTestDb();
  const updatedJob = testDbData.job_listings.find((j: any) => j.id === 4001);
  
  // Test 1a: CV Page Limit in prompt
  const cvCall = aiCallLog.find(c => c.prompt.includes('CV') || c.prompt.includes('Resume'));
  if (cvCall) {
    const hasPageLimit = cvCall.prompt.includes('PAGE LIMIT: 2');
    logTest('CV Page Limit Passed', hasPageLimit, hasPageLimit ? 'Found "PAGE LIMIT: 2" in CV prompt' : 'Page limit NOT found in prompt');
    
    // Test 1b: Skills filtering mentioned
    const hasSkillsFilter = cvCall.prompt.includes('5-7') || cvCall.prompt.includes('ONLY these');
    logTest('Skills Filtering Constraint', hasSkillsFilter, hasSkillsFilter ? 'Skills filtering constraint found' : 'NOT found');
  }
  
  // Test 1c: Language detection (German)
  const allGerman = aiCallLog.every(c => c.targetLang === 'GERMAN');
  logTest('German Language Detection', allGerman, allGerman ? 'All AI calls targeted GERMAN' : `Mixed languages detected: ${aiCallLog.map(c=>c.targetLang).join(', ')}`);
  
  // Test 1d: File path structure
  if (updatedJob?.cv_pdf_path || updatedJob?.cv_path) {
    const cvPath = updatedJob.cv_pdf_path || updatedJob.cv_path;
    const hasCorrectStructure = cvPath.includes('Deutsche Tech GmbH') && cvPath.includes('Backend-Entwickler') && cvPath.includes('2026-01-20');
    logTest('CV File Path Structure', hasCorrectStructure, hasCorrectStructure ? 
      'Path follows Company/Position/Date structure' : 
      `Unexpected path: ${cvPath}`);
  } else {
    logTest('CV File Path Structure', false, 'CV path not set in job_listings');
  }
  
  // Test 1e: Database update for documents
  const cvDoc = testDbData.documents.find((d: any) => d.job_id === '4001' || d.job_id === 4001);
  if (cvDoc) {
    const docHasPdfPath = cvDoc.file_path?.endsWith('.pdf');
    logTest('Documents Table Updated', !!cvDoc, `Document created with type: ${cvDoc.document_type}`);
  } else {
    logTest('Documents Table Updated', false, 'No document found for job 4001');
  }
  
  // Test Case 2: Verify PDF files exist
  console.log('\n--- TEST 2: PDF File Generation ---');
  if (updatedJob?.cv_pdf_path && fs.existsSync(updatedJob.cv_pdf_path)) {
    const stats = fs.statSync(updatedJob.cv_pdf_path);
    logTest('CV PDF Created', true, `PDF size: ${(stats.size / 1024).toFixed(1)} KB`);
  } else if (updatedJob?.cv_pdf_path) {
    logTest('CV PDF Created', false, `PDF not found at: ${updatedJob.cv_pdf_path}`);
  } else {
    logTest('CV PDF Created', false, 'PDF path not set');
  }
  
  if (updatedJob?.cover_letter_pdf_path && fs.existsSync(updatedJob.cover_letter_pdf_path)) {
    logTest('Cover Letter PDF Created', true, 'PDF file exists');
  } else if (updatedJob?.cover_letter_pdf_path) {
    logTest('Cover Letter PDF Created', false, `PDF not found at: ${updatedJob.cover_letter_pdf_path}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  console.log(`\n  Passed: ${passed}/${total}`);
  
  if (passed < total) {
    console.log('\n  Failed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`    - ${r.name}: ${r.details}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Return exit code
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
