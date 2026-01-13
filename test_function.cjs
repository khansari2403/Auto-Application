// Simple test to verify the function signature change
const fs = require('fs');

// Read the file content
const content = fs.readFileSync('/app/src/main/features/doc-generator.ts', 'utf8');

// Check if the old problematic pattern exists
const hasOldPattern = content.includes('${targetLanguage}') && content.includes('function buildThinkerPrompt(');
const hasNewPattern = content.includes('constraints.targetLanguage') && content.includes('function buildThinkerPrompt(args: {');

console.log('Old problematic pattern exists:', hasOldPattern);
console.log('New pattern exists:', hasNewPattern);
console.log('Function signature updated correctly:', !hasOldPattern && hasNewPattern);

// Check if the function call is using the new signature
const hasCorrectCall = content.includes('buildThinkerPrompt({') && content.includes('constraints: {');
console.log('Function call updated correctly:', hasCorrectCall);

if (!hasOldPattern && hasNewPattern && hasCorrectCall) {
  console.log('✅ SUCCESS: Function refactored successfully!');
} else {
  console.log('❌ FAILURE: Function refactoring incomplete');
}