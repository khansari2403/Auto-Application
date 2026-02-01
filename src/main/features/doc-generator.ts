import { runQuery, getDatabase, logAction, getAllQuery } from '../database';
import { getCompanyInfo } from '../scraper-service';
import { franc } from './franc-wrapper.cjs';

import * as fs from 'fs';
import * as path from 'path';
let app: any;
try { app = require('electron').app; } catch (e) { app = (global as any).electronApp; }

// Get base documents directory.
// If the user has configured a storage path (Settings > Storage), we MUST save there.
// Otherwise fallback to app.getPath('userData')/generated_docs.
const getBaseDocsDir = () => {
  try {
    const db = getDatabase();
    const settings = (db.settings || [])[0] || {};
    const configuredRoot = settings.storage_path || settings.storagePath;
    const root = configuredRoot && String(configuredRoot).trim().length > 0
      ? String(configuredRoot).trim()
      : path.join(app.getPath('userData'), 'generated_docs');

    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    return root;
  } catch {
    // Ultra-safe fallback
    const fallback = path.join(app.getPath('userData'), 'generated_docs');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
};

// Get organized documents directory:
// [StorageRoot]/Company/Position/YYYY-MM-DD
const getOrganizedDocsDir = (companyName: string, position: string, dateFolder: string) => {
  // Sanitize folder names (remove invalid characters and Windows-unsafe endings)
  const sanitize = (str: string) => {
    let safe = String(str || '').replace(/[<>:"/\\|?*]/g, '_');
    // Windows does not like folder names ending with a dot or space; strip them
    safe = safe.replace(/[\.\s]+$/g, '');
    safe = safe.trim();
    if (!safe) safe = 'Unknown';
    return safe.substring(0, 50);
  };

  const company = sanitize(companyName || 'Unknown_Company');
  const pos = sanitize(position || 'Unknown_Position');
  const date = sanitize(dateFolder || 'Unknown_Date');

  const docsPath = path.join(getBaseDocsDir(), company, pos, date);
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  return docsPath;
};

// Legacy: Get simple documents directory (for backwards compatibility)
const getDocsDir = () => getBaseDocsDir();

/**
 * Get the profile data based on Thinker's source setting
 */
async function getProfileByThinkerSource(userId: number, thinker: any): Promise<any> {
  const source = thinker?.thinker_source || 'all';
  const db = getDatabase();
  
  // Get all profiles
  const profiles = db.user_profile || [];
  const linkedinProfile = profiles.find((p: any) => p.source === 'linkedin');
  const manualProfile = profiles.find((p: any) => p.source === 'manual');
  const baseProfile = profiles[0];
  
  // Get uploaded CVs
  const documents = db.documents || [];
  const uploadedCvs = documents.filter((d: any) => d.doc_type === 'uploaded_cv');
  
  let selectedProfile = baseProfile;
  
  switch (source) {
    case 'linkedin':
      if (linkedinProfile) {
        selectedProfile = linkedinProfile;
      }
      break;
    case 'manual':
      if (manualProfile) {
        selectedProfile = manualProfile;
      }
      break;
    case 'uploaded_cv':
      // For uploaded CVs, use base profile with CV data integrated
      if (uploadedCvs.length > 0) {
        selectedProfile = baseProfile;
        // Note: CV content could be parsed and integrated here
      }
      break;
    case 'all':
    default:
      // Combine all sources (default behavior). Prefer manual profile when it
      // exists so the user can control CV content via the Manual Profile
      // screen without changing existing Thinker settings.
      if (manualProfile) {
        selectedProfile = manualProfile;
      } else {
        selectedProfile = baseProfile;
      }
      break;
  }
  
  return selectedProfile;
}

/**
 * Build verification prompt for Auditor to check forced documents
 */
function buildVerificationPrompt(docKey: string, docLabel: string, content: string, userProfile: any): string {
  return `You are the "Auditor" agent. A document was generated for a job application. Your job is to verify it doesn't contain FABRICATED information.

DOCUMENT TYPE: ${docLabel}
${docKey === 'cv' ? 'NOTE: The content below is in JSON format. Verify the text values within the JSON structure.' : ''}

USER'S ACTUAL PROFILE DATA (The Source of Truth):
Name: ${userProfile?.name || 'Unknown'}
Title: ${userProfile?.title || 'Unknown'}
Skills: ${JSON.stringify(userProfile?.skills || [])}
Experiences: ${JSON.stringify(userProfile?.experiences || [])}
Education: ${JSON.stringify(userProfile?.educations || [])}

GENERATED CONTENT TO VERIFY:
${content.substring(0, 15000)}

CHECK FOR:
1. **HALLUCINATED SKILLS (CRITICAL)**: Did the generated content add specific technologies (HTML, CSS, JavaScript, SQL, Python, etc.) or hard skills that are NOT in the source profile? If yes, REJECT immediately.
2. **JOB TITLE MISMATCH**: Are there job titles or companies in the generated text that don't match the profile?
3. **FABRICATED DATES**: Are dates significantly different from the profile?

RESPONSE FORMAT:
If the content is factually accurate to the profile: "VERIFIED"
If fabrications/hallucinations are detected: "FABRICATION DETECTED: [explain specifically which skills or tasks were invented]"
Return ONLY the verification status string.`;
}

// Clean AI output - remove JSON artifacts and meta-text
function cleanAIOutput(content: string): string {
  let cleaned = content || '';

  // Remove JSON wrapper patterns
  cleaned = cleaned.replace(/^\s*\{\s*"(coverLetter|motivationLetter|cv|letter|portfolio|proposal)"\s*:\s*"/i, '');
  cleaned = cleaned.replace(/"\s*\}\s*$/i, '');

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[a-z]*\n?/gi, '');
  cleaned = cleaned.replace(/```/g, '');

  // Remove meta-commentary at the start
  cleaned = cleaned.replace(/^Here is (the|your|a) (motivation letter|cover letter|CV|resume|portfolio|proposal)[:\s]*/i, '');
  cleaned = cleaned.replace(/^(Below is|I've created|I have written)[^.]*\.\s*/i, '');

  // Remove em-dashes and replace with regular dashes
  cleaned = cleaned.replace(/—/g, '-');
  cleaned = cleaned.replace(/–/g, '-');

  // Remove escaped newlines and fix formatting
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\"/g, '"');

  // Remove any remaining JSON artifacts
  cleaned = cleaned.replace(/^\s*[\[{]/, '');
  cleaned = cleaned.replace(/[\]}]\s*$/, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Safety net: validate the generated body language and (if mismatch) retry once.
// If the AI still responds in the wrong language, we TRANSLATE the existing
// content instead of silently accepting the error.
export async function ensureTargetLanguageOrRetry(args: {
  content: string;
  lang3: string;
  targetLanguage: string;
  callAI: Function;
  thinker: any;
  originalPrompt: string;
}): Promise<string> {
  const { content, lang3, targetLanguage, callAI, thinker, originalPrompt } = args;

  const text = String(content || '').trim();
  if (text.length < 40) return content; // too short for reliable detection
  if (lang3 === 'und') return content; // unknown JD language

  // Treat any non-German, non-English language as a "third language" where we
  // enforce translation more aggressively instead of trusting automatic
  // detection (which can be flaky for shorter texts).
  const isThirdLanguage = lang3 !== 'deu' && lang3 !== 'eng';

  const detectLang = async (input: string): Promise<string> => {
    const t = String(input || '').trim();
    if (!t || t.length < 5) return 'und';
    return await franc(t);
  };

  let workingText = text;

  // For third languages (French, Polish, etc.), always run a dedicated
  // translation/rewrite step to ${targetLanguage}, regardless of what
  // detection says. This avoids cases where both the job and generated
  // content are misclassified as English and the safety net never triggers.
  if (isThirdLanguage) {
    const forceFixPrompt = `${originalPrompt}

ABSOLUTE TRANSLATION MODE:
The job description language code is '${lang3}', which corresponds to ${targetLanguage}.

You MUST now rewrite/translate THE ENTIRE DOCUMENT below so that it is 100% in ${targetLanguage}.
- Do not change the meaning.
- Preserve structure, headings and bullet points.
- Do NOT include any meta-text, JSON, or markdown fences.

DOCUMENT TO REWRITE:
"""${workingText}"""`;

    const retryRaw = await callAI(thinker, forceFixPrompt);
    if (!retryRaw || String(retryRaw).startsWith('Error:')) return content;

    const cleanedRetry = cleanAIOutput(String(retryRaw));
    const retryText = String(cleanedRetry || '').trim();
    if (!retryText) return content;

    // Do not return early; continue with detection + sanitization using the
    // translated text so we can still catch any residual language issues.
    workingText = retryText;
  }

  // Existing safety net for German/English (and a second pass for third
  // languages when needed).
  // First pass: detect language of the whole generated text
  let detected = await detectLang(workingText);
  if (detected !== 'und' && detected !== lang3) {
    // Second attempt: explicitly rewrite/translate the EXISTING document into the
    // target language. We keep the original prompt for context so that the
    // "ABSOLUTE LANGUAGE RULE" is still present (important for tests and real AI
    // behaviour), but we also pass the previous output so the model can
    // translate/adjust it instead of inventing something completely new.
    const fixPrompt = `${originalPrompt}

CRITICAL LANGUAGE FIX:
The document below was generated in language '${detected}', but the job description language is '${lang3}' which corresponds to ${targetLanguage}.

You MUST now rewrite/translate THIS EXACT DOCUMENT so that it is 100% in ${targetLanguage}. Preserve the structure, headings and bullet points as much as possible.

Return ONLY the rewritten content, with no JSON, no markdown code fences, and no meta-text.

DOCUMENT TO REWRITE:
"""${workingText}"""`;

    const retryRaw = await callAI(thinker, fixPrompt);
    if (!retryRaw || String(retryRaw).startsWith('Error:')) return content;

    const cleanedRetry = cleanAIOutput(String(retryRaw));
    const retryText = String(cleanedRetry || '').trim();
    if (!retryText) return content;

    workingText = retryText;
  }

  // Second pass: line-level sanitation to catch mixed-language sections
  const lines = workingText.split('\n');
  let hasOffendingLines = false;
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.length < 20) continue;
    const lineLang = await detectLang(trimmed);
    if (lineLang !== 'und' && lineLang !== lang3) {
      hasOffendingLines = true;
      break;
    }
  }

  if (!hasOffendingLines) {
    return workingText;
  }

  const sanitizePrompt = `${originalPrompt}

FINAL LANGUAGE SANITIZATION:
Target language: ${targetLanguage} (code: ${lang3}).

The CV text below may contain some lines or bullet points in a different language (e.g. Spanish, Portuguese, English).
You MUST return the same CV content, but with EVERY word rewritten so the entire text is 100% in ${targetLanguage}.
Preserve the structure, headings, bullet points and numbers.

Return ONLY the corrected CV text, with no JSON, no markdown code fences, and no meta-text.

CV TEXT:
"""${workingText}"""`;

  const sanitizedRaw = await callAI(thinker, sanitizePrompt);
  if (!sanitizedRaw || String(sanitizedRaw).startsWith('Error:')) return workingText;

  const cleanedSanitized = cleanAIOutput(String(sanitizedRaw));
  const sanitizedText = String(cleanedSanitized || '').trim();
  return sanitizedText || workingText;
}

// Helper to fix language in JSON CV
async function validateAndFixCVLanguage(
  jsonString: string,
  targetLanguage: string,
  callAI: Function,
  thinker: any
): Promise<string> {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Check summary AND ALL experiences
    const textsToCheck: Record<string, string> = {};
    
    // Add summary
    if (parsed.summary && typeof parsed.summary === 'string' && parsed.summary.length > 20) {
        textsToCheck['summary'] = parsed.summary;
    }
    
    // Add experiences with keys
    if (parsed.experiences) {
        Object.entries(parsed.experiences).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length > 20) {
                textsToCheck[`exp_${key}`] = value;
            }
        });
    }
    
    // Add educations with keys
    if (parsed.educations) {
        Object.entries(parsed.educations).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length > 20) {
                textsToCheck[`edu_${key}`] = value;
            }
        });
    }

    if (Object.keys(textsToCheck).length === 0) return jsonString;

    const langMap: Record<string, string> = {
      deu: 'GERMAN',
      eng: 'ENGLISH',
      fra: 'FRENCH',
      spa: 'SPANISH',
      ita: 'ITALIAN',
      nld: 'DUTCH',
      por: 'PORTUGUESE',
      rus: 'RUSSIAN',
      ukr: 'UKRAINIAN',
      pol: 'POLISH',
      tur: 'TURKISH',
      ara: 'ARABIC',
      hin: 'HINDI',
      zho: 'CHINESE',
      jpn: 'JAPANESE',
      kor: 'KOREAN'
    };

    // Check each substantial text block
    for (const key of Object.keys(textsToCheck)) {
        const text = textsToCheck[key];
        const detected = await franc(text);
        const detectedName = langMap[detected] || 'UNKNOWN';
        
        let shouldTranslate = false;
        
        // English in German CV -> Translate
        if (targetLanguage === 'GERMAN' && detectedName === 'ENGLISH') {
            shouldTranslate = true;
        }
        // General mismatch
        else if (detectedName !== 'UNKNOWN' && detectedName !== targetLanguage) {
            shouldTranslate = true;
        }

        if (shouldTranslate) {
             console.log(`[Language Fix] Translating individual block (${key}) from ${detectedName} to ${targetLanguage}...`);
             
             const translatePrompt = `You are a professional translator.
             TARGET LANGUAGE: ${targetLanguage}
             
             Translate the following text to ${targetLanguage}.
             - Keep the same formatting (bullet points, HTML tags).
             - Do NOT change the meaning.
             - Do NOT hallucinate new facts.
             
             TEXT TO TRANSLATE:
             """${text}"""
             
             Return ONLY the translated text.`;
             
             const translatedRaw = await callAI(thinker, translatePrompt);
             let translated = (translatedRaw || '').trim();
             
             // Remove markdown fences if present
             translated = translated.replace(/^```html/, '').replace(/^```/, '').replace(/```$/, '').trim();
             
             if (translated && translated.length > 5) {
                 // Update the parsed object directly
                 if (key === 'summary') {
                     parsed.summary = translated;
                 } else if (key.startsWith('exp_')) {
                     const expId = key.replace('exp_', '');
                     if (parsed.experiences) parsed.experiences[expId] = translated;
                 } else if (key.startsWith('edu_')) {
                     const eduId = key.replace('edu_', '');
                     if (parsed.educations) parsed.educations[eduId] = translated;
                 }
             }
        }
    }

    return JSON.stringify(parsed);
  } catch (e) {
    return jsonString; // Failed to parse or fix, return original
  }
}

function stripLetterGreetingAndClosing(text: string, isGerman: boolean): string {
  let out = (text || '').trim();

  // Kill typical greeting lines
  const greetingPatterns = isGerman
    ? [
        /^\s*(sehr\s+geehrte[rn]?|liebe[rn]?|hallo)\b[^\n]*\n+/i,
        /^\s*\b(guten\s+tag|guten\s+morgen|guten\s+abend)\b[^\n]*\n+/i,
      ]
    : [
        /^\s*dear\b[^\n]*\n+/i,
        /^\s*to\s+the\s+hiring\s+manager\b[^\n]*\n+/i,
        /^\s*hello\b[^\n]*\n+/i,
      ];

  for (const re of greetingPatterns) {
    out = out.replace(re, '').trim();
  }

  // Kill common closings
  const closingPatterns = isGerman
    ? [
        /\n\s*(mit\s+freundlichen\s+gr\u00fc\u00dfen|freundliche\s+gr\u00fc\u00dfe|beste\s+gr\u00fc\u00dfe|hochachtungsvoll)[^\n]*$/i,
      ]
    : [
        /\n\s*(kind\s+regards|best\s+regards|sincerely|yours\s+sincerely|yours\s+faithfully)[^\n]*$/i,
      ];

  for (const re of closingPatterns) {
    out = out.replace(re, '').trim();
  }

  // If the model repeats applicant name at end, strip it.
  out = out.replace(/\n\s*[A-Z][A-Za-z\-\s]{2,}\s*$/i, '').trim();

  return out;
}

export async function detectJobLanguage(job: any): Promise<{ isGerman: boolean; targetLanguage: string; lang3: string }> {
  const raw = `${job?.job_title || ''} ${job?.required_skills || ''} ${job?.description || ''}`.trim();
  const jobText = raw.toLowerCase();

  // 1) Baseline language detection via franc (supports many languages)
  // franc returns ISO-639-3 (e.g., deu, eng, fra). If it cannot detect, returns 'und'.
  let lang3 = await franc(raw || '');
  const iso6393ToLanguageName: Record<string, string> = {
    deu: 'GERMAN',
    eng: 'ENGLISH',
    fra: 'FRENCH',
    spa: 'SPANISH',
    ita: 'ITALIAN',
    nld: 'DUTCH',
    por: 'PORTUGUESE',
    rus: 'RUSSIAN',
    ukr: 'UKRAINIAN',
    pol: 'POLISH',
    tur: 'TURKISH',
    ara: 'ARABIC',
    hin: 'HINDI',
    zho: 'CHINESE',
    jpn: 'JAPANESE',
    kor: 'KOREAN'
  };

  let targetLanguage = iso6393ToLanguageName[lang3] || 'ENGLISH';

  // 2) Heuristic override for German job ads
  const germanSignals = [
    'kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'bewerbung', 'anschreiben', 'lebenslauf',
    'm/w/d', 'ihr profil', 'ihre aufgaben', 'anforderungen', 'qualifikation', 'teamfähigkeit', 'selbständig',
    'unbefristet', 'vollzeit', 'teilzeit', 'standort', 'deutsch',
    'entwickler', 'ingenieur', 'abschluss', 'wir suchen', 'festanstellung',
    'referenznummer', 'eintrittstermin', 'vergütung', 'arbeitszeit', 'befristet'
  ];

  if (germanSignals.some(k => jobText.includes(k))) {
    console.log('[Language Detect] Forced GERMAN due to keywords');
    lang3 = 'deu';
    targetLanguage = 'GERMAN';
  }

  const isGerman = targetLanguage === 'GERMAN';
  return { isGerman, targetLanguage, lang3 };
}

// Preferred helper when an LLM (Thinker) is available: ask the same model that
// writes the documents to also decide the job language so Brain A and Brain B
// share the same view.
export async function determineJobLanguageUsingLLM(
  job: any,
  thinker: any,
  callAI: Function
): Promise<{ isGerman: boolean; targetLanguage: string; lang3: string; confidence?: number }> {
  try {
    if (!thinker || !callAI) {
      // Fallback to baseline franc-based detection
      return await detectJobLanguage(job);
    }

    const raw = `${job?.job_title || ''} ${job?.required_skills || ''} ${job?.description || ''}`.trim();

    const prompt = `You are the same AI model that will generate CVs and letters for this job seeker.\n\n` +
      `Your FIRST task is to detect the MAIN language of this job posting.\n\n` +
      `RULES:\n` +
      `- Focus on full sentences and paragraphs, not on individual buzzwords, tools or English job titles.\n` +
      `- Ignore company names, product names, brand names and acronyms.\n` +
      `- If 80% or more of the normal text sentences are in one language, choose that as the language.\n` +
      `- Do NOT guess based only on location or company name.\n\n` +
      `Return ONLY valid JSON with this exact shape (no explanations, no markdown):\n` +
      `{\n  "lang3": "deu|eng|fra|spa|ita|nld|por|pol|tur|ara|hin|zho|jpn|kor",\n  "language": "GERMAN|ENGLISH|FRENCH|SPANISH|ITALIAN|DUTCH|PORTUGUESE|POLISH|TURKISH|ARABIC|HINDI|CHINESE|JAPANESE|KOREAN",\n  "confidence": 0.0-1.0 (how sure you are about this main language, 1.0 = completely sure)\n}\n\n` +
      `JOB TEXT:\n${raw.substring(0, 8000)}`;

    const rawResp = await callAI(thinker, prompt);
    if (!rawResp || String(rawResp).startsWith('Error:')) {
      return await detectJobLanguage(job);
    }

    const text = String(rawResp || '').trim();
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : cleaned;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return await detectJobLanguage(job);
    }

    const lang3 = (parsed.lang3 || parsed.code || '').toLowerCase() || 'und';
    let language = String(parsed.language || '').toUpperCase();
    let confidenceRaw = parsed.confidence;
    let confidence = 1.0;
    if (typeof confidenceRaw === 'number' && confidenceRaw >= 0 && confidenceRaw <= 1) {
      confidence = confidenceRaw;
    }

    // Normalize to our internal labels
    const iso6393ToLanguageName: Record<string, string> = {
      deu: 'GERMAN',
      eng: 'ENGLISH',
      fra: 'FRENCH',
      spa: 'SPANISH',
      ita: 'ITALIAN',
      nld: 'DUTCH',
      por: 'PORTUGUESE',
      rus: 'RUSSIAN',
      ukr: 'UKRAINIAN',
      pol: 'POLISH',
      tur: 'TURKISH',
      ara: 'ARABIC',
      hin: 'HINDI',
      zho: 'CHINESE',
      jpn: 'JAPANESE',
      kor: 'KOREAN'
    };

    if (!language || language === 'UNKNOWN') {
      language = iso6393ToLanguageName[lang3] || 'ENGLISH';
    }

    const targetLanguage = language in iso6393ToLanguageName
      ? language
      : (iso6393ToLanguageName[lang3] || language || 'ENGLISH');

    // Extra safety for German: if the job text clearly contains German HR
    // phrases but the LLM picked another language (typically ENGLISH),
    // override to GERMAN. This protects against English buzzwords in German
    // ads causing misclassification.
    const jobText = String(raw || '').toLowerCase();
    const germanSignals = [
      'kenntnisse', 'erfahrung', 'aufgaben', 'profil', 'wir bieten', 'bewerbung', 'anschreiben', 'lebenslauf',
      'm/w/d', 'ihr profil', 'ihre aufgaben', 'anforderungen', 'qualifikation', 'teamfähigkeit', 'selbständig',
      'unbefristet', 'vollzeit', 'teilzeit', 'standort', 'deutsch',
      'entwickler', 'ingenieur', 'abschluss', 'wir suchen', 'festanstellung',
      'referenznummer', 'eintrittstermin', 'vergütung', 'arbeitszeit', 'befristet'
    ];

    let finalTargetLanguage = targetLanguage;
    let finalLang3 = lang3;
    if (germanSignals.some(k => jobText.includes(k)) && targetLanguage !== 'GERMAN') {
      console.log('[Language Detect LLM] Overriding LLM to GERMAN due to strong keywords');
      finalTargetLanguage = 'GERMAN';
      finalLang3 = 'deu';
    }

    const isGerman = finalTargetLanguage === 'GERMAN';

    return { isGerman, targetLanguage: finalTargetLanguage, lang3: finalLang3, confidence };
  } catch (e) {
    console.error('determineJobLanguageUsingLLM failed, falling back to franc:', e);
    return await detectJobLanguage(job);
  }
}

function getJobDateFolder(job: any, isGerman: boolean): string {
  // Use date_imported if present, else today.
  const raw = job?.date_imported || job?.dateImported || job?.date_scraped || job?.dateScraped;
  let d: Date;
  if (raw) {
    const parsed = new Date(raw);
    d = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    d = new Date();
  }
  // Always YYYY-MM-DD (user confirmed)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeProfileArrays(profile: any): any {
  const parseField = (field: any) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try { return JSON.parse(field); } catch { 
        // Fallback for comma-separated strings (backward compatibility)
        return field.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  return {
    ...profile,
    experiences: parseField(profile.experiences),
    educations: parseField(profile.educations),
    skills: parseField(profile.skills),
    licenses: parseField(profile.licenses),
    languages: parseField(profile.languages)
  };
}

function formatExperiencesForPrompt(experiences: any[]): string {
  if (!Array.isArray(experiences) || experiences.length === 0) return 'None provided.';
  return experiences
    .map((exp, idx) => {
      if (!exp || typeof exp === 'string') {
        return `EXPERIENCE #${idx + 1}:\n- Raw: ${String(exp || '').trim()}`;
      }
      const title = exp.title || exp.role || exp.position || 'N/A';
      const company = exp.company || exp.employer || 'N/A';
      const location = exp.location || exp.city || exp.place || 'N/A';
      const start = exp.startDate || exp.start_date || exp.from || exp.start || '';
      const end = exp.endDate || exp.end_date || exp.to || exp.end || '';
      const period = (start || end) ? `${start || ''}${start || end ? ' - ' : ''}${end || ''}` : 'N/A';
      const description = exp.description || exp.details || '';

      return `EXPERIENCE #${idx + 1}:\n- Title: ${title}\n- Company: ${company}\n- Location: ${location}\n- Period: ${period}\n- Description: ${description}`;
    })
    .join('\n\n');
}

function formatEducationsForPrompt(educations: any[]): string {
  if (!Array.isArray(educations) || educations.length === 0) return 'None provided.';
  return educations
    .map((edu, idx) => {
      if (!edu || typeof edu === 'string') {
        return `EDUCATION #${idx + 1}:\n- Raw: ${String(edu || '').trim()}`;
      }
      const degree = edu.degree || edu.title || edu.program || 'N/A';
      const school = edu.school || edu.institution || edu.university || 'N/A';
      const location = edu.location || edu.city || edu.place || 'N/A';
      const start = edu.startYear || edu.start_year || edu.from || edu.start || '';
      const end = edu.endYear || edu.end_year || edu.to || edu.end || '';
      const period = (start || end) ? `${start || ''}${start || end ? ' - ' : ''}${end || ''}` : 'N/A';
      const details = edu.details || edu.description || '';

      return `EDUCATION #${idx + 1}:\n- Degree: ${degree}\n- Institution: ${school}\n- Location: ${location}\n- Period: ${period}\n- Details: ${details}`;
    })
    .join('\n\n');
}


function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z\u00c0-\u017F0-9\+\#\.\-\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

function computeRelevanceScore(itemText: string, jobTokens: Set<string>): number {
  const tokens = tokenize(itemText);
  let score = 0;
  for (const t of tokens) {
    if (jobTokens.has(t)) score += 3;
  }
  // Bonus for exact phrase contains
  const lower = String(itemText || '').toLowerCase();
  for (const jt of Array.from(jobTokens)) {
    if (jt.length >= 4 && lower.includes(jt)) score += 1;
  }
  return score;
}

function filterProfileForJob(userProfile: any, job: any): { profile: any; relevantSkills: string[]; relevantCerts: string[] } {
  const jobText = `${job?.job_title || ''} ${job?.required_skills || ''} ${job?.description || ''}`;
  const jobTokens = new Set(tokenize(jobText));

  // Parse skills - handle both array and JSON string formats
  let skillsRaw: any[] = [];
  if (Array.isArray(userProfile?.skills)) {
    skillsRaw = userProfile.skills;
  } else if (typeof userProfile?.skills === 'string') {
    try { skillsRaw = JSON.parse(userProfile.skills); } catch { skillsRaw = []; }
  }

  // Parse certifications/licenses - handle both array and JSON string formats  
  let certsRaw: any[] = [];
  if (Array.isArray(userProfile?.licenses)) {
    certsRaw = userProfile.licenses;
  } else if (typeof userProfile?.licenses === 'string') {
    try { certsRaw = JSON.parse(userProfile.licenses); } catch { certsRaw = []; }
  }

  const skillStrings = skillsRaw.map((s: any) => {
    if (typeof s === 'string') return s;
    return s?.name || s?.title || JSON.stringify(s);
  }).filter(s => s && s.length > 0);

  const certStrings = certsRaw.map((c: any) => {
    if (typeof c === 'string') return c;
    return c?.name || c?.title || c?.issuer || JSON.stringify(c);
  }).filter(c => c && c.length > 0);

  const scoredSkills = skillStrings
    .map(s => ({ s, score: computeRelevanceScore(s, jobTokens) }))
    .sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));

  const scoredCerts = certStrings
    .map(s => ({ s, score: computeRelevanceScore(s, jobTokens) }))
    .sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));

  // Take top 7 skills (prioritize those with matches, but always include some)
  const relevantSkills = scoredSkills.slice(0, 7).map(x => x.s);
  // Take top 5 certifications
  const relevantCerts = scoredCerts.slice(0, 5).map(x => x.s);

  // Ensure we have at least some skills/certs if available
  const finalSkills = relevantSkills.length > 0 ? relevantSkills : skillStrings.slice(0, 7);
  const finalCerts = relevantCerts.length > 0 ? relevantCerts : certStrings.slice(0, 5);

  console.log(`[Relevance Filter] Skills: ${finalSkills.length}/${skillStrings.length}, Certs: ${finalCerts.length}/${certStrings.length}`);

  const filteredProfile = {
    ...userProfile,
    skills: finalSkills,
    licenses: finalCerts
  };

  return { profile: filteredProfile, relevantSkills: finalSkills, relevantCerts: finalCerts };
}

// Document type definitions
const DOC_TYPES = [
  { key: 'cv', label: 'CV', optionKey: 'cv' },
  { key: 'motivation_letter', label: 'Motivation Letter', optionKey: 'motivationLetter' },
  { key: 'cover_letter', label: 'Cover Letter', optionKey: 'coverLetter' },
  { key: 'portfolio', label: 'Portfolio', optionKey: 'portfolio' },
  { key: 'proposal', label: 'Proposal', optionKey: 'proposal' }
];

// Generate HTML template for document
export function generateDocumentHTML(content: string, docType: string, userProfile: any, job: any, isGerman: boolean, targetLanguage?: string): string {
  const title = `${docType} - ${userProfile?.name || 'Applicant'} - ${job?.company_name || 'Company'}`;
  const isLetter = docType.toLowerCase().includes('letter');

  const currentDate = new Date().toLocaleDateString(isGerman ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Template owns greeting/closing to avoid doubles.
  // To ensure 100% language matching for ANY detected language, we generate
  // greeting/closing labels dynamically (German + English are hand-tuned; other
  // languages use a small safe default set).
  const lang = (targetLanguage || (isGerman ? 'GERMAN' : 'ENGLISH')).toUpperCase();

  const salutationMap: Record<string, string> = {
    GERMAN: 'Sehr geehrte Damen und Herren,',
    ENGLISH: 'Dear Hiring Manager,',
    FRENCH: 'Madame, Monsieur,',
    SPANISH: 'Estimado equipo de selección,',
    ITALIAN: 'Gentile responsabile delle assunzioni,',
    DUTCH: 'Geachte heer/mevrouw,',
    PORTUGUESE: 'Prezado(a) responsável pela contratação,',
    POLISH: 'Szanowni Państwo,',
    TURKISH: 'Sayın Yetkili,',
    RUSSIAN: 'Уважаемые господа,',
    UKRAINIAN: 'Шановні пані та панове,',
    ARABIC: 'السادة/السيدات المحترمون،',
    HINDI: 'माननीय चयन समिति,',
    CHINESE: '尊敬的招聘经理：',
    JAPANESE: '採用ご担当者様',
    KOREAN: '채용 담당자님께'
  };

  const closingMap: Record<string, string> = {
    GERMAN: 'Mit freundlichen Grüßen',
    ENGLISH: 'Kind regards,',
    FRENCH: 'Cordialement,',
    SPANISH: 'Atentamente,',
    ITALIAN: 'Cordiali saluti,',
    DUTCH: 'Met vriendelijke groet,',
    PORTUGUESE: 'Atenciosamente,',
    POLISH: 'Z poważaniem,',
    TURKISH: 'Saygılarımla,',
    RUSSIAN: 'С уважением,',
    UKRAINIAN: 'З повагою,',
    ARABIC: 'مع خالص التحية،',
    HINDI: 'सादर,',
    CHINESE: '此致\n敬礼',
    JAPANESE: '敬具',
    KOREAN: '감사합니다.'
  };

  const salutation = salutationMap[lang] || salutationMap.ENGLISH;
  const closing = closingMap[lang] || closingMap.ENGLISH;

  // Ensure content doesn't have redundant headers if AI generated them
  let cleanContent = content;
  if (isLetter) {
    cleanContent = stripLetterGreetingAndClosing(cleanContent, isGerman);
  }

  return `<!DOCTYPE html>
<html lang="${isGerman ? 'de' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 80px;
      background: #fff;
    }
    
    .letterhead {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
    
    .applicant-info {
      text-align: left;
    }
    
    .applicant-name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .applicant-contact {
      font-size: 13px;
      color: #666;
    }
    
    .applicant-contact p { margin: 1px 0; }
    
    .date-section {
      text-align: right;
      font-size: 14px;
      color: #444;
      margin-bottom: 30px;
    }
    
    .recipient-info {
      margin-bottom: 35px;
      font-size: 14px;
      color: #222;
      line-height: 1.5;
    }
    
    .recipient-info p { margin: 2px 0; }
    
    .salutation {
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 15px;
    }
    
    .content {
      font-size: 15px;
      text-align: justify;
      white-space: pre-wrap;
      margin-bottom: 40px;
    }
    
    .signature {
      margin-top: 40px;
    }
    
    .closing {
      margin-bottom: 30px;
      font-size: 15px;
    }
    
    .signature-name {
      font-weight: 700;
      font-size: 16px;
      color: #0077b5;
    }

    @media print {
      body { padding: 40px; }
      .letterhead { margin-bottom: 30px; }
    }
  </style>
</head>
<body>
  ${isLetter ? `
  <div class="letterhead">
    <div class="applicant-info">
      <div class="applicant-name">${userProfile?.name || 'Your Name'}</div>
      <div class="applicant-contact">
        ${userProfile?.email ? `<p>${userProfile.email}</p>` : ''}
        ${userProfile?.phone ? `<p>${userProfile.phone}</p>` : ''}
        ${userProfile?.location ? `<p>${userProfile.location}</p>` : ''}
      </div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #999;">
      ${isGerman
        ? (docType.toLowerCase().includes('motivation') ? 'MOTIVATIONSSCHREIBEN'
          : docType.toLowerCase().includes('cover') ? 'ANSCHREIBEN'
          : docType.toLowerCase().includes('portfolio') ? 'PORTFOLIO'
          : docType.toUpperCase())
        : docType.toUpperCase()}
    </div>
  </div>
  
  <div class="date-section">${currentDate}</div>
  
  <div class="recipient-info">
    <p><strong>To: Hiring Manager</strong></p>
    <p>${job?.company_name || 'Company Name'}</p>
    ${job?.location ? `<p>${job.location}</p>` : ''}
  </div>
  
  <div class="salutation">${salutation}</div>
  ` : `
  <div class="header" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0077b5;">
    <div style="font-size: 32px; font-weight: 700; color: #0077b5; margin-bottom: 5px;">${userProfile?.name || 'Your Name'}</div>
    <div style="font-size: 18px; color: #555; margin-bottom: 15px;">${userProfile?.title || 'Professional Title'}</div>
    <div style="font-size: 14px; color: #666; display: flex; gap: 20px;">
      ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
      ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
      ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
    </div>
  </div>
  `}
  
  <div class="content">${cleanContent.replace(/\n/g, '<br>')}</div>
  
  ${isLetter ? `
  <div class="signature">
    <div class="closing">${closing}</div>
    <div class="signature-name">${userProfile?.name || 'Your Name'}</div>
  </div>
  ` : ''}
</body>
</html>`;
}

// Helper: normalize "code-like" CV outputs into readable sections.
// Some models return CVs in a JSON-ish format like:
// "CONTACT": { "Name": "...", ... }
// This makes the PDF look like a string of code. We detect this pattern and
// rewrite it into a clean, human-readable layout before injecting into HTML.
function normalizeCvText(content: string, isGerman: boolean): string {
  let text = String(content || '');

  // If the text clearly looks like JSON/structured output, rewrite it into a
  // simple, human-readable layout. We intentionally accept being a bit
  // aggressive here because CVs should never contain curly braces or JSON
  // fragments for the user.
  const looksLikeJsonCv = /"CONTACT"\s*:\s*\{/i.test(text) ||
    /"PROFESSIONAL SUMMARY"\s*:/i.test(text) ||
    /\{\s*"Name"\s*:\s*"/i.test(text);

  if (looksLikeJsonCv) {
    // Introduce section breaks around known keys
    text = text.replace(/"CONTACT"\s*:\s*\{/gi, 'CONTACT\n');
    text = text.replace(/"PROFESSIONAL SUMMARY"\s*:\s*/gi, '\n\nPROFESSIONAL SUMMARY\n');
    text = text.replace(/"WORK EXPERIENCE"\s*:\s*\[/gi, '\n\nWORK EXPERIENCE\n- ');
    text = text.replace(/"EDUCATION"\s*:\s*\[/gi, '\n\nEDUCATION\n- ');
    text = text.replace(/"SKILLS"\s*:\s*\[/gi, '\n\nSKILLS\n- ');
    text = text.replace(/"CERTIFICATIONS"\s*:\s*\[/gi, '\n\nCERTIFICATIONS\n- ');

    // Remove JSON structural characters globally – they should never appear
    // in the final CV presented to the user.
    text = text.replace(/[\{\}\[\]"]/g, '');
    text = text.replace(/,\s*\n/g, '\n');
  }

  // As a final safety net, strip any remaining stray curly braces which might
  // have slipped through other formats.
  text = text.replace(/[\{\}]/g, '');

  // Strip simple markdown bold/italic markers like **EDUCATION** or __Skills__
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');

  // Localize the section labels for German CVs so headings are not English.
  if (isGerman) {
    // JSON-style headings
    text = text.replace(/^CONTACT$/gim, 'Kontakt');
    text = text.replace(/^PROFESSIONAL SUMMARY$/gim, 'Berufsprofil');
    text = text.replace(/^WORK EXPERIENCE$/gim, 'Berufserfahrung');
    text = text.replace(/^EDUCATION$/gim, 'Ausbildung');
    text = text.replace(/^SKILLS$/gim, 'Kenntnisse');
    text = text.replace(/^CERTIFICATIONS$/gim, 'Zertifizierungen');

    // Plain-text or markdown headings the model may emit
    text = text.replace(/^\s*EDUCATION\s*$/gim, 'Ausbildung');
    text = text.replace(/^\s*WORK EXPERIENCE\s*$/gim, 'Berufserfahrung');
    text = text.replace(/^\s*PROFESSIONAL SUMMARY\s*$/gim, 'Berufsprofil');
    text = text.replace(/^\s*SKILLS\s*$/gim, 'Kenntnisse');
    text = text.replace(/^\s*CERTIFICATIONS\s*$/gim, 'Zertifizierungen');
  }

  return text.trim();
}

// Generate CV HTML with full profile - supports multiple languages
// When CV Style Persona is "Use my manually input profile" and language is German, we use a
// two-column Lebenslauf-style layout: left = Kontakt/Sprachen/Qualifikationen,
// right = main CV content.
export function generateCVHTML(
  content: string,
  userProfile: any,
  job: any,
  isGerman: boolean,
  targetLanguage?: string,
  cvStylePersona?: string
): string {
  const lang = (targetLanguage || (isGerman ? 'GERMAN' : 'ENGLISH')).toUpperCase();
  const persona = (cvStylePersona || 'Classic').toLowerCase();
  const isMimicPersona = persona.includes('mimic'); // internal flag for "Use my manually input profile" style

  // 1. Parsing JSON content from AI (New Deterministic Engine)
  let rewritten: { summary?: string; experiences?: Record<string, string>; educations?: Record<string, string> } = {};
  try {
     const jsonClean = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
     if (jsonClean.startsWith('{')) {
       rewritten = JSON.parse(jsonClean);
     }
  } catch (e) {
     console.error('Failed to parse CV JSON content:', e);
  }

  // Multi-language labels
  const labels: Record<string, Record<string, string>> = {
    GERMAN: { summary: 'Berufsprofil', experience: 'Berufserfahrung', education: 'Ausbildung', skills: 'Kenntnisse', certifications: 'Zertifizierungen', languages: 'Sprachkenntnisse', present: 'Heute' },
    ENGLISH: { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', certifications: 'Certifications', languages: 'Languages', present: 'Present' },
    FRENCH: { summary: 'Profil Professionnel', experience: 'Expérience Professionnelle', education: 'Formation', skills: 'Compétences', certifications: 'Certifications', languages: 'Langues', present: 'Présent' },
    SPANISH: { summary: 'Perfil Profesional', experience: 'Experiencia Laboral', education: 'Educación', skills: 'Habilidades', certifications: 'Certificaciones', languages: 'Idiomas', present: 'Presente' },
    ITALIAN: { summary: 'Profilo Professionale', experience: 'Esperienza Lavorativa', education: 'Istruzione', skills: 'Competenze', certifications: 'Certificazioni', languages: 'Lingue', present: 'Presente' },
    DUTCH: { summary: 'Professioneel Profiel', experience: 'Werkervaring', education: 'Opleiding', skills: 'Vaardigheden', certifications: 'Certificeringen', languages: 'Talen', present: 'Heden' }
  };
  const l = labels[lang] || labels.ENGLISH;

  const sidebarLabels: Record<string, { contact: string; extras: string; certs: string }> = {
    GERMAN: { contact: 'Kontakt', extras: 'Weitere Qualifikationen', certs: 'Zertifizierungen' },
    ENGLISH: { contact: 'Contact', extras: 'Additional Qualifications', certs: 'Certifications' },
    FRENCH: { contact: 'Contact', extras: 'Compétences', certs: 'Certifications' },
    SPANISH: { contact: 'Contacto', extras: 'Competencias', certs: 'Certificaciones' },
    ITALIAN: { contact: 'Contatti', extras: 'Competenze', certs: 'Certificazioni' },
    DUTCH: { contact: 'Contact', extras: 'Vaardigheden', certs: 'Certificeringen' }
  };
  const sidebar = sidebarLabels[lang] || sidebarLabels.ENGLISH;
  
  const htmlLangMap: Record<string, string> = { GERMAN: 'de', ENGLISH: 'en', FRENCH: 'fr', SPANISH: 'es', ITALIAN: 'it', DUTCH: 'nl' };
  const htmlLang = htmlLangMap[lang] || 'en';

  const formatContent = (text: string): string => text ? text.replace(/\n/g, '<br>') : '';

  // Clean date strings: Remove ANY non-standard date characters (keep digits, letters, dot, hyphen, space)
  const cleanDate = (d: string | number | undefined): string => {
    if (!d) return '';
    let s = String(d).trim();
    // Replace typical OCR garbage (], }, |, etc) with hyphen
    // We use a whitelist approach now: if it's not alphanumeric, dot, comma, or space, it becomes a hyphen.
    s = s.replace(/[^a-zA-Z0-9.,\s]/g, '-');
    // Normalize dots/slashes to hyphens
    s = s.replace(/[\.\/]/g, '-');
    // Remove double hyphens
    s = s.replace(/-+/g, '-');
    return s;
  };

  // --- Sorting Helper ---
  const sortDesc = (a: any, b: any) => {
    // 1. Priority: Currently Working Here (boolean)
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;

    const getYear = (d: string | number) => {
      if (!d) return 0;
      // Match 4 digits (19xx or 20xx) to avoid matching days/months
      const m = String(d).match(/(?:19|20)\d{2}/);
      return m ? parseInt(m[0], 10) : 0;
    };
    // Enhanced present detection including "Seit", "Since", "Ongoing"
    const isPresent = (d: string | number) => /present|heute|now|current|bis heute|seit|since|ongoing|laufend/i.test(String(d || ''));
    
    // Compare end dates first
    const endA = a.endDate || a.end_date || a.to || a.end || a.endYear || a.end_year || '';
    const endB = b.endDate || b.end_date || b.to || b.end || b.endYear || b.end_year || '';
    
    const presentA = isPresent(endA);
    const presentB = isPresent(endB);

    if (presentA && !presentB) return -1; // A is present (newer), comes first
    if (!presentA && presentB) return 1;  // B is present (newer), comes first
    
    // If both are present (either by boolean or string), sort by Start Date Descending
    if ((a.current && b.current) || (presentA && presentB)) {
        const startA = a.startDate || a.start_date || a.from || a.start || a.startYear || a.start_year || '';
        const startB = b.startDate || b.start_date || b.from || b.start || b.startYear || b.start_year || '';
        return getYear(startB) - getYear(startA);
    }
    
    const yearEndA = getYear(endA);
    const yearEndB = getYear(endB);
    
    if (yearEndA !== yearEndB) return yearEndB - yearEndA; // Higher year (newer) first
    
    // If end years same, compare start years
    const startA = a.startDate || a.start_date || a.from || a.start || a.startYear || a.start_year || '';
    const startB = b.startDate || b.start_date || b.from || b.start || b.startYear || b.start_year || '';
    
    return getYear(startB) - getYear(startA);
  };

  // Deterministic Renderers
  const renderExperiences = () => {
    let exps = userProfile?.experiences || [];
    if (!Array.isArray(exps) || exps.length === 0) return '';

    // Create a copy and sort it (preserve indices for mapping rewritten content if possible? 
    // Wait, rewritten keys are indices 0, 1, 2... based on ORIGINAL order sent to LLM.
    // The LLM was sent the data in `formatExperiencesForPrompt`.
    // If that function sends them in the original order, then key "0" corresponds to original index 0.
    // So we must attach the original index to the item BEFORE sorting, so we can look up the correct rewrite.
    const expsWithIdx = exps.map((e: any, i: number) => ({ ...e, _originalIndex: i }));
    expsWithIdx.sort(sortDesc);
    
    return expsWithIdx.map((exp: any, idx: number) => {
        // Use rewritten description if available using ORIGINAL index
        const originalIdx = exp._originalIndex;
        const rawDesc = rewritten.experiences?.[String(originalIdx)] || exp.description || exp.details || '';
        const desc = rawDesc.replace(/^<ul>/, '<ul class="exp-list">'); // add class for styling if needed

        const start = cleanDate(exp.startDate || exp.start_date || exp.from || exp.start || '');
        const end = cleanDate(exp.endDate || exp.end_date || exp.to || exp.end || '');
        const dateRange = (start) + (end ? ` - ${end}` : '');
        const finalDate = dateRange.replace(/Present/i, l.present).replace(/Heute/i, l.present);
        
        const title = exp.title || exp.role || exp.position || 'N/A';
        const company = exp.company || exp.employer || 'N/A';
        const location = exp.location || exp.city || '';

        return `
        <div class="exp-entry${idx > 0 ? ' exp-entry--spaced' : ''}">
           <div class="exp-dates">${finalDate}</div>
           <div class="exp-title-company">
             <span class="exp-role">${title}</span>
             <span class="exp-company"> | ${company}</span>
           </div>
           ${location ? `<div class="exp-location">${location}</div>` : ''}
           <div class="exp-description">${formatContent(desc)}</div>
        </div>`;
    }).join('');
  };

  const renderEducations = () => {
    let edus = userProfile?.educations || [];
    if (!Array.isArray(edus) || edus.length === 0) return '';

    const edusWithIdx = edus.map((e: any, i: number) => ({ ...e, _originalIndex: i }));
    edusWithIdx.sort(sortDesc);

    return edusWithIdx.map((edu: any, idx: number) => {
        const originalIdx = edu._originalIndex;
        const rawDesc = rewritten.educations?.[String(originalIdx)] || edu.details || edu.description || '';
        const desc = rawDesc;
        
        const start = cleanDate(edu.startYear || edu.start_year || edu.from || edu.start || '');
        const end = cleanDate(edu.endYear || edu.end_year || edu.to || edu.end || '');
        const dateRange = (start) + (end ? ` - ${end}` : '');
        const finalDate = dateRange.replace(/Present/i, l.present).replace(/Heute/i, l.present);
        
        const degree = edu.degree || edu.title || edu.program || 'N/A';
        const school = edu.school || edu.institution || edu.university || 'N/A';
        const location = edu.location || edu.city || '';

        return `
        <div class="exp-entry${idx > 0 ? ' exp-entry--spaced' : ''}">
           <div class="exp-dates">${finalDate}</div>
           <div class="exp-title-company">
             <span class="exp-role">${degree}</span>
             <span class="exp-company"> | ${school}</span>
           </div>
           ${location ? `<div class="exp-location">${location}</div>` : ''}
           <div class="exp-description">${formatContent(desc)}</div>
        </div>`;
    }).join('');
  };

  const summaryText = rewritten.summary || userProfile?.summary || '';
  
  // =========================================================
  // LAYOUT 1: MIMIC / UPLOADED CV (Two Columns)
  // =========================================================
  if (isMimicPersona) {
    const leftSkills = userProfile?.skills || [];
    const leftCerts = userProfile?.licenses || [];
    
    // Parse languages (can be CSV string OR JSON array)
    let leftLangs: any[] = [];
    const rawLangs = userProfile?.languages;
    if (Array.isArray(rawLangs)) {
        leftLangs = rawLangs;
    } else if (typeof rawLangs === 'string') {
        try {
            leftLangs = JSON.parse(rawLangs);
            // If it's just an array of strings ["Eng", "Ger"], use map to normalize
            if (Array.isArray(leftLangs) && typeof leftLangs[0] === 'string') {
                leftLangs = leftLangs.map(l => ({ language: l, level: '' }));
            }
        } catch {
            // CSV fallback
            leftLangs = rawLangs.split(',').map(s => {
                const match = s.trim().match(/^(.*?)\s*\((.*?)\)$/);
                if (match) return { language: match[1], level: match[2] };
                return { language: s.trim(), level: '' };
            }).filter(x => x.language);
        }
    }

    const photo = userProfile?.photo || ''; // Base64 or URL
    
    // Helper to extract strings from objects if needed
    const getVal = (x: any) => typeof x === 'string' ? x : (x.name || x.title || JSON.stringify(x));
    const getLangVal = (x: any) => {
        if (typeof x === 'string') return x;
        if (x.language) return x.level ? `${x.language} (${x.level})` : x.language;
        return x.name || x.title || JSON.stringify(x);
    };

    const skillsHTML = Array.isArray(leftSkills) && leftSkills.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${sidebar.extras}</div><div class="tag-list">${leftSkills.map(s => `<span class="tag">${getVal(s)}</span>`).join('')}</div></div>`
      : '';
      
    const certsHTML = Array.isArray(leftCerts) && leftCerts.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${sidebar.certs}</div><div class="tag-list">${leftCerts.map(c => `<span class="tag tag--cert">${getVal(c)}</span>`).join('')}</div></div>`
      : '';
      
    const langsHTML = Array.isArray(leftLangs) && leftLangs.length
      ? `<div class="sidebar-section"><div class="sidebar-title">${l.languages.toUpperCase()}</div><ul class="list">${leftLangs.map(ln => `<li>${getLangVal(ln)}</li>`).join('')}</ul></div>`
      : '';

    // Build Main Sections
    let mainSectionsHtml = '';
    
    if (summaryText) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.summary}</div>
            <div class="main-content">${formatContent(summaryText)}</div>
        </div>`;
    }
    
    const expHtml = renderExperiences();
    if (expHtml) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.experience}</div>
            <div class="main-content">${expHtml}</div>
        </div>`;
    }
    
    const eduHtml = renderEducations();
    if (eduHtml) {
        mainSectionsHtml += `
        <div class="main-section">
            <div class="main-section-title">${l.education}</div>
            <div class="main-content">${eduHtml}</div>
        </div>`;
    }

    // Photo styling
    const photoStyle = `
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 20px auto;
      display: block;
      border: 3px solid #e0e0e0;
    `;

    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'GERMAN' ? 'Lebenslauf' : 'CV'} - ${userProfile?.name || 'Bewerber'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 30px 40px; background: #fff; }
    .cv-grid { display: grid; grid-template-columns: 30% 70%; gap: 24px; }
    .sidebar { border-right: 2px solid #e0e0e0; padding-right: 18px; display: flex; flex-direction: column; align-items: stretch; }
    .sidebar-header { text-align: center; margin-bottom: 24px; }
    .sidebar-name { font-size: 20px; font-weight: 700; color: #0077b5; margin-bottom: 4px; }
    .sidebar-title-main { font-size: 13px; color: #555; }
    .sidebar-section { margin-bottom: 18px; }
    .sidebar-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
    .contact-line { font-size: 11px; color: #555; }
    .contact-line span { display: block; }

    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }
    .tag--cert { background: #fff3e0; color: #ef6c00; }
    .list { list-style: none; font-size: 11px; color: #444; }
    .list li { margin-bottom: 2px; }

    .main { padding-left: 6px; }
    .main-section { margin-bottom: 20px; }
    .main-section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 4px;
    }
    .main-content { font-size: 11.5px; line-height: 1.7; }
    .exp-entry { margin-bottom: 12px; }
    .exp-entry--spaced { margin-top: 16px; }
    .exp-dates { font-size: 10.5px; font-style: italic; color: #666; margin-bottom: 2px; }
    .exp-title-company { font-size: 12.5px; margin-bottom: 2px; }
    .exp-role { font-weight: 700; color: #000; }
    .exp-company { font-weight: 600; color: #444; }
    .exp-location { font-size: 11px; color: #666; margin-bottom: 4px; }
    .exp-description { margin-top: 4px; }
    .exp-description ul { padding-left: 18px; margin: 0; }
    .exp-description li { margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="cv-grid">
    <aside class="sidebar">
      ${photo ? `<img src="${photo}" alt="Profile Photo" style="${photoStyle}">` : ''}
      <div class="sidebar-header">
        <div class="sidebar-name">${userProfile?.name || 'Ihr Name'}</div>
        <div class="sidebar-title-main">${userProfile?.title || ''}</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-title">${sidebar.contact}</div>
        <div class="contact-line">
          ${userProfile?.email ? `<span>📧 ${userProfile.email}</span>` : ''}
          ${userProfile?.phone ? `<span>📱 ${userProfile.phone}</span>` : ''}
          ${userProfile?.location ? `<span>📍 ${userProfile.location}</span>` : ''}
        </div>
      </div>
      ${langsHTML}
      ${skillsHTML}
      ${certsHTML}
    </aside>
    <main class="main">
      ${mainSectionsHtml}
    </main>
  </div>
</body>
</html>`;
  }

  // =========================================================
  // LAYOUT 2: CLASSIC / SINGLE COLUMN
  // =========================================================
  const skills = userProfile?.skills || [];
  const certifications = userProfile?.licenses || [];
  
  let langs: any[] = [];
  const rawLangs = userProfile?.languages;
  if (Array.isArray(rawLangs)) {
      langs = rawLangs;
  } else if (typeof rawLangs === 'string') {
      try {
          langs = JSON.parse(rawLangs);
          if (Array.isArray(langs) && typeof langs[0] === 'string') {
              langs = langs.map(l => ({ language: l, level: '' }));
          }
      } catch {
          langs = rawLangs.split(',').map(s => {
              const match = s.trim().match(/^(.*?)\s*\((.*?)\)$/);
              if (match) return { language: match[1], level: match[2] };
              return { language: s.trim(), level: '' };
          }).filter(x => x.language);
      }
  }

  const getVal = (x: any) => typeof x === 'string' ? x : (x.name || x.title || JSON.stringify(x));
  const getLangVal = (x: any) => {
      if (typeof x === 'string') return x;
      if (x.language) return x.level ? `${x.language} (${x.level})` : x.language;
      return x.name || x.title || JSON.stringify(x);
  };

  const skillsHTML = Array.isArray(skills) && skills.length
    ? `<div class="section"><div class="section-title">${l.skills}</div><div class="skills-list">${skills.map(s => `<span class="skill-tag">${getVal(s)}</span>`).join('')}</div></div>`
    : '';

  const certsHTML = Array.isArray(certifications) && certifications.length
    ? `<div class="section"><div class="section-title">${l.certifications}</div><div class="skills-list">${certifications.map(c => `<span class="skill-tag" style="background: #fff3e0; color: #ef6c00;">${getVal(c)}</span>`).join('')}</div></div>`
    : '';

  const langsHTML = Array.isArray(langs) && langs.length
    ? `<div class="section"><div class="section-title">${l.languages}</div><div class="skills-list">${langs.map(ln => `<span class="skill-tag" style="background: #f5f5f5; color: #333;">${getLangVal(ln)}</span>`).join('')}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <title>CV - ${userProfile?.name || 'Applicant'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 850px; margin: 0 auto; padding: 30px 40px; background: #fff; }
    .header { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 3px solid #0077b5; }
    .name { font-size: 28px; font-weight: 700; color: #0077b5; }
    .contact { font-size: 13px; color: #666; margin-top: 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #0077b5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e0e0e0; }
    .content { font-size: 14px; line-height: 1.7; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .skill-tag { background: #e3f2fd; color: #0077b5; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
    
    .exp-entry { margin-bottom: 15px; }
    .exp-dates { float: right; color: #666; font-size: 13px; }
    .exp-role { font-weight: 700; font-size: 15px; }
    .exp-company { font-weight: 600; color: #444; }
    .exp-location { font-size: 13px; color: #666; display: inline-block; margin-left: 10px; }
    .exp-description { margin-top: 5px; }
    .exp-description ul { margin-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${userProfile?.name || 'Your Name'}</div>
    <div class="contact">
      ${userProfile?.email ? `📧 ${userProfile.email}` : ''} 
      ${userProfile?.phone ? `| 📱 ${userProfile.phone}` : ''} 
      ${userProfile?.location ? `| 📍 ${userProfile.location}` : ''}
    </div>
  </div>
  
  ${summaryText ? `
  <div class="section">
    <div class="section-title">${l.summary}</div>
    <div class="content">${formatContent(summaryText)}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">${l.experience}</div>
    <div class="content">
      ${renderExperiences()}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${l.education}</div>
    <div class="content">
      ${renderEducations()}
    </div>
  </div>
  
  ${skillsHTML}
  ${certsHTML}
  ${langsHTML}
</body>
</html>`;
}


// Save document to file with organized directory structure
function saveDocumentFile(
  content: string,
  jobId: number,
  docType: string,
  format: 'html' | 'txt' = 'html',
  companyName?: string,
  position?: string,
  dateFolder?: string
): string {
  const docsDir = (companyName && position)
    ? getOrganizedDocsDir(companyName, position, dateFolder || 'Unknown_Date')
    : getDocsDir();

  const timestamp = Date.now();
  const fileName = `${docType}_job${jobId}_${timestamp}.${format}`;
  const filePath = path.join(docsDir, fileName);

  console.log(`Saving document to: ${filePath}`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Document saved: ${filePath}`);

  return filePath;
}

// Type for structured company deep dive
interface CompanyDeepDiveSummary {
  missionVision: string;
  productsServices: string;
  targetMarkets: string;
  cultureValues: string;
  rawText: string;
  depth: 'light' | 'normal' | 'deep';
}

async function buildCompanyDeepDive(job: any, userId: number, callAI: Function): Promise<CompanyDeepDiveSummary> {
  const db = getDatabase();
  const models = await getAllQuery('SELECT * FROM ai_models');

  // Prefer Detective, fall back to Thinker if not configured
  const detectiveModel = models.find((m: any) => m.role === 'Detective' && m.status === 'active');
  const thinkerModel = models.find((m: any) => m.role === 'Thinker' && m.status === 'active');
  const model = detectiveModel || thinkerModel;

  if (!model) {
    return {
      missionVision: '',
      productsServices: '',
      targetMarkets: '',
      cultureValues: '',
      rawText: '',
      depth: 'normal'
    };
  }

  const deepDiveLevel = (model.deep_dive_level || 'normal').toLowerCase();
  const depth: 'light' | 'normal' | 'deep' =
    deepDiveLevel === 'light' || deepDiveLevel === 'deep' ? deepDiveLevel : 'normal';

  // Reuse existing scraper-based research as raw context
  let scrapedInfo = '';
  try {
    await logAction(userId, 'ai_detective', `🔍 Detective researching ${job.company_name}...`, 'in_progress');
    scrapedInfo = await getCompanyInfo(job.company_name, userId, callAI);
  } catch (e: any) {
    console.error('Detective research failed:', e?.message || e);
  }

  const jobContext = `Job Title: ${job.job_title || 'N/A'}\n` +
    `Company: ${job.company_name || 'N/A'}\n` +
    `Location: ${job.location || 'N/A'}\n` +
    `Summary from job ad: ${(job.description || '').substring(0, 1000)}`;

  const functionalPrompt = model.functional_prompt || '';

  const depthInstruction = depth === 'light'
    ? 'Keep each section extremely short (1-2 concise sentences).'
    : depth === 'deep'
      ? 'Provide rich but focused detail for each section (2 short paragraphs max).'
      : 'Provide a balanced level of detail for each section (3-5 sentences).';

  const prompt = `You are "Detective", the company research specialist in an AI job application team.

USER PREFERENCES (always respect these when relevant):
${functionalPrompt || 'No additional preferences provided.'}

TASK:
Analyze the company based on the job context and any scraped website information.

Return ONLY valid JSON (no markdown, no commentary) with this exact shape:
{
  "mission_vision": "...",
  "products_services": "...",
  "target_markets": "...",
  "culture_values": "..."
}

${depthInstruction}
Focus on information that is relevant for tailoring CVs and motivation/cover letters.

JOB CONTEXT:
${jobContext}

SCRAPED COMPANY INFO (may be empty):
${scrapedInfo || 'No additional info scraped.'}`;

  let missionVision = '';
  let productsServices = '';
  let targetMarkets = '';
  let cultureValues = '';

  try {
    const raw = await callAI(model, prompt);
    if (raw && typeof raw === 'string') {
      const cleaned = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : cleaned;
      const parsed = JSON.parse(jsonText);
      missionVision = parsed.mission_vision || parsed.missionVision || '';
      productsServices = parsed.products_services || parsed.productsServices || '';
      targetMarkets = parsed.target_markets || parsed.targetMarkets || '';
      cultureValues = parsed.culture_values || parsed.cultureValues || '';
    }
  } catch (e: any) {
    console.error('Failed to parse Detective deep dive response:', e?.message || e);
  }

  const combinedRaw = [scrapedInfo, missionVision, productsServices, targetMarkets, cultureValues]
    .filter(Boolean)
    .join('\n\n');

  // IMPORTANT: The deep dive itself may be in English or another language,
  // but it is used ONLY as semantic/context input. The actual document
  // language is fully controlled by targetLanguage in buildThinkerPrompt and
  // enforced by ensureTargetLanguageOrRetry. We never copy deepDive text
  // verbatim into the final documents; we only pass it in the prompt.

  return {
    missionVision,
    productsServices,
    targetMarkets,
    cultureValues,
    rawText: combinedRaw || scrapedInfo || '',
    depth
  };
}

export async function generateCompanyDeepDive(job: any, userId: number, callAI: Function): Promise<CompanyDeepDiveSummary> {
  const deepDive = await buildCompanyDeepDive(job, userId, callAI);

  try {
    await runQuery('UPDATE job_listings', {
      id: String(job.id),
      company_deep_dive: JSON.stringify(deepDive)
    });
  } catch (e: any) {
    console.error('Failed to persist company deep dive:', e?.message || e);
  }

  return deepDive;
}

// Main document generation function
export async function generateTailoredDocs(job: any, userId: number, thinker: any, auditor: any, options: any, callAI: Function) {
  const db = getDatabase();

  // Define language variables ONCE at top-level scope using the SAME brain (Thinker)
  // that will write the documents. This keeps language detection (Brain A) and
  // writing (Brain B) aligned.
  const { isGerman, targetLanguage, lang3 } = await determineJobLanguageUsingLLM(job, thinker, callAI);
  const dateFolder = getJobDateFolder(job, isGerman);

  // Get profile based on Thinker's source settings and normalize fields
  let userProfile = await getProfileByThinkerSource(userId, thinker);
  if (!userProfile) {
    await logAction(userId, 'ai_thinker', '❌ No user profile found. Please create your profile first.', 'failed', false);
    return;
  }

  userProfile = normalizeProfileArrays(userProfile);

  // Strict relevance filtering (requested)
  const filtered = filterProfileForJob(userProfile, job);
  const filteredProfile = filtered.profile;

  // Get word/page limits from Thinker settings
  const motivationLetterWordLimit = thinker?.motivation_letter_word_limit || '450';
  const coverLetterWordLimit = thinker?.cover_letter_word_limit || '280';
  const cvPageLimit = thinker?.cv_page_limit || '2';

  // Step 0: Research Company (via Detective / Thinker), conditioned by deep_auto_dive_mode
  let companyResearch = '';
  let companyDeepDive: CompanyDeepDiveSummary | null = null;

  try {
    const settings = (db.settings && db.settings[0]) || {};
    const deepAutoDiveMode: 'off' | 'yellow_plus' | 'green_plus' | 'gold_only' = settings.deep_auto_dive_mode || 'off';

    // Determine job match level from compatibility score
    const compatScore = job.compatibility_score || 0;
    const isGoldJob = compatScore >= 76; // 76-100%
    const isGreenJob = compatScore >= 51 && compatScore < 76; // 51-75%
    const isYellowJob = compatScore >= 26 && compatScore < 51; // 26-50%

    const isEligibleForDeepDive = (() => {
      if (deepAutoDiveMode === 'off') return false;
      if (deepAutoDiveMode === 'gold_only') return isGoldJob;
      if (deepAutoDiveMode === 'green_plus') return isGreenJob || isGoldJob;
      if (deepAutoDiveMode === 'yellow_plus') return isYellowJob || isGreenJob || isGoldJob;
      return false;
    })();

    if (isEligibleForDeepDive) {
      companyDeepDive = await buildCompanyDeepDive(job, userId, callAI);
      companyResearch = companyDeepDive.rawText || 'Research unavailable.';
    } else {
      companyResearch = 'No additional company research available. Focus on what can be inferred from the job description.';
    }
  } catch (e) {
    console.error('Research failed:', e);
    companyResearch = 'Research unavailable.';
  }

  for (const type of DOC_TYPES) {
    if (!options?.[type.optionKey]) continue;

    try {
      await logAction(userId, 'ai_thinker', `✍️ Generating tailored ${type.label} for ${job.company_name}`, 'in_progress');
      await runQuery('UPDATE job_listings', {
        id: String(job.id),
        [`${type.key}_status`]: 'generating',
        [`${type.key}_rejection_reason`]: null
      });

      let attempts = 0;
      const maxAttempts = 3;
      let currentFeedback = '';
      let isVerified = false;
      let finalContent = '';

      // Retry Loop for Auditor Verification
      while (attempts < maxAttempts && !isVerified) {
        attempts++;
        
        if (attempts > 1) {
           await logAction(userId, 'ai_auditor', `🔄 Auditor requested changes. Retrying (${attempts}/${maxAttempts})...`, 'in_progress');
        }

        const thinkerPrompt = buildThinkerPrompt({
          docKey: type.key,
          docLabel: type.label,
          userProfile: filteredProfile,
          job,
          companyResearch,
          companyDeepDive,
          feedback: currentFeedback,
          constraints: {
            motivationLetterWordLimit,
            coverLetterWordLimit,
            cvPageLimit,
            targetLanguage,
            isGerman,
            cvStylePersona: thinker?.cv_style_persona || thinker?.cvStylePersona || 'Classic',
            referenceCvId: thinker?.reference_cv_id || thinker?.referenceCvId || ''
          }
        });

        const rawContent = await callAI(thinker, thinkerPrompt);
        if (!rawContent || String(rawContent).startsWith('Error:')) {
          throw new Error(rawContent || 'AI returned empty content');
        }

        let content = rawContent;
        if (type.key === 'cv') {
          // For CVs, we expect JSON. Only strip markdown fences.
          content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
          // Enforce language for CVs (JSON)
          content = await validateAndFixCVLanguage(content, targetLanguage, callAI, thinker);
        } else {
          content = cleanAIOutput(rawContent);
          // Safety net: verify the AI body language matches the JD language.
          // If mismatch, automatically retry ONCE with extra-strict language instructions.
          content = await ensureTargetLanguageOrRetry({
            content,
            lang3,
            targetLanguage,
            callAI,
            thinker,
            originalPrompt: thinkerPrompt
          });
        }

        // For letters, ensure we never double greeting/closing
        if (type.key === 'motivation_letter' || type.key === 'cover_letter') {
          content = stripLetterGreetingAndClosing(content, isGerman);
        }

        // AUDITOR CHECK
        if (auditor) {
            const auditorPrompt = buildVerificationPrompt(type.key, type.label, content, filteredProfile);
            const auditorResponse = await callAI(auditor, auditorPrompt);
            
            if (auditorResponse && auditorResponse.includes("VERIFIED")) {
                isVerified = true;
                finalContent = content;
                await logAction(userId, 'ai_auditor', `✅ Auditor approved ${type.label}`, 'info');
            } else {
                const reason = auditorResponse ? auditorResponse.replace("FABRICATION DETECTED:", "").trim() : "Unknown verification error";
                currentFeedback = reason;
                
                if (attempts === maxAttempts) {
                    finalContent = content;
                    await logAction(userId, 'ai_auditor', `⚠️ Auditor validation failed after ${maxAttempts} attempts. Saving best effort.`, 'warning');
                }
            }
        } else {
            // No auditor configured, skip verification
            isVerified = true;
            finalContent = content;
        }
      }

      let content = finalContent;
      if (!content) throw new Error("Failed to generate content after Auditor checks.");

      await logAction(userId, 'ai_thinker', `✅ ${type.label} generated successfully`, 'completed', true);

      // Generate HTML file - pass targetLanguage and persona for proper localization & layout
      const htmlContent = type.key === 'cv'
        ? generateCVHTML(
            content,
            filteredProfile,
            job,
            isGerman,
            targetLanguage,
            thinker?.cv_style_persona || thinker?.cvStylePersona || 'Classic'
          )
        : generateDocumentHTML(content, type.label, filteredProfile, job, isGerman, targetLanguage);

      const htmlPath = saveDocumentFile(
        htmlContent,
        job.id,
        type.key,
        'html',
        job.company_name,
        job.job_title,
        dateFolder
      );

      const docId = Date.now() + Math.floor(Math.random() * 1000);
      await runQuery('INSERT INTO documents', {
        id: docId,
        job_id: String(job.id),
        user_id: userId,
        document_type: type.key,
        content: content,
        file_path: htmlPath,
        version: 1,
        status: 'final',
        created_at: new Date().toISOString()
      });

      // Save HTML path to job_listings
      await runQuery('UPDATE job_listings', {
        id: String(job.id),
        [`${type.key}_status`]: 'auditor_done',
        [`${type.key}_path`]: htmlPath,
        [`${type.key}_rejection_reason`]: null
      });

      await logAction(userId, 'ai_thinker', `📄 ${type.label} saved (HTML): ${htmlPath}`, 'completed', true);

      // Convert to PDF immediately
      try {
        const { convertHtmlToPdf } = await import('./pdf-export');
        console.log(`[PDF] Starting conversion for: ${htmlPath}`);
        const pdfResult = await convertHtmlToPdf(htmlPath, userId);

        if (pdfResult.success && pdfResult.pdfPath) {
          // Save pdfPath separately (do NOT overwrite html path)
          await runQuery('UPDATE job_listings', {
            id: String(job.id),
            [`${type.key}_pdf_path`]: pdfResult.pdfPath
          });

          // Update documents row to the PDF path (the user asked for resulting .pdf path saved)
          await runQuery('UPDATE documents', {
            id: docId,
            file_path: pdfResult.pdfPath
          });

          await logAction(userId, 'pdf', `✅ PDF created: ${path.basename(pdfResult.pdfPath)}`, 'completed', true);
          console.log(`[PDF] Success: ${pdfResult.pdfPath}`);
        } else {
          console.error(`[PDF] Conversion failed: ${pdfResult.error || 'Unknown error'}`);
          await logAction(userId, 'pdf', `⚠️ PDF conversion failed: ${pdfResult.error || 'Unknown'}`, 'failed', false);
        }
      } catch (pdfErr: any) {
        console.error('[PDF] Auto-PDF conversion error:', pdfErr?.message || pdfErr);
        await logAction(userId, 'pdf', `❌ PDF error: ${pdfErr?.message || 'Unknown'}`, 'failed', false);
      }
    } catch (e: any) {
      console.error(`Error generating ${type.key}:`, e);
      await runQuery('UPDATE job_listings', {
        id: String(job.id),
        [`${type.key}_status`]: 'failed'
      });
      await logAction(userId, 'ai_thinker', `❌ Error: ${e.message}`, 'failed', false);
    }
  }
}

// Build Thinker prompt based on document type.
// IMPORTANT: This must NOT reference free variables like `targetLanguage`.
function buildThinkerPrompt(args: {
  docKey: string;
  docLabel: string;
  userProfile: any;
  job: any;
  companyResearch: string;
  companyDeepDive?: CompanyDeepDiveSummary | null;
  feedback: string;
  constraints: {
    motivationLetterWordLimit: string;
    coverLetterWordLimit: string;
    cvPageLimit: string;
    targetLanguage: string;
    isGerman: boolean;
    cvStylePersona?: string;
    referenceCvId?: string | number;
  };
}): string {
  const {
    docKey,
    docLabel,
    userProfile,
    job,
    companyResearch,
    companyDeepDive,
    feedback,
    constraints
  } = args;

  const motivationWordLimit = constraints.motivationLetterWordLimit || '450';
  const coverWordLimit = constraints.coverLetterWordLimit || '280';
  const cvPageLimit = constraints.cvPageLimit || '2';
  const targetLanguage = constraints.targetLanguage;
  const isGerman = constraints.isGerman;
  const cvStylePersona = (constraints.cvStylePersona || 'Classic').toString();
  const referenceCvId = constraints.referenceCvId;

  const languageHardRule = `ABSOLUTE LANGUAGE RULE: Output MUST be 100% in ${targetLanguage}. 
  - Every single job description, summary, and detail MUST be in ${targetLanguage}.
  - If the input profile has English text, YOU MUST TRANSLATE IT TO ${targetLanguage}.
  - Do NOT mix languages.
  - Exception: You may keep original English job titles or technical terms (like "Project Manager", "Python", "AWS") but the *sentences describing them* must be in ${targetLanguage}.`;

  const baseContext = `
${languageHardRule}

CV STYLE PERSONA: ${cvStylePersona}
${referenceCvId ? `REFERENCE CV ID: ${referenceCvId} (use section order and headings from the selected reference CV when CV Style Persona is "Uploaded CV").` : ''}

PAGE LIMIT: ${cvPageLimit} A4 pages maximum (applies to ALL documents).

USER PROFILE (FILTERED FOR RELEVANCE - DO NOT ADD OTHER SKILLS/CERTS):
Name: ${userProfile?.name || 'N/A'}
Title: ${userProfile?.title || 'N/A'}
Location: ${userProfile?.location || 'N/A'}
Email: ${userProfile?.email || 'N/A'}
Phone: ${userProfile?.phone || 'N/A'}
Summary: ${userProfile?.summary || 'N/A'}

PROFILE EXPERIENCES (LABELED, DO NOT CONFUSE FIELDS):
${formatExperiencesForPrompt(userProfile?.experiences || [])}

Skills (ONLY these 5-7): ${JSON.stringify(userProfile?.skills || [])}

PROFILE EDUCATION (LABELED, DO NOT CONFUSE FIELDS):
${formatEducationsForPrompt(userProfile?.educations || [])}

Certifications (ONLY these 3-5): ${JSON.stringify(userProfile?.licenses || [])}
Languages: ${JSON.stringify(userProfile?.languages || [])}

JOB DETAILS:
Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || 'N/A'}
Type: ${job.job_type || 'N/A'}
Description: ${job.description || 'N/A'}
Required Skills: ${job.required_skills || 'N/A'}

COMPANY RESEARCH:
${companyResearch || 'No additional company research available. Focus on what can be inferred from the job description.'}

STRUCTURED COMPANY DEEP DIVE (if available):
Mission & Vision: ${companyDeepDive?.missionVision || 'N/A'}
Products & Services: ${companyDeepDive?.productsServices || 'N/A'}
Target Customers / Markets: ${companyDeepDive?.targetMarkets || 'N/A'}
Culture & Values: ${companyDeepDive?.cultureValues || 'N/A'}

IMPORTANT COMPANY ALIGNMENT TASK:
- You MUST actively use the structured company deep dive above when tailoring the content for this specific company.
- Reflect Mission & Vision and Culture & Values in how you present the candidate's motivations, profile summary and tone.
- Reflect Products & Services and Target Customers / Markets in which experiences, achievements and skills you prioritize.
- Even if the research/deep-dive text itself is in English or another language, EVERY sentence you write in the final document MUST be 100% in ${targetLanguage} (except for proper nouns, product names or tool names).

${feedback ? `PREVIOUS FEEDBACK FROM AUDITOR: ${feedback}
Please fix these issues in the new version.` : ''}
`;

  // Style-specific guidance for CV personas
  const cvStyleGuidance = (() => {
    const persona = cvStylePersona.toLowerCase();
    if (persona === 'modern') {
      return `STYLE: Use a modern, achievement-focused CV style. Short, impactful bullet points, clear section headings, and emphasis on measurable results.`;
    }
    if (persona === 'academic') {
      return `STYLE: Use an academic CV style. Emphasize education, research projects, publications, and teaching experience. Use clear section headings like "Forschung", "Projekte", "Publikationen" when appropriate.`;
    }
    if (persona === 'minimalist') {
      return `STYLE: Use a minimalist CV style. Very clean, concise bullets, no redundant phrases, no decorative language. Focus on clarity and readability.`;
    }
    if (persona === 'mimic my cv') {
      return `STYLE: Mimic the user's existing CV layout as closely as possible. Use the same section order, heading labels, and general tone as their reference CV (ID: ${referenceCvId || 'unknown'}), but update the content for this specific job and keep everything in ${targetLanguage}.

STRUCTURE MARKUP:
- Mark each main section with a markdown-style heading line that starts with "## " followed by the section title.
- For a German CV, prefer sections like:
  • "## BERUFSPROFIL" (summary)
  • "## BERUFLICHER WERDEGANG" (or "## BERUFSERFAHRUNG")
  • "## BILDUNG" (or "## AUSBILDUNG")
  • Optional: "## WEITERE QUALIFIKATIONEN", "## SPRACHKENNTNISSE".
- DO NOT create a separate "CONTACT" or "KONTAKT" section; contact information will be handled by the template.
- The content of each section must come after its heading.

WORK EXPERIENCE & EDUCATION ENTRY FORMAT (VERY IMPORTANT FOR LAYOUT):
- For EACH job in the work experience section, emit the raw lines in this order:
  1) "Zeitraum: <Start Monat Jahr> - <Ende Monat Jahr oder Heute>"
  2) "Unternehmen: <Firmenname>" (or "Company: <Company name>" for non-German)
  3) "Standort: <Stadt, Land>" (or "Location: <City, Country>")
  4) A single line with the job title/role (no label, just the title text)
  5) Optional: one line starting with "Aufgaben:" or "Responsibilities:" followed by a short summary or bullets of the tasks.
- For EACH education entry, use a similar pattern, but with STRICT order and no duplicate labels:
  1) "Zeitraum: <Start Jahr> - <Ende Jahr oder Heute>"
  2) "Unternehmen: <Hochschule / Schule>" (or "Company/Institution" equivalent) on its own line (DO NOT mix this with Aufgaben).
  3) "Standort: <Stadt, Land>" (or "Location: <City, Country>") on its own line.
  4) A single line with the degree/title only.
  5) If there are education details (thesis, focus, courses), use ONE line starting with "Aufgaben:" / "Tätigkeiten:" / "Responsibilities:" and then list them. Do NOT repeat "Aufgaben" twice for the same education entry.
- Do NOT prefix the degree/title line with any label. Only the date/company/location and tasks lines use labels.
- Never write placeholder words like "Unbekannt" for missing fields; simply omit the line if you don't have data.

LANGUAGE ENFORCEMENT:
- Every heading and every sentence in the CV MUST be written in the SAME LANGUAGE as the job description (${targetLanguage}).
- It is strictly forbidden to write section titles like "WORK EXPERIENCE" or "EDUCATION" when the language is German. Use "BERUFLICHER WERDEGANG" and "BILDUNG" instead.
- If you are unsure, always choose the fully localized (${targetLanguage}) version of headings and sentences.`;
    }
    return `STYLE: Use a classic, professional CV layout similar to a traditional Word document. Clear sections, bullet points, and conservative formatting.`;
  })();

  const prompts: Record<string, string> = {
    cv: `You are a strict CV Translator and Formatter.
${languageHardRule}

TASK:
Translate the candidate's existing CV content into ${targetLanguage}.
You are generating VALID JSON data that will be fed into a strict HTML layout engine.

OUTPUT FORMAT:
Return a VALID JSON object with this exact structure:
{
  "summary": "Translated professional summary...",
  "experiences": {
    "0": "<ul><li>Translated bullet point 1...</li><li>Translated bullet point 2...</li></ul>",
    "1": "..."
  },
  "educations": {
    "0": "<ul><li>Translated details...</li></ul>"
  }
}

KEYS:
- "experiences": Keys are the indices (0, 1, 2...) matching the order of experiences provided in the prompt.
- "educations": Keys are the indices matching the order of educations provided.
- "summary": A tailored professional summary.

RULES - ANTI-HALLUCINATION & SOURCE OF TRUTH (CRITICAL):
1. **SOURCE OF TRUTH**: The user's profile provided above is the absolute truth.
2. **DO NOT INVENT ROLES**: If the profile says "Project Manager", DO NOT write "Software Developer". If the profile says "Business Admin", DO NOT write "Computer Science".
3. **DO NOT INVENT SKILLS**: If the profile does not list "Java" or "React", DO NOT add them, even if the job description asks for them.
4. **TRANSLATION FOCUS**: Your primary job is to TRANSLATE the existing content to ${targetLanguage}. You may polish the phrasing to sound professional, but you must NOT change the core meaning or facts.
5. **FORMAT**: Return ONLY valid JSON. The values must be HTML snippets (e.g. <ul><li>...</li></ul>) or plain text.
6. **LANGUAGE**: Every word must be in ${targetLanguage}, except for proper nouns (Company names, specific tool names like "Python", "JIRA", "SAP").
`,

    motivation_letter: `You are an expert Motivation Letter writer. Create a compelling, HUMAN-SOUNDING motivation letter.

${baseContext}

WORD LIMIT: ${motivationWordLimit} words (this is configurable by the user)

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT start with "Here is the motivation letter:" or any similar meta-text
2. DO NOT include JSON formatting like { "motivationLetter": ... }
3. DO NOT mention "I could not find..." or "Research was unavailable"
4. DO NOT use long em-dashes (—), use regular dashes (-) only
5. DO NOT use clichés: "I am thrilled", "passionate professional", "fast-paced world"
6. DO NOT start sentences with "I have..." or "I am..." repeatedly
7. DO NOT fabricate or hallucinate information - use ONLY data from the provided profile
8. DO NOT invent company facts not mentioned in the research - if unsure, focus on what's in the job posting
9. Output ONLY the letter BODY (main paragraphs). DO NOT include a date, recipient address, salutation (like "Dear...") or ANY closing/sign-off (like "Kind regards"). The system template will provide those automatically.
10. If you include any greeting or closing, it will be treated as an error.

HANDLING SKILL GAPS (IMPORTANT):
- If the candidate's profile doesn't perfectly match all job requirements, DO NOT reject or avoid the task
- Instead, express genuine enthusiasm to learn and adapt to the role's requirements
- Highlight transferable skills that relate to the missing requirements
- Show willingness to grow: phrases like "I am eager to expand my expertise in..." or "I look forward to developing my skills in..."
- Frame any gaps as growth opportunities, not weaknesses

STRUCTURE (follow exactly):
1. OPENING (1 paragraph): State who you are, what position, and ONE compelling reason why this company
2. COMPANY CONNECTION (1 paragraph): Reference something specific about the company - their products, services, recent news, or values. If research is limited, focus on what's clear from the job posting
3. YOUR VALUE (2 paragraphs):
   - First: Your most relevant experience with SPECIFIC metrics/achievements FROM YOUR ACTUAL PROFILE
   - Second: How your skills directly solve their needs OR how your transferable skills and eagerness to learn make you a strong candidate
4. WHY THIS ROLE (1 paragraph): Personal motivation - career goals, growth opportunity, alignment.
5. CLOSING (1 paragraph): Thank them, express enthusiasm for an interview

IMPORTANT: Do NOT include a greeting/salutation or any closing/sign-off.

MUST INCLUDE:
- At least 2 specific achievements with numbers/metrics FROM THE PROVIDED PROFILE
- At least 1 specific reference to the company (product, service, or value)
- Smooth transitions between paragraphs
- Professional but warm tone
- Proper sign-off with full name
- If skill gaps exist: Express enthusiasm to learn and adapt

Length: Approximately ${motivationWordLimit} words. This is a formal document.
LANGUAGE: You MUST write the entire document in ${targetLanguage}, the same language as the job description. Every sentence must be in ${targetLanguage} (except for names or fixed product/tool names).

Return ONLY the motivation letter BODY (paragraphs). Start directly with the first paragraph and end with the final paragraph. No greeting, no sign-off, no date, no address.`,

    cover_letter: `You are an expert Cover Letter writer. Create a concise, professional cover letter.

${baseContext}

WORD LIMIT: ${coverWordLimit} words (this is configurable by the user)

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT include any JSON formatting like { "coverLetter": ... }
2. DO NOT start with meta-text like "Here is the cover letter:"
3. DO NOT use long em-dashes (—), use regular dashes (-) only
4. DO NOT fabricate or hallucinate information not provided in the profile
5. Output ONLY the letter body content. DO NOT include a salutation (like "Dear...") or closing (like "Kind regards"). The system will provide these automatically.

HANDLING SKILL GAPS:
- If there are gaps between the job requirements and the candidate's profile, highlight transferable skills
- Express genuine enthusiasm to learn and adapt
- Frame gaps as growth opportunities: "I am eager to develop my expertise in..."

REQUIREMENTS:
1. Be concise (approximately ${coverWordLimit} words)
2. Address the hiring manager professionally
3. Highlight 2-3 most relevant qualifications with specific examples FROM THE PROVIDED PROFILE ONLY
4. Show enthusiasm for the specific role AND for learning/growing
5. Include a clear call to action
6. No clichés or AI-sounding phrases
7. LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.
8. Do NOT include any greeting/salutation or any closing/sign-off. The system template adds those.

STRUCTURE:
- Opening paragraph: state the position and express interest (1-2 sentences)
- Middle (2 paragraphs): your relevant qualifications and why you're a great fit
- Closing paragraph: thank them, suggest next steps

Return ONLY the cover letter BODY (paragraphs). No greeting, no sign-off.`,

    portfolio: `You are a Portfolio Description writer. Create a portfolio summary for this job application.

${baseContext}

REQUIREMENTS:
1. Highlight 3-5 most relevant projects or achievements
2. For each project:
   - Brief description (2-3 sentences)
   - Technologies/skills used
   - Measurable impact/results
3. Tailor selection to the job requirements
4. Include links placeholders [Project Link] where appropriate

Return ONLY the portfolio description content.`,

    proposal: `You are a professional Proposal writer. Create a proposal for this job application.

${baseContext}

REQUIREMENTS:
1. Executive Summary: What you propose to do for them
2. Understanding: Show you understand their challenges
3. Approach: How you would tackle the role
4. Value Proposition: What unique value you bring
5. Next Steps: Suggest a meeting or discussion
6. Professional tone, business-focused

Return ONLY the proposal content.`
  };

  return prompts[docKey] || prompts['motivation_letter'];
}

// Build Auditor prompt
function buildAuditorPrompt(docKey: string, docLabel: string, content: string, job: any): string {
  // Get compatibility score and missing skills from job
  const compatScore = job.compatibility_score || 0;
  const missingSkills = job.compatibility_missing_skills ? 
    JSON.parse(job.compatibility_missing_skills) : [];
  
  // Determine job match level
  const isGoldJob = compatScore >= 76; // 76-100%
  const isGreenJob = compatScore >= 51 && compatScore < 76; // 51-75%
  const isYellowJob = compatScore >= 26 && compatScore < 51; // 26-50%
  const isAcceptableJob = compatScore >= 26; // Yellow, Green, or Gold
  
  let flexibilityNote = '';
  
  if (isGoldJob) {
    flexibilityNote = `
**⭐ GOLD JOB (Score: ${compatScore}%) - AUTO-APPROVE ⭐**

YOU MUST RESPOND WITH "APPROVED" FOR THIS DOCUMENT.

This is an EXCELLENT match (76%+). The user is highly qualified.
Your response should be exactly: "APPROVED"

DO NOT look for any issues. DO NOT reject. Just respond "APPROVED".
`;
  } else if (isGreenJob) {
    flexibilityNote = `
**🟢 GREEN JOB (Score: ${compatScore}%) - AUTO-APPROVE 🟢**

YOU MUST RESPOND WITH "APPROVED" FOR THIS DOCUMENT.

This is a GOOD match (51-75%). The user has chosen to apply.
Your response should be exactly: "APPROVED"

DO NOT look for missing skills or quality issues. Just respond "APPROVED".

${missingSkills.length > 0 ? `Note: Some skills may be missing, but the user wants to apply anyway:
- ${missingSkills.slice(0, 5).join('\n- ')}

This is OK. Respond "APPROVED".` : ''}
`;
  } else if (isYellowJob) {
    flexibilityNote = `
**NOTICE - THIS IS A YELLOW JOB (Score: ${compatScore}%):**
This is a reasonable match. The user has chosen to apply despite some gaps.

${missingSkills.length > 0 ? `Missing skills (user is aware):
- ${missingSkills.slice(0, 5).join('\n- ')}

Allow:
- Transferable skills and related experience
- Honest statements about willingness to learn
- Highlighting adjacent experience

DO NOT reject simply because the applicant can't claim direct experience.` : ''}

APPROVE unless there is FABRICATED information or critical format issues.
`;
  }
  
  return `You are the "Auditor" agent. Your job is to review this ${docLabel}.

JOB: ${job.job_title} at ${job.company_name}
COMPATIBILITY SCORE: ${compatScore}%

CONTENT TO REVIEW:
${content}
${flexibilityNote}
**YOUR DECISION RULES:**

1. For GOLD/GREEN jobs (score 51%+): APPROVE unless you find FABRICATED facts
2. For YELLOW jobs (score 26-50%): APPROVE unless you find fabrication or major issues
3. Fabrication means: claiming specific jobs/achievements/certifications the person never had

**THINGS THAT ARE NOT FABRICATION (DO NOT REJECT FOR THESE):**
- Soft skills (leadership, communication, teamwork)
- Transferable experience from related roles
- "Willingness to learn" statements
- General industry knowledge
- Using different words to describe real experience

**FORMAT CHECKS (only reject for severe issues):**
- Language matches job description? (OK if close)
- Has proper greeting? (OK if professional)
- Has proper sign-off? (OK if includes name)
- No obvious placeholders like "[Insert...]"?

**RESPONSE FORMAT:**
If acceptable: respond with exactly "APPROVED"
If has fabrication: respond with "REJECTED: " followed by the specific fabrication found

REMEMBER: You are NOT a gatekeeper. The user chose this job. Help them apply.`;
}

// Export individual document generator for direct calls
export async function generateSingleDocument(
  jobId: number,
  userId: number,
  docType: string,
  thinker: any,
  auditor: any,
  callAI: Function
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const db = getDatabase();
  const job = db.job_listings?.find((j: any) => String(j.id) === String(jobId));
  const userProfile = db.user_profile?.find((p: any) => p.id === userId) || db.user_profile?.[0];

  if (!job) return { success: false, error: 'Job not found' };
  if (!userProfile) return { success: false, error: 'User profile not found' };

  // Define language variables ONCE at top-level scope
  const { isGerman, targetLanguage, lang3 } = await detectJobLanguage(job);
  // (kept for parity with generateTailoredDocs and future type-specific behavior)
  void targetLanguage;
  void isGerman;

  const options: any = {};
  const typeConfig = DOC_TYPES.find(t => t.key === docType);
  if (typeConfig) {
    options[typeConfig.optionKey] = true;
  } else {
    return { success: false, error: `Unknown document type: ${docType}` };
  }

  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI);

  // Refresh job data to get file path
  const updatedJob = db.job_listings?.find((j: any) => String(j.id) === String(jobId));
  const filePath = updatedJob?.[`${docType}_pdf_path`] || updatedJob?.[`${docType}_path`];

  if (filePath) {
    return { success: true, filePath };
  }

  return { success: false, error: 'Document generation failed' };
}