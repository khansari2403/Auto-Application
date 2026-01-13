# Job Application Automation Tool - Project Handover Document (V3.0)
## Technical Handover & Current Status Report

**Document Version:** 3.0  
**Date:** January 12, 2026  
**Project Status:** Active Development / Troubleshooting Phase  

---

## 1. Executive Summary

This document provides a detailed status update for the next AI model or developer taking over the project. The application is an **Electron-based job hunting assistant** that automates searching, compatibility analysis, and document generation.

### 1.1 Recent Fixes & Optimizations (Jan 12, 2026)
| Feature | Change | Status |
|---------|--------|--------|
| **Auditor Learning Center** | Collapsed by default; fixed criteria repetition; improved question phrasing. | ✅ Improved |
| **Document Generation** | Implemented automatic PDF conversion; added applicant photo to CV; added CV page limit setting. | ⚠️ Buggy |
| **Language Matching** | Enforced strict language matching (German/English) in prompts and templates. | ⚠️ Inconsistent |
| **Interview Insider** | Enhanced suggested answers with imaginary examples based on CV. | ✅ Working |
| **AI Team Settings** | Added "CV Page Limit" field for "The Thinker" agent. | ✅ Working |

---

## 2. Critical Persistent Issues

The following issues are currently blocking the project and require immediate attention:

### 2.1 ReferenceError: `targetLanguage` is not defined
- **Location:** `src/main/features/doc-generator.ts`
- **Symptom:** The application crashes during document generation with `ReferenceError: targetLanguage is not defined`.
- **Context:** This occurs inside `generateTailoredDocs` and `generateSingleDocument`. Multiple attempts to fix this by defining the variable have failed, likely due to duplicate declarations or scope issues.

### 2.2 Document Generation Failure
- **Symptom:** CVs, Motivation Letters, and Cover Letters are often not created at all.
- **Potential Cause:** The `ReferenceError` mentioned above stops the execution. Also, the transition from HTML to PDF might be failing silently or pointing to incorrect paths.

### 2.3 Language Matching Failure
- **Symptom:** CVs are still being generated in English even when the job description is in German.
- **Requirement:** If the job description contains German keywords (e.g., "kenntnisse", "erfahrung"), the entire CV (including headers) and all letters MUST be in German.

### 2.4 CV Relevance Filtering
- **Symptom:** The CV includes too many skills and certifications.
- **Requirement:** The AI must be instructed to ONLY include the 5-7 most relevant skills and 3-5 relevant certifications for the specific position.

---

## 3. Technical Architecture & Data Flow

### 3.1 Key Files
- **Main AI Logic:** `src/main/features/doc-generator.ts` (Handles CV/Letter generation)
- **PDF Export:** `src/main/features/pdf-export.ts` (Handles HTML to PDF conversion via Puppeteer)
- **IPC Handlers:** `src/main/ipc/ai-handlers.ts` and `src/main/ipc/ai-models-handlers.ts`
- **UI Components:** `src/components/JobSearch.tsx` and `src/components/settings/AIModelsSection.tsx`

### 3.2 Database Schema (JSON)
The app uses a local `db.json` file. Key tables:
- `job_listings`: Stores job details and paths to generated documents (`cv_path`, etc.).
- `ai_models`: Stores API keys and settings for agents like "The Thinker".
- `user_profile`: Stores the applicant's data (experiences, skills, photo).

---

## 4. Instructions for the Next Model

1.  **Clean up `doc-generator.ts`:** The file contains multiple overlapping fix attempts. Perform a clean rewrite of `generateTailoredDocs` and `generateSingleDocument` to ensure variables like `isGerman` and `targetLanguage` are defined once at the top of the function scope.
2.  **Verify PDF Conversion:** Ensure `pdf-export.ts` is correctly called and that the resulting `.pdf` path is saved in both the `job_listings` and `documents` tables.
3.  **Strengthen Language Prompts:** The AI needs a "System" or "User" prompt that explicitly forbids English when the target language is German.
4.  **Implement Relevance Logic:** Add a pre-processing step or a very strict prompt instruction to filter the user's skills/certifications before passing them to the AI for CV generation.
5.  **Fix UI Sync:** Ensure the "CV Page Limit" setting in the UI correctly updates the `ai_models` table in the database.

---

## 5. Appendix: Debugging Logs
The following error was recently observed in the PowerShell logs:
```
[2] Error generating cv: ReferenceError: targetLanguage is not defined
[2]     at Object.generateTailoredDocs (C:\Users\Sideadde\Auto-Application\dist-electron\electron-main.cjs:3519:75)
```

**End of Handover Document V3.0**
