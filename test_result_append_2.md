
### Issue #6: Sorting & Photo Placement (Mimic Layout) ✅ FIXED
**Date**: Current Session
**Status**: 🔧 FIXED - VERIFIED WITH HTML GENERATION
**Problem**: 
1. Work Experience/Education entries were not strictly ordered by date (Newest First).
2. User requested the profile photo to be at the very top of the left sidebar.

**Solution Implemented**:
1. **Sorting Logic**: Added a `sortDesc` helper in `generateCVHTML` that sorts entries by End Date (descending), handling "Present/Heute" correctly as the most recent date.
2. **Applied Sorting**: Applied this sort to both `experiences` and `educations` before rendering.
3. **Photo Injection**: Added logic to check for `userProfile.photo` (Base64/URL). If present, an `<img>` tag is injected at the very top of the sidebar `<aside>` element in the Mimic layout.
4. **Styling**: Styled the photo as a 120px circular image with a subtle border, consistent with the professional look.

**Verification**:
- Created `verify_photo_sort.ts` with scrambled dates and a mock photo.
- Confirmed the generated HTML lists "Present" jobs first, followed by recent years, then older years.
- Confirmed the `<img>` tag appears strictly before the Name/Header in the sidebar.

**Files Modified**: `/app/src/main/features/doc-generator.ts`
