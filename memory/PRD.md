# Job Application Automation Tool - Product Requirements Document

## Original Problem Statement
Build and fix an Electron-based Job Application Automation Tool. The project is in the `refactored` branch of the repository: `https://github.com/khansari2403/Auto-Application`.

## Core Requirements

### 1. ✅ Fix Crash (COMPLETED)
- **Issue**: `ReferenceError: targetLanguage is not defined` in `src/main/features/doc-generator.ts`
- **Solution**: Rewrote `generateTailoredDocs` to properly scope and pass `targetLanguage` variable
- **Status**: Fixed and tested

### 2. ✅ Enforce 100% Language Matching (COMPLETED)
- **Requirement**: If job description is in a specific language (e.g., German, French), all generated documents must be entirely in that language
- **Implementation**: 
  - Dynamic language detection using `franc-min` library
  - Language-specific salutations/closings in template
  - Explicit AI prompt constraints for language consistency
- **Status**: Working for German, French, English, and other languages

### 3. ✅ Language Safety Net (COMPLETED)
- **Requirement**: Validate AI-generated document language matches job description language; retry if mismatch
- **Implementation**: `ensureTargetLanguageOrRetry()` function that:
  - Detects language of generated content
  - Compares with job description language
  - Automatically retries with stricter prompt if mismatch
- **Status**: Tested and verified (AI call count = 2 when mismatch occurs)

### 4. ✅ CV Relevance Filtering (COMPLETED)
- **Requirement**: Generated CV must only include 5-7 most relevant skills and 3-5 most relevant certifications
- **Implementation**: `filterProfileForJob()` function that:
  - Tokenizes job description
  - Scores profile items against job keywords
  - Returns filtered profile with capped skills/certifications
- **Status**: Verified in AI prompts

### 5. ✅ CV Page Limit from UI (COMPLETED)
- **Requirement**: "CV Page Limit" setting from UI must be respected by AI during document generation
- **Implementation**: 
  - UI: `AIModelsSection.tsx` allows setting `cvPageLimit`
  - Handler: `ai-models-handlers.ts` saves to database as `cv_page_limit`
  - Generator: Reads `thinker.cv_page_limit` and includes in AI prompt
- **Status**: Verified "PAGE LIMIT: X" appears in AI prompts

### 6. ✅ PDF Conversion & DB Update (COMPLETED)
- **Requirement**: HTML-to-PDF conversion must work and PDF path must be saved to database
- **Implementation**:
  - Uses Puppeteer with system Chromium (`/usr/bin/chromium`)
  - Updates both `job_listings` and `documents` tables with PDF paths
- **Status**: Tested - PDFs generated and paths saved correctly

### 7. ✅ Correct File Storage Path (COMPLETED)
- **Requirement**: Documents saved to `[StorageRoot]/Company/Position/[YYYY-MM-DD]`
- **Implementation**: `getOrganizedDocsDir()` function builds structured path
- **Status**: Verified - files saved to correct structure

## Technical Architecture

```
/app/
├── src/
│   ├── main/                    # Electron main process (Backend)
│   │   ├── features/
│   │   │   ├── doc-generator.ts # Core AI document generation
│   │   │   └── pdf-export.ts    # HTML to PDF conversion
│   │   ├── ipc/                 # IPC handlers
│   │   │   ├── ai-handlers.ts
│   │   │   └── settings-handlers.ts
│   │   ├── database.ts          # JSON database operations
│   │   └── scraper-service.ts   # Puppeteer web scraping
│   └── components/              # React UI components
│       └── settings/
│           └── AIModelsSection.tsx
├── User_Data/
│   ├── data/db.json            # Local JSON database
│   └── custom_storage/         # Generated documents
└── electron-main.ts            # App entry point
```

## Key Database Schema (db.json)

- **job_listings**: Job records with `cv_pdf_path`, `cover_letter_pdf_path`, etc.
- **documents**: Document metadata with `file_path` field
- **user_profile**: User profile including `skills` and `licenses` arrays
- **settings**: App settings including `storage_path`
- **ai_models**: AI model configs including `cv_page_limit`

## Dependencies
- **Puppeteer**: Web scraping and PDF generation
- **franc-min**: Language detection
- **Electron**: Desktop app framework

## Critical Configuration
- Puppeteer uses system Chromium at `/usr/bin/chromium` (ARM64 compatible)
- All Electron-only modules use try/catch fallback pattern for testability

## Files Modified in This Session
1. `/app/src/main/features/doc-generator.ts` - Language detection, safety net, relevance filtering
2. `/app/src/main/database.ts` - Fixed Electron import for testability
3. `/app/backend/test-comprehensive.ts` - Test suite (created)

## Testing
- All 7 core requirements tested and verified
- Test report at `/app/test_reports/iteration_1.json`

## Future Enhancements
- Set up Jest/Vitest testing framework for CI/CD
- Add unit tests for individual functions
- Consider caching company research results
