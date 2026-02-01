
### Issue #9: Sorting (Current Job) & Language Levels ✅ FIXED
**Date**: Current Session
**Status**: 🔧 FIXED - PENDING USER VERIFICATION
**Problem**:
1. **Sort Order**: "Currently working here" jobs were not guaranteed to be at the very top.
2. **Language Levels**: Languages were simple strings, missing proficiency levels in both UI and CV.

**Solution Implemented**:
1. **Sorting Logic Update**: Updated `generateCVHTML` sort logic. Prioritizes `current: true` flag first. If equal, falls back to parsing dates (including "Present", "Seit", etc.). Ensures currently active jobs are always first.
2. **Settings UI Update**: Modified `SettingsPanel.tsx` (Manual Profile section).
   - Replaced simple text area for Languages with a dynamic list builder.
   - User can now Add/Remove languages and select proficiency (Native, Fluent, C2-A1).
   - Data is stored as a JSON string `[{"language": "Eng", "level": "C1"}]` in the same DB field for compatibility.
3. **CV Rendering Update**: Updated `doc-generator.ts` to parse this JSON structure.
   - Renders languages as "Language (Level)" (e.g., "English (Native)").
   - Maintains backward compatibility for old string-based data.

**Verification**:
- Verified sorting with a test script: Active jobs appear before recent past jobs.
- Verified language rendering: JSON data correctly renders as formatted strings.

**Files Modified**: 
- `/app/src/main/features/doc-generator.ts`
- `/app/src/components/SettingsPanel.tsx`
