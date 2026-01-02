# Job Application Automation Tool - PRD

## Original Problem Statement
Build an Electron-based desktop application for automated job application management with comprehensive document generation and smart application capabilities.

## Core Features

### 1. Theming (8 Total) ✅
- Minimalism (Light/Dark)
- Material Design (Light/Dark)
- Glassmorphism (Light/Dark)
- Neumorphism (Light/Dark)

### 2. Internationalization (i18n) ✅
- 10 languages supported

### 3. Document Production System ✅
- CV, Motivation Letter, Cover Letter, Portfolio, Proposal
- AI-powered generation with company research
- Thinker + Auditor review pipeline
- **PDF Export** - Convert all documents to PDF

### 4. LinkedIn Profile Scraper ✅ (NEW)
- Open LinkedIn in browser for manual login
- Capture profile data automatically using Puppeteer
- Extract: name, title, location, experiences, education, skills, certifications, languages
- Save to database for document generation

### 5. Smart Application System ✅ (NEW)
Complete automation for job applications:
- **Form Analysis** - AI analyzes application forms to identify fields
- **Auto-fill** - Maps user profile data to form fields
- **Login/Registration Detection** - Handles authentication requirements
- **File Upload** - Automatically uploads generated documents
- **Q&A System** - Asks user for unclear information
- **Secretary Integration** - Monitors for verification emails

### 6. Q&A Database ✅ (NEW)
- Saves user answers for future applications
- Categorized by type (salary, visa, experience, etc.)
- Editable and deletable
- Auto-suggests answers for similar questions

## Technical Architecture

```
/app/
├── electron-main.ts
├── src/
│   ├── main/                          # Backend (Electron Main Process)
│   │   ├── database.ts                # LowDB database
│   │   ├── ipc-handlers.ts            # IPC API (42+ handlers)
│   │   ├── ai-service.ts              # AI orchestration
│   │   ├── scraper-service.ts         # Web scraping
│   │   └── features/
│   │       ├── doc-generator.ts       # Document generation
│   │       ├── pdf-export.ts          # HTML to PDF conversion (NEW)
│   │       ├── linkedin-scraper.ts    # LinkedIn profile capture (NEW)
│   │       ├── smart-applicant.ts     # Smart application system (NEW)
│   │       ├── Hunter-engine.ts       # Job search
│   │       ├── secretary-service.ts   # Email monitoring
│   │       └── scheduler.ts           # Background tasks
│   │
│   └── src/
│       ├── components/
│       │   ├── JobSearch.tsx          # Job list with Smart Apply
│       │   ├── AlertsQASection.tsx    # Q&A component (NEW)
│       │   ├── SearchProfiles.tsx
│       │   └── settings/
│       │       └── LinkedInSection.tsx # LinkedIn import with scraper
│       ├── contexts/
│       └── styles/
```

## New IPC Channels

### LinkedIn Scraper
- `user:capture-linkedin` - Opens browser / captures profile
- `user:save-linkedin-profile` - Saves captured data

### PDF Export
- `docs:convert-to-pdf` - Convert single HTML to PDF
- `docs:convert-all-pdf` - Convert all job documents to PDF

### Smart Application
- `ai:smart-apply` - Start smart application process
- `ai:continue-application` - Continue with user answers
- `ai:cancel-application` - Cancel active application

### Q&A Database
- `qa:get-all` - Get all saved Q&A pairs
- `qa:update` - Update an answer
- `qa:delete` - Delete Q&A pair

## Smart Application Flow

```
1. User clicks "Smart Apply" on a job
2. System checks if documents are ready
3. Opens application URL in browser (headless: false)
4. Detects if login/registration needed
   - If yes, attempts to fill or asks user
5. Analyzes form fields with AI vision
6. Fills fields from user profile + Q&A database
7. If unclear questions exist:
   - Shows Q&A modal to user
   - User answers and optionally saves for future
8. Uploads documents (CV, cover letter, etc.)
9. Submits application
10. Secretary monitors for confirmation email
```

## Q&A Categories
- `personal` - Name, email, phone, address
- `experience` - Years of experience, previous roles
- `availability` - Start date, notice period
- `salary` - Salary expectations
- `visa` - Work authorization
- `education` - Degrees, certifications
- `skills` - Technical proficiencies
- `other` - Miscellaneous questions

## Database Schema Additions

### questions table
```json
{
  "id": 1234567890,
  "job_id": null,
  "question": "What are your salary expectations?",
  "answer": "€60,000 - €70,000",
  "category": "salary",
  "created_at": "2025-01-02T...",
  "updated_at": "2025-01-02T..."
}
```

## Files Created This Session
- `/app/src/main/features/linkedin-scraper.ts` - LinkedIn profile capture
- `/app/src/main/features/pdf-export.ts` - PDF conversion
- `/app/src/main/features/smart-applicant.ts` - Smart application system
- `/app/src/components/AlertsQASection.tsx` - Q&A UI component

## Files Modified This Session
- `/app/src/main/ipc-handlers.ts` - Added 12 new handlers
- `/app/src/components/JobSearch.tsx` - Smart Apply + Q&A modal
- `/app/src/components/settings/LinkedInSection.tsx` - LinkedIn scraper integration

## Remaining Work

### P3 - Low Priority
- [ ] Secretary authentication flow
- [ ] Local job database export
- [ ] Microinteractions

## Notes for Testing
1. **LinkedIn Scraper** - Requires manual login first, then capture
2. **Smart Apply** - Opens browser window (not headless) for user visibility
3. **PDF Export** - Requires Puppeteer to run in headless mode
4. **Q&A Database** - Persists between sessions in db.json

## Run Instructions
```bash
cd /app
yarn dev  # Full Electron app with backend
```
