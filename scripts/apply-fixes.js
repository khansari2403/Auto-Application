const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', 'app', 'src', 'main', 'features', 'doc-generator.ts');

// Read file
let content = fs.readFileSync(FILE_PATH, 'utf8');

console.log('🔧 Applying handoff fixes...');

// Fix 1: Add translation functions (if they don't exist)
if (!content.includes('async function translateCVContent')) {
  console.log('➕ Adding translation functions...');
  
  const translationFunctions = `
// Translation functions added by handoff fixes
async function translateCVContent(
  jsonContent: string,
  targetLanguage: string,
  callAI: Function,
  thinker: any
): Promise<string> {
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

async function translateDocumentContent(
  content: string,
  targetLanguage: string,
  callAI: Function,
  thinker: any
): Promise<string> {
  return translateText(content, targetLanguage, callAI, thinker);
}

async function translateText(
  text: string,
  targetLanguage: string,
  callAI: Function,
  thinker: any
): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  
  const translatePrompt = \`Translate to \${targetLanguage}.
RULES:
- Preserve HTML tags
- Return ONLY plain text
- NO JSON wrappers
- NO markdown code blocks
- NO explanations

TEXT: \${text}\`;

  try {
    let translated = await callAI(thinker, translatePrompt);
    
    // Aggressive cleaning
    translated = translated.replace(/^\\s*\\{\\s*["']translated_text["']\\s*:\\s*["'](.+)["']\\s*\\}\\s*$/s, '$1');
    translated = translated.replace(/^\\s*\\{\\s*["']translation["']\\s*:\\s*["'](.+)["']\\s*\\}\\s*$/s, '$1');
    translated = translated.replace(/^\\s*\\{\\s*["']text["']\\s*:\\s*["'](.+)["']\\s*\\}\\s*$/s, '$1');
    translated = translated.replace(/^\\s*\\{\\s*["']content["']\\s*:\\s*["'](.+)["']\\s*\\}\\s*$/s, '$1');
    translated = translated.replace(/^\\s*\`\`\`[a-z]*\\n?/gi, '');
    translated = translated.replace(/\\`\\`\\`\\s*$/g, '');
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
  
  // Insert before the last closing brace or at the end
  content = content + '\\n' + translationFunctions;
}

// Fix 4: Update getLangVal for language proficiency
console.log('📝 Updating language proficiency display...');
content = content.replace(
  /const getLangVal = \\(x: any\\) => \\{[\\s\\S]*?if \\(x\\.language\\) return x\\.level \\? \`\\$\\{x\\.language\\} \\(\\$\\{x\\.level\\}\\)\` : x\\.language;[\\s\\S]*?\\}/g,
  \`const getLangVal = (x: any) => {
  if (x.language || x.name) {
    const langName = x.language || x.name;
    const level = x.level || x.proficiency || x.proficiency_level || x.fluency || '';
    return level ? \`\${langName} (\${level})\` : langName;
  }
  return x.language || x.name || '';
}\`
);

// Fix 5: Update fallback text for internationalization
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
console.log('📄 Modified:', FILE_PATH);
