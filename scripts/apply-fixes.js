const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', 'app', 'src', 'main', 'features', 'doc-generator.ts');

if (!fs.existsSync(FILE_PATH)) {
  console.error('File not found:', FILE_PATH);
  process.exit(1);
}

let content = fs.readFileSync(FILE_PATH, 'utf8');
console.log('Applying handoff fixes...');

// Fix 1: Add translation functions
if (!content.includes('async function translateCVContent')) {
  console.log('Adding translation functions...');
  
  const translationFunctions = `
async function translateCVContent(jsonContent, targetLanguage, callAI, thinker) {
  try {
    const parsed = JSON.parse(jsonContent);
    if (parsed.summary) {
      parsed.summary = await translateText(parsed.summary, targetLanguage, callAI, thinker);
    }
    if (parsed.experiences) {
      for (const key of Object.keys(parsed.experiences)) {
        parsed.experiences[key] = await translateText(parsed.experiences[key], targetLanguage, callAI, thinker);
      }
    }
    if (parsed.educations) {
      for (const key of Object.keys(parsed.educations)) {
        parsed.educations[key] = await translateText(parsed.educations[key], targetLanguage, callAI, thinker);
      }
    }
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Translation error:', error);
    return jsonContent;
  }
}

async function translateDocumentContent(content, targetLanguage, callAI, thinker) {
  return translateText(content, targetLanguage, callAI, thinker);
}

async function translateText(text, targetLanguage, callAI, thinker) {
  if (!text || text.trim().length === 0) return text;
  const prompt = "Translate to " + targetLanguage + ". Return ONLY plain text, no JSON, no markdown. Text: " + text;
  try {
    let translated = await callAI(thinker, prompt);
    translated = translated.replace(/translated_text["']?\\s*:\\s*["']?/g, '');
    translated = translated.replace(/\\\\}/g, '');
    translated = translated.replace(/\\\\^\\\\s*\\\\{\\\\s*["']/g, '');
    return translated.trim();
  } catch (error) {
    return text;
  }
}
`;
  content = content + translationFunctions;
}

// Fix 2: Update getLangVal - append new version instead of replacing
if (!content.includes('proficiency_level')) {
  console.log('Adding fixed getLangVal function...');
  
  const fixedFunction = `
function getLangValFixed(x) {
  if (x.language || x.name) {
    const langName = x.language || x.name;
    const level = x.level || x.proficiency || x.proficiency_level || x.fluency || '';
    return level ? langName + ' (' + level + ')' : langName;
  }
  return x.language || x.name || '';
}
`;
  content = content + fixedFunction;
  
  // Replace calls to getLangVal with getLangValFixed
  content = content.replace(/getLangVal\\(/g, 'getLangValFixed(');
}

// Fix 3: Update fallback text
console.log('Updating fallback text...');
content = content.replace(/\\{userProfile\\?\\.name \\|\\| 'Your Name'\\}/g, "{userProfile?.name || (lang === 'GERMAN' ? 'Ihr Name' : lang === 'FRENCH' ? 'Votre Nom' : 'Your Name')}");
content = content.replace(/\\{userProfile\\?\\.name \\|\\| 'Applicant'\\}/g, "{userProfile?.name || (lang === 'GERMAN' ? 'Bewerber' : lang === 'FRENCH' ? 'Candidat' : 'Applicant')}");

fs.writeFileSync(FILE_PATH, content);
console.log('Done!');