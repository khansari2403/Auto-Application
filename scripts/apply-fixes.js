const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', 'app', 'src', 'main', 'features', 'doc-generator.ts');

if (!fs.existsSync(FILE_PATH)) {
  console.error('❌ File not found:', FILE_PATH);
  process.exit(1);
}

let content = fs.readFileSync(FILE_PATH, 'utf8');
console.log('🔧 Applying handoff fixes...');

// Fix 1: Add translation functions
if (!content.includes('async function translateCVContent')) {
  console.log('➕ Adding translation functions...');
  
  const translationFunctions = `
// Translation functions added by handoff fixes
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
  
  const translatePrompt = "Translate to " + targetLanguage + ".\nRULES:\n- Preserve HTML tags\n- Return ONLY plain text\n- NO JSON wrappers\n- NO markdown code blocks\n- NO explanations\n\nTEXT: " + text;
  
  try {
    let translated = await callAI(thinker, translatePrompt);
    
    // Aggressive cleaning - using split/join instead of regex for backticks
    translated = translated.replace(/\\{\\s*["']translated_text["']\\s*:\\s*["'](.+)["']\\s*\\}/s, '$1');
    translated = translated.replace(/\\{\\s*["']translation["']\\s*:\\s*["'](.+)["']\\s*\\}/s, '$1');
    translated = translated.replace(/\\{\\s*["']text["']\\s*:\\s*["'](.+)["']\\s*\\}/s, '$1');
    translated = translated.replace(/\\{\\s*["']content["']\\s*:\\s*["'](.+)["']\\s*\\}/s, '$1');
    
    // Remove markdown code blocks by splitting
    if (translated.includes('---')) {
      translated = translated.split('---')[0];
    }
    
    translated = translated.replace(/^(Here is the translation|Translated text|Translation):\\s*/i, '');
    translated = translated.replace(/\\\\"/g, '"');
    translated = translated.replace(/\\\\'/g, "'");
    
    return translated.trim();
  } catch (error) {
    console.error('Translation text error:', error);
    return text;
  }
}
`;
  
  content = content + '\\n' + translationFunctions;
}

// Fix 2: Update getLangVal for language proficiency
if (!content.includes('x.proficiency_level')) {
  console.log('📝 Updating language proficiency display...');
  content = content.replace(
    /const getLangVal = \\(x\\) => \\{[\\s\\S]*?return x\\.level \\? `[\\$\\{]*x\\.language[\\}\\$]* \\([\\$\\{]*x\\.level[\\}\\$]*\\)` : x\\.language;?[\\s\\S]*?\\}/g,
    \`const getLangVal = (x) => {
  if (x.language || x.name) {
    const langName = x.language || x.name;
    const level = x.level || x.proficiency || x.proficiency_level || x.fluency || '';
    return level ? \`\${langName} (\${level})\` : langName;
  }
  return x.language || x.name || '';
}\`
  );
}

// Fix 3: Update fallback text for internationalization
console.log('🌍 Updating fallback text...');
content = content.replace(
  /\\$\\{userProfile\\?\\.name \\|\\| 'Your Name'\\}/g,
  "${userProfile?.name || (lang === 'GERMAN' ? 'Ihr Name' : lang === 'FRENCH' ? 'Votre Nom' : 'Your Name')}"
);

content = content.replace(
  /\\$\\{userProfile\\?\\.name \\|\\| 'Applicant'\\}/g,
  "${userProfile?.name || (lang === 'GERMAN' ? 'Bewerber' : lang === 'FRENCH' ? 'Candidat' : 'Applicant')}"
);

// Write file back
fs.writeFileSync(FILE_PATH, content, 'utf8');
console.log('✅ All fixes applied successfully!');
