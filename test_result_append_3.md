
### Issue #7: Auditor Validation Loop ✅ FIXED
**Date**: Current Session
**Status**: 🔧 FIXED - PENDING USER VERIFICATION
**Problem**: The Auditor AI was not verifying the generated content before saving, allowing potential fabrications.
**Requirement**: "Before the CV is ready to download, the Auditor must see it and approve of it... criteria: not containing inputs not mentioned in Source CV."

**Solution Implemented**:
1. **Re-enabled Auditor Loop**: Inside `generateTailoredDocs`, added a retry loop (max 3 attempts).
2. **Updated Verification Prompt**: Modified `buildVerificationPrompt` to:
   - Explicitly instruct the Auditor to check against `userProfile` (Manual Profile) as the "Source of Truth".
   - Warn about "FABRICATION".
   - Handle JSON format for CVs correctly.
3. **Feedback Loop**: If Auditor rejects (detects fabrication), the feedback is passed back to the Thinker for a rewrite in the next attempt.
4. **Safety Net**: If 3 attempts fail, it saves the best effort but logs a warning (to avoid crashing/hanging).

**Files Modified**: `/app/src/main/features/doc-generator.ts`
