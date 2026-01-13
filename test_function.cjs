// Simple test to verify the function signature change
const fs = require('fs');

// Read the file content
const content = fs.readFileSync('/app/src/main/features/doc-generator.ts', 'utf8');

// Check if the function has been properly refactored
const hasNewSignature = content.includes('function buildThinkerPrompt(args: {');
const hasConstraintsParam = content.includes('constraints: {') && content.includes('targetLanguage: \'GERMAN\' | \'ENGLISH\';');
const hasProperVariableDeclaration = content.includes('const targetLanguage = constraints.targetLanguage;');
const hasCorrectCall = content.includes('buildThinkerPrompt({') && content.includes('constraints: {');

console.log('New function signature exists:', hasNewSignature);
console.log('Constraints parameter defined:', hasConstraintsParam);
console.log('targetLanguage properly declared:', hasProperVariableDeclaration);
console.log('Function call updated correctly:', hasCorrectCall);

if (hasNewSignature && hasConstraintsParam && hasProperVariableDeclaration && hasCorrectCall) {
  console.log('✅ SUCCESS: Function refactored successfully!');
  console.log('The targetLanguage variable is now properly scoped within the function.');
} else {
  console.log('❌ FAILURE: Function refactoring incomplete');
}