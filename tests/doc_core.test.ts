import { strict as assert } from 'assert';
import {
  detectJobLanguage,
  ensureTargetLanguageOrRetry,
  generateCVHTML,
  generateDocumentHTML,
} from '../src/main/features/doc-generator';

// Minimal fake callAI that just returns a provided stub text
async function fakeCallAI(_: any, response: string): Promise<string> {
  return response;
}

async function testEnsureTargetLanguage_RewritesWrongLanguage() {
  const job = { job_title: 'Softwareentwickler', description: 'Kenntnisse in Java, Spring, Microservices. Deutschsprachige Stelle.' };
  const { lang3, targetLanguage } = detectJobLanguage(job);

  const originalContent = 'This is a clearly English sentence that should be rewritten into German.';

  let called = false;
  const thinker = {};
  async function callAIStub(_thinker: any, _prompt: string): Promise<string> {
    called = true;
    return 'Dies ist ein deutscher Beispielsatz, der zeigt, dass die Sprache angepasst wurde.';
  }

  const fixed = await ensureTargetLanguageOrRetry({
    content: originalContent,
    lang3,
    targetLanguage,
    callAI: callAIStub,
    thinker,
    originalPrompt: 'ORIGINAL PROMPT',
  });

  assert.ok(called, 'callAI should be invoked when language is wrong');
  assert.notEqual(fixed, originalContent, 'Content should be rewritten, not returned as-is');
  // Very weak check: should contain a German word
  assert.ok(/deutscher|Stelle|Kenntnisse/.test(fixed), 'Rewritten content should look German');
}

async function testEnsureTargetLanguage_LeavesCorrectLanguageUntouched() {
  const job = { job_title: 'Softwareentwickler', description: 'Kenntnisse in Java, Spring, Microservices. Deutschsprachige Stelle.' };
  const { lang3, targetLanguage } = detectJobLanguage(job);

  const germanContent = 'Dies ist ein deutscher Beispielsatz, der lang genug ist, um erkannt zu werden.';

  let called = false;
  const thinker = {};
  async function callAIStub(_thinker: any, _prompt: string): Promise<string> {
    called = true;
    return 'SHOULD NOT BE USED';
  }

  const fixed = await ensureTargetLanguageOrRetry({
    content: germanContent,
    lang3,
    targetLanguage,
    callAI: callAIStub,
    thinker,
    originalPrompt: 'ORIGINAL PROMPT',
  });

  assert.equal(called, false, 'callAI should not be invoked when language is already correct');
  assert.equal(fixed, germanContent, 'Content already in target language should be returned unchanged');
}

function testGenerateCVHTML_MimicLayoutStructure() {
  const userProfile = {
    name: 'Max Mustermann',
    title: 'Softwareentwickler',
    email: 'max@example.com',
    phone: '+49 123 456789',
    location: 'Berlin, Deutschland',
    skills: ['Java', 'Spring', 'Microservices'],
    licenses: ['AWS Certified Developer'],
    languages: ['Deutsch (Muttersprache)', 'Englisch (fließend)'],
  };

  const job = { company_name: 'Beispiel AG', job_title: 'Softwareentwickler (m/w/d)' };

  const content = [
    '## Berufsprofil',
    'Kurze Zusammenfassung der Erfahrung und Fähigkeiten.',
    '## Berufserfahrung',
    'Softwareentwickler bei Firma X',
    'Zeitraum: 2020 - Heute',
    'Aufgaben: Entwicklung von Microservices.',
    '## Ausbildung',
    'B.Sc. Informatik, TU Berlin',
  ].join('\n');

  const html = generateCVHTML(content, userProfile, job, true, 'GERMAN', 'Mimic my CV');

  // Summary (BERUFSPROFIL) section should appear before BERUFLICHER WERDEGANG
  const summaryIndex = html.indexOf('BERUFSPROFIL');
  const experienceIndex = html.indexOf('BERUFLICHER WERDEGANG');
  assert.ok(summaryIndex !== -1, 'Summary section (BERUFSPROFIL) should be present');
  assert.ok(experienceIndex !== -1, 'Experience section (BERUFLICHER WERDEGANG) should be present');
  assert.ok(summaryIndex < experienceIndex, 'Summary section should come before experience section');

  // Contact info should appear only in sidebar, not duplicated in main contact header
  const emailOccurrences = (html.match(/max@example.com/g) || []).length;
  assert.equal(emailOccurrences, 1, 'Email should appear only once (in sidebar contact)');

  // There should be multiple exp-entry blocks to separate jobs
  const expEntries = (html.match(/class=\"exp-entry/g) || []).length;
  assert.ok(expEntries >= 1, 'Work experience should be split into exp-entry blocks');
}

function testGenerateDocumentHTML_LetterSalutationAndClosing() {
  const userProfile = {
    name: 'Max Mustermann',
    email: 'max@example.com',
    phone: '+49 123 456789',
    location: 'Berlin, Deutschland',
  };
  const job = { company_name: 'Beispiel AG', location: 'Berlin' };

  const body = 'Ich freue mich auf die Möglichkeit, mich bei Ihnen vorzustellen.';

  const html = generateDocumentHTML(body, 'motivation_letter', userProfile, job, true, 'GERMAN');

  // Salutation and closing should be German
  assert.ok(html.includes('Sehr geehrte Damen und Herren,'), 'German salutation should be present');
  assert.ok(html.includes('Mit freundlichen Grüßen'), 'German closing should be present');

  // Body text should be included once
  const bodyOccurrences = (html.match(/Ich freue mich auf die Möglichkeit/g) || []).length;
  assert.equal(bodyOccurrences, 1, 'Body content should appear exactly once');
}

async function run() {
  try {
    await testEnsureTargetLanguage_RewritesWrongLanguage();
    await testEnsureTargetLanguage_LeavesCorrectLanguageUntouched();
    testGenerateCVHTML_MimicLayoutStructure();
    testGenerateDocumentHTML_LetterSalutationAndClosing();
    console.log('doc_core tests: ALL PASSED');
  } catch (err) {
    console.error('doc_core tests: FAILED');
    console.error(err);
    process.exit(1);
  }
}

run();
