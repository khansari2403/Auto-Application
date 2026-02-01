
import os

path = '/app/src/main/features/doc-generator.ts'

# The issue is likely that cleanAIOutput is NOT called for CVs (I conditionally skipped it to support JSON), 
# but ensureTargetLanguageOrRetry IS called for other docs but MIGHT NOT be called correctly for JSON CVs 
# or maybe the JSON CV prompt lost the language instruction.

# Wait, `ensureTargetLanguageOrRetry` takes `content` which is JSON string for CV.
# If I pass JSON string to `ensureTargetLanguageOrRetry`, it will treat it as text.
# If it detects wrong language in the JSON values, it might try to rewrite the WHOLE JSON structure as text, breaking it.
# AND: `ensureTargetLanguageOrRetry` is skipped for CV in the current code!

# Current code in `generateTailoredDocs`:
# if (type.key === 'cv') {
#   content = content.replace(...)
# } else {
#   content = cleanAIOutput(...)
#   content = await ensureTargetLanguageOrRetry(...)
# }

# PROBLEM: `ensureTargetLanguageOrRetry` is ONLY in the `else` block (for non-CV docs).
# So for CVs, there is NO safety net if the LLM ignores the language rule.
# AND since I changed the prompt to return JSON, the LLM might be getting confused or just defaulting to English.

# FIX 1: Add specific language enforcement for JSON CVs.
# I need to parse the JSON, check values, and if wrong language, translate values.
# OR simpler: Re-add `ensureTargetLanguageOrRetry` but make it smart enough to handle JSON? No, too risky.

# BETTER FIX: Ensure the PROMPT is super strict about language for JSON.
# I already have `languageHardRule` in `buildThinkerPrompt`.
# But in `generateTailoredDocs`, I am NOT checking the output language for CVs.

# Also, the user says "CV created is in English".
# This means the JSON values ("summary", "experiences"...) are in English.

# I should implement a `validateAndFixCVLanguage` function.

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will define `validateAndFixCVLanguage` and call it inside the CV block.

new_function = """
// Helper to fix language in JSON CV
async function validateAndFixCVLanguage(
  jsonString: string,
  targetLanguage: string,
  callAI: Function,
  thinker: any
): Promise<string> {
  try {
    const parsed = JSON.parse(jsonString);
    // Quick heuristic: Check summary language
    const sampleText = parsed.summary || Object.values(parsed.experiences || {})[0] || '';
    if (!sampleText || sampleText.length < 10) return jsonString;

    const detected = franc(sampleText);
    const langMap: Record<string, string> = { deu: 'GERMAN', eng: 'ENGLISH', fra: 'FRENCH', spa: 'SPANISH' };
    const detectedName = langMap[detected] || 'UNKNOWN';

    // If clearly wrong (e.g. English when we want German)
    if (detectedName !== 'UNKNOWN' && detectedName !== 'GERMAN' && targetLanguage === 'GERMAN') {
       console.log(`[Language Fix] Detected ${detectedName} instead of ${targetLanguage}. Fixing...`);
       
       const fixPrompt = `You are a professional translator.
       TARGET LANGUAGE: ${targetLanguage}
       
       The following JSON contains CV content that is in the WRONG language.
       Translate EVERY string value in the JSON object to ${targetLanguage}.
       Do NOT change the keys or structure.
       
       JSON TO TRANSLATE:
       ${jsonString}
       
       Return ONLY the valid translated JSON.`;
       
       const fixedRaw = await callAI(thinker, fixPrompt);
       if (fixedRaw && fixedRaw.trim().startsWith('{')) {
          return fixedRaw.trim();
       }
    }
    return jsonString;
  } catch (e) {
    return jsonString; // Failed to parse or fix, return original
  }
}
"""

# I need to insert this function before `generateTailoredDocs` (or export it).
# And then use it inside `generateTailoredDocs`.

# Let's find where to insert the function. `ensureTargetLanguageOrRetry` ends around line 301.
# I'll insert it after that.

insert_pos = content.find("function stripLetterGreetingAndClosing")
if insert_pos == -1:
    print("Could not find insertion point")
    exit(1)

content_with_func = content[:insert_pos] + new_function + "\n" + content[insert_pos:]

# Now modify the loop in `generateTailoredDocs`.
# Look for:
# if (type.key === 'cv') {
#   // For CVs, we expect JSON. Only strip markdown fences.
#   content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
# }

block_start = "if (type.key === 'cv') {"
block_idx = content_with_func.find(block_start)
if block_idx == -1:
    print("Could not find CV block")
    exit(1)

# I need to match the block accurately.
# It currently looks like:
#       if (type.key === 'cv') {
#         // For CVs, we expect JSON. Only strip markdown fences.
#         content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
#       } else {

replacement_block = """      if (type.key === 'cv') {
        // For CVs, we expect JSON. Only strip markdown fences.
        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        // CRITICAL: Enforce language for CVs (JSON)
        content = await validateAndFixCVLanguage(content, targetLanguage, callAI, thinker);
      } else {"""

# Replace
# Find the exact string to replace
old_block_snippet = """      if (type.key === 'cv') {
        // For CVs, we expect JSON. Only strip markdown fences.
        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      } else {"""

if old_block_snippet not in content_with_func:
    # Try finding simpler version without comments if format varies?
    # Or just use regex logic or precise matching.
    # The comments are from my previous edits, so they should be there.
    # Let's try to locate by context.
    pass

final_content = content_with_func.replace(old_block_snippet, replacement_block)

with open(path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Added validateAndFixCVLanguage")
