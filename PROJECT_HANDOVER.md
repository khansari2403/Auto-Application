# Job Application Automation Tool - Project Handover Document
## Complete Technical Handover & Documentation

**Document Version:** 2.0  
**Date:** January 11, 2025  
**Project Status:** Active Development  

---

## 1. Executive Summary

### 1.1 Project Overview
This is an AI-powered job hunting assistant built as an **Electron desktop application**. The app automates job searching, compatibility analysis, document generation (CVs, cover letters, motivation letters), and interview preparation.

### 1.2 Key Features
| Feature | Description | Status |
|---------|-------------|--------|
| **Hunter** | Automated job search across multiple job boards | ✅ Working |
| **Auditor** | AI-based job compatibility analysis with learning | ✅ Working |
| **Document Generator** | CV, Cover Letter, Motivation Letter creation | ✅ Fixed |
| **Interview Insider** | Interview question preparation with CV-specific questions | ✅ Fixed |
| **Learning Center** | Auditor trains from user feedback (Yes/No questions) | ✅ Fixed |
| **Ghost Job Network** | Detection of potentially fake job postings | ✅ Working |
| **Multi-language Support** | i18n framework with German/English translations | ✅ Partial |

### 1.3 Technology Stack
- **Framework:** Electron (desktop app)
- **Frontend:** React + TypeScript (Vite bundler)
- **Backend:** Node.js (Electron main process)
- **Database:** sql.js (file-based SQLite as JSON)
- **Web Scraping:** Puppeteer
- **AI Integration:** OpenAI, Together AI, Local (Ollama)
- **IPC:** Electron ipcMain/ipcRenderer

---

## 2. Architecture Overview

### 2.1 Directory Structure
```
/app/
├── src/
│   ├── main/                     # Electron main process (backend)
│   │   ├── database.ts           # JSON-based DB with SQL-like interface
│   │   ├── ai-core.ts            # Core AI caller (OpenAI/Together/Ollama)
│   │   ├── ai-service.ts         # AI orchestration service
│   │   ├── scraper-service.ts    # Web scraping utilities
│   │   ├── email-service.ts      # Email (Nodemailer)
│   │   ├── ipc/
│   │   │   ├── ai-handlers.ts    # IPC handlers for AI operations
│   │   │   ├── database-handlers.ts
│   │   │   └── hunter-handlers.ts
│   │   └── features/
│   │       ├── doc-generator.ts     # CV/Letter generation (CRITICAL)
│   │       ├── compatibility-service.ts  # Job matching algorithm (CRITICAL)
│   │       ├── Hunter-engine.ts     # Job board scraping
│   │       ├── ghost-job-network.ts # Fake job detection
│   │       └── linkedin-scraper.ts  # LinkedIn-specific scraping
│   │
│   └── renderer/                 # React frontend (renderer process)
│       └── components/
│           ├── AuditorQAPanel.tsx   # Learning Center UI (CRITICAL)
│           ├── InterviewInsider.tsx # Interview prep UI (CRITICAL)
│           ├── JobSearch.tsx
│           ├── DocumentViewer.tsx
│           └── Settings.tsx
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 2.2 Data Flow
```
User Action (UI)
    ↓
React Component (renderer process)
    ↓
IPC Invoke (window.electron.invoke)
    ↓
IPC Handler (main process - ai-handlers.ts)
    ↓
Feature Service (compatibility-service.ts, doc-generator.ts)
    ↓
Database (sql.js JSON store)
    ↓
IPC Response
    ↓
UI Update
```

### 2.3 Database Schema
The database is a JSON file with the following structure:

```javascript
{
  user_profile: [{ id, name, email, phone, location, title, skills, summary, ... }],
  job_listings: [{ id, url, job_title, company_name, location, required_skills, status, ... }],
  ai_models: [{ id, model_name, api_key, role, status, ... }],
  documents: [{ id, job_id, user_id, document_type, content, file_path, status, ... }],
  auditor_questions: [{ id, user_id, job_id, question, criteria, answered, ... }],
  auditor_criteria: [{ id, user_id, criteria, userAnswer, job_id, timestamp }],
  action_logs: [{ ... }],
  settings: [{ ... }],
  job_preferences: [{ ... }],
  email_config: [{ ... }]
}
```

**IMPORTANT:** Field naming uses `userAnswer` (camelCase), not `user_answer` (snake_case).

---

## 3. Critical Components

### 3.1 Document Generator (`doc-generator.ts`)
**Purpose:** Generates tailored CVs, Cover Letters, and Motivation Letters

**Key Functions:**
- `generateTailoredDocs()` - Main entry point
- `buildThinkerPrompt()` - Creates AI prompts for each document type
- `generateDocumentHTML()` - Converts content to HTML with proper letter format
- `generateCVHTML()` - Creates structured CV HTML

**Recent Fixes (Jan 2025):**
- Removed Auditor blocking (`const approved = true`)
- Fixed `forceOverride` undefined error
- Added proper business letter format with applicant header
- Letter documents now include: applicant name, contact info, date, company address

### 3.2 Compatibility Service (`compatibility-service.ts`)
**Purpose:** Analyzes job-candidate match and generates learning questions

**Key Logic:**
```typescript
// Order of operations (CRITICAL):
1. Get learned criteria from database
2. Recalculate skills based on learned criteria FIRST
3. Generate questions for REMAINING missing skills
4. While questions pending, boost score (benefit of doubt - 50% assumption)
5. Return final compatibility score
```

**Recent Fixes (Jan 2025):**
- Rewrote to ask questions BEFORE penalizing score
- Fixed field name inconsistency (`userAnswer` everywhere)

### 3.3 Interview Insider (`InterviewInsider.tsx`)
**Purpose:** Generates interview questions with suggested answers

**Question Categories:**
- `get_to_know` - Personal background
- `psychological` - Behavioral questions
- `aptitude` - Problem-solving
- `culture` - Values alignment
- `position_specific` - Technical skills
- `cv_specific` - **NEW** CV vs job comparison

**Recent Fixes (Jan 2025):**
- Integrated CV-specific questions into main question list
- Removed separate "Ask About My CV" box
- Added category filter with CV Specific option (orange gradient)
- Added "+More CV Questions" button

### 3.4 Auditor Learning Center (`AuditorQAPanel.tsx`)
**Purpose:** Collects user feedback to train the Auditor AI

**UI Features:**
- Pending questions with Yes/No buttons
- **Selection state**: Selected answer is bold with gradient background
- **Archive section**: Shows recently answered questions
- **Two-box layout**: Green box (Yes) / Red box (No)
- **Bubble/pill style**: Each criteria as clickable bubble
- **Edit (🔄)**: Click to toggle Yes↔No
- **Delete (✕)**: Click to remove criteria

---

## 4. IPC Handlers Reference

### AI Handlers (`ai-handlers.ts`)

| Handler | Purpose | Parameters |
|---------|---------|------------|
| `ai:generate-tailored-docs` | Generate documents | jobId, userId, options |
| `ai:generate-interview-prep` | Generate interview questions | jobUrl, userId |
| `ai:ask-about-cv` | CV-specific questions | jobUrl, userId, difficultyLevel |
| `ai:ask-custom-question` | Answer user's custom question | question, jobUrl, userId |
| `auditor:get-pending-questions` | Get unanswered questions | userId |
| `auditor:get-learned-criteria` | Get user's learned criteria | userId |
| `auditor:save-criteria` | Save answer as criteria | userId, questionId, criteria, answer |
| `auditor:update-criteria` | Change Yes↔No | criteriaId, newAnswer |
| `auditor:delete-criteria` | Remove criteria | criteriaId |

---

## 5. Known Issues & Solutions

### 5.1 Database Query Format
**Issue:** The `runQuery` function doesn't support SQL WHERE clauses with placeholders
**Solution:** Always pass data as object with `id` field:
```typescript
// ❌ WRONG
await runQuery('DELETE FROM table WHERE id = ?', [criteriaId]);

// ✅ CORRECT
await runQuery('DELETE FROM table', { id: criteriaId });
```

### 5.2 Field Naming Consistency
**Issue:** Mixed `userAnswer` and `user_answer` causing data retrieval failures
**Solution:** Always use `userAnswer` (camelCase) throughout the codebase

### 5.3 Clone Error Prevention
**Issue:** Electron IPC serialization fails on complex objects (Puppeteer page, etc.)
**Solution:** Convert all return values to primitives:
```typescript
return {
  title: String(jobInfo.title || ''),
  company: String(jobInfo.company || ''),
  questions: questions.map(q => ({
    id: String(q.id),
    question: String(q.question)
  }))
};
```

### 5.4 Document Generation Blocked
**Previous Issue:** Auditor was rejecting valid documents for "yellow" jobs
**Solution:** Auditor completely disabled for doc generation (`const approved = true`)

---

## 6. Testing & Verification

### 6.1 Test Files Location
- `/app/test_result.md` - Test documentation
- `/app/test_reports/iteration_*.json` - Automated test results

### 6.2 Manual Testing Checklist

#### Document Generation
- [ ] Select a job with low compatibility score
- [ ] Click "Generate CV" or "Generate Cover Letter"
- [ ] Verify: Document generates without Auditor rejection
- [ ] Verify: Applicant name appears in document header
- [ ] Verify: Cover letter has proper business letter format (date, address)

#### Auditor Learning Center
- [ ] Analyze a new job
- [ ] Verify: Questions appear in pending section
- [ ] Click "Yes" or "No"
- [ ] Verify: Selected answer shows bold styling
- [ ] Verify: Question moves to archive
- [ ] Verify: Criteria appears in Green/Red box

#### Interview Insider
- [ ] Paste a job URL
- [ ] Click "Generate Questions"
- [ ] Verify: Questions appear with categories
- [ ] Click "Generate CV Questions"
- [ ] Verify: CV Specific questions appear in list
- [ ] Filter by "CV Specific" category

---

## 7. Configuration

### 7.1 AI Model Roles
| Role | Purpose | Required |
|------|---------|----------|
| Thinker | Document generation, main AI | Yes |
| Auditor | Review & approval (currently disabled for docs) | Optional |
| HR AI | Interview questions | Yes |
| Hunter | Job search automation | Yes |

### 7.2 Model Configuration
AI keys are stored in the database (`ai_models` table):
```javascript
{
  id: 1,
  model_name: "gpt-4o",
  api_key: "sk-...",
  role: "Thinker",
  status: "active"
}
```

---

## 8. Development Guide

### 8.1 Running the App
```bash
cd /app
npm install
npm run dev      # Development mode with hot reload
npm run build    # Production build
npm run package  # Create distributable
```

### 8.2 TypeScript Check
```bash
npx tsc --noEmit --skipLibCheck
```

### 8.3 Adding New IPC Handler
1. Add handler name to whitelist array in `ai-handlers.ts` (line ~20)
2. Implement handler:
```typescript
ipcMain.handle('my:new-handler', async (_, data) => {
  try {
    // Implementation
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});
```
3. Call from renderer:
```typescript
const result = await (window as any).electron.invoke('my:new-handler', { param: value });
```

---

## 9. Future Roadmap

### P1 - High Priority
- [ ] Ghost Job Platform Integration
- [ ] Persistent scraper session

### P2 - Medium Priority
- [ ] AI Model Test Button reliability
- [ ] Complete i18n translation coverage
- [ ] Local job database export (CSV/SQLite)

### P3 - Low Priority
- [ ] Microinteractions & animations
- [ ] Job board dropdown scraping research

---

## 10. Session History (Jan 11, 2025)

### Files Modified
| File | Changes |
|------|---------|
| `doc-generator.ts` | Fixed `forceOverride` error, improved letter HTML format |
| `compatibility-service.ts` | Rewrote scoring to ask BEFORE ranking |
| `ai-handlers.ts` | Fixed SQL query format, improved error handling |
| `AuditorQAPanel.tsx` | Complete redesign with Green/Red boxes, archive |
| `InterviewInsider.tsx` | Integrated CV-specific questions into main list |
| `constants.ts` | Added `cv_specific` category |
| `ai-core.ts` | Fixed missing `userId` parameter, cleaned file |

### Issues Resolved
1. ✅ Document generation blocked by Auditor
2. ✅ Interview Insider "Ask About CV" not working
3. ✅ Auditor ranking before asking questions
4. ✅ Learning Center UI/UX issues
5. ✅ Cover letter missing applicant name and structure

---

## Appendix A: Quick Reference

### Common Commands
```bash
# Check TypeScript
npx tsc --noEmit --skipLibCheck

# View logs
tail -f /path/to/app/logs/main.log

# Database location
~/.config/job-app-tool/database.json
```

### Key File Locations
- Main AI handlers: `/app/src/main/ipc/ai-handlers.ts`
- Document generator: `/app/src/main/features/doc-generator.ts`
- Compatibility scoring: `/app/src/main/features/compatibility-service.ts`
- Database operations: `/app/src/main/database.ts`
- Learning Center UI: `/app/src/components/AuditorQAPanel.tsx`
- Interview UI: `/app/src/components/InterviewInsider.tsx`

---

**End of Handover Document**
