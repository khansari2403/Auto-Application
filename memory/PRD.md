# Job Application Automation Tool - PRD

## Original Problem Statement
Build an Electron-based desktop application for automated job application management with comprehensive document generation capabilities.

## Core Features

### Theming (8 Total) ✅
- Minimalism (Light/Dark)
- Material Design (Light/Dark)
- Glassmorphism (Light/Dark)
- Neumorphism (Light/Dark)

### Internationalization (i18n) ✅
- Multi-language support for 10 languages

### Document Production System ✅ (NEW)
Full AI-powered document generation with the following document types:
1. **CV/Resume** - Tailored to job requirements with full profile data
2. **Motivation Letter** - Formal letter with 6-point structure
3. **Cover Letter** - Concise introduction and qualifications
4. **Portfolio** - Project summaries and achievements
5. **Proposal** - Business approach for the role

**Generation Flow:**
1. Company Research - Scrapes company mission/history
2. Thinker AI - Generates tailored content
3. Auditor AI - Reviews for quality and ATS compatibility
4. File Saving - Saves as HTML files (can be printed to PDF)

### Backend Features ✅
- Profile Management (create, update, delete)
- Multi-select search criteria (job titles, industries, experience levels)
- Industry blacklist (exclude unwanted industries)
- Scheduler control (disabled by default)
- Document generation on-demand

## Technical Architecture

```
/app/
├── electron-main.ts
├── src/
│   ├── main/                    # Backend (Electron Main Process)
│   │   ├── database.ts          # LowDB database
│   │   ├── ipc-handlers.ts      # IPC API handlers
│   │   ├── ai-service.ts        # AI orchestration
│   │   ├── scraper-service.ts   # Web scraping (Puppeteer)
│   │   └── features/
│   │       ├── doc-generator.ts # Document generation (UPDATED)
│   │       ├── Hunter-engine.ts # Job search
│   │       ├── scheduler.ts     # Background tasks
│   │       └── ...
│   │
│   └── src/                     # Frontend (React)
│       ├── components/
│       │   ├── JobSearch.tsx    # Job list & doc buttons
│       │   ├── SearchProfiles.tsx
│       │   └── settings/
│       │       └── LinkedInSection.tsx
│       ├── contexts/            # Theme, Language
│       └── styles/              # CSS themes
```

## Document Generation Details

### File Structure
Documents are saved to: `{userData}/generated_docs/`
- Format: `{docType}_job{jobId}_{timestamp}.html`
- Example: `cv_job123_1704067200000.html`

### AI Prompts
Each document type has specialized prompts:
- **CV**: Focuses on relevant experience, ATS-friendly format
- **Motivation Letter**: 6-point structure (Purpose, Research, Alignment, Qualifications, Passion, Closing)
- **Cover Letter**: Concise 250-300 words
- **Portfolio**: Project-focused with technologies and impact
- **Proposal**: Business approach with value proposition

### Auditor Criteria
- Language matches job description
- No AI clichés ("thrilled", "passionate", "fast-paced world")
- No long hyphens (—)
- Contact info included
- ATS-friendly structure
- Quantified achievements
- No placeholders

## IPC Channels

### Document Generation
- `ai:generate-tailored-docs` - Generate selected documents for a job
  - Input: `{ jobId, userId, docOptions: { cv, motivationLetter, coverLetter, portfolio, proposal } }`
  - Output: `{ success: boolean, error?: string }`

- `docs:open-file` - Open generated document
  - Input: `filePath`
  - Output: `{ success: boolean }`

### Profile Management
- `user:get-profile`, `user:update-profile`
- `profiles:get-all`, `profiles:save`, `profiles:update`, `profiles:delete`

### Job Management
- `jobs:get-all`, `jobs:add-manual`, `jobs:delete`
- `jobs:update-doc-confirmation`

## Completed Work

### Session 1: Theming & i18n
- 8 themes with CSS variables
- 10 languages with translations

### Session 2: UI/UX Fixes & Backend
- Fixed glassmorphism z-index
- Theme consistency across all components
- Neumorphism input styling
- Backend profile management
- Scheduler control

### Session 3: Document Production (Current)
- Enhanced doc-generator.ts with file saving
- HTML template generation for all document types
- CV-specific two-column layout
- Improved AI prompts for human-sounding content
- Auditor review system
- Updated JobSearch UI with better help modal

## Files Modified This Session
- `/app/src/main/features/doc-generator.ts` - Complete rewrite with file saving
- `/app/src/main/ipc-handlers.ts` - Updated document generation handler
- `/app/src/components/JobSearch.tsx` - Improved help modal, fixed doc generation

## Remaining Work

### P2 - Medium Priority
- [ ] PDF export (currently HTML)
- [ ] LinkedIn Profile Scraper (Playwright)

### P3 - Low Priority
- [ ] Secretary authentication
- [ ] Job database export
- [ ] Microinteractions

## Notes for Next Agent
- Documents are saved as HTML files in `{userData}/generated_docs/`
- Users can open HTML in browser and print to PDF
- AI models must be configured in Settings > AI Models before generation works
- The Thinker role generates content, Auditor role reviews it
