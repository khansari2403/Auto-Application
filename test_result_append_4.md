
### Issue #8: Hallucinations, Date Formatting & Sort Order ✅ FIXED
**Date**: Current Session
**Status**: 🔧 FIXED - PENDING USER VERIFICATION
**Problem**: 
1. **Hallucination**: AI was inventing generic web dev skills for Project Management roles.
2. **Date Format**: Weird characters like `2024]03` were appearing in dates (likely PDF copy-paste artifact).
3. **Sort Order**: User reported recent entries coming up first (which is usually desired for CVs, but maybe they meant *reverse* or *chronological*? "The more resents ones come up chronologicaly" usually means reverse-chronological (Newest First), which IS the standard. If they want Oldest First, that's unusual. But my previous fix enforced Newest First. I'll assume "desired order" means "Newest First" and maybe my previous fix failed for German dates. I enhanced the sort logic to handle "Seit/Present" better.)

**Solution Implemented**:
1. **Strict Prompting**: Updated the `Thinker` prompt to explicitly FORBID adding skills not in the source. "DO NOT HALLUCINATE SKILLS".
2. **Auditor Upgrade**: Updated the `Auditor` verification prompt to specifically flag "HALLUCINATED SKILLS" (HTML, CSS, etc.) as a rejection criteria.
3. **Date Cleaning**: Added a `cleanDate` helper in `generateCVHTML` that replaces `]` with `-` to fix the formatting issue reported.
4. **Enhanced Sorting**: Updated `sortDesc` helper to handle "Seit", "Since", "Ongoing" and "Laufend" as "Present" to ensure current jobs stay at the top.

**Files Modified**: `/app/src/main/features/doc-generator.ts`
