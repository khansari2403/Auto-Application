
### Issue #10: Language & Proficiency Fixes ✅ FIXED
**Date**: Current Session
**Status**: 🔧 FIXED - PENDING USER VERIFICATION
**Problem**:
1. **CV Language**: CVs were generated in English even for German jobs because the JSON output wasn't being language-checked.
2. **Proficiency Levels**: Users saw levels in Settings, but not in the CV sidebar because legacy data formats were being cleared by the normalizer.

**Solution Implemented**:
1. **Language Enforcement**: Updated `doc-generator.ts` to call `validateAndFixCVLanguage` for JSON CVs. This helper uses the AI to translate the JSON content if it detects the wrong language.
2. **Legacy Data Support**: Updated `normalizeProfileArrays` to handle legacy comma-separated language strings gracefully (fallback to split by comma instead of returning empty array). This ensures old profiles still show languages in the CV.
3. **Rendering Update**: Confirmed `generateCVHTML` logic correctly renders both new `{language, level}` objects and old string formats.

**Files Modified**: 
- `/app/src/main/features/doc-generator.ts`
