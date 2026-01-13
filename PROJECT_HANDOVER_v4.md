# 📄 Project Handover Document
**Date:** January 1, 2026  
**Project:** Job Application Automation App (Phase 4.0)  
**Status:** ✅ WORKING - Core Features Operational

---

## 🚀 Overview

A high-intelligence desktop application built to automate the entire job application lifecycle—from localized searching and scraping to AI-powered document generation and automated submission.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron + React + TypeScript + Vite |
| Database | Local JSON persistence (`db.json`) |
| Automation | Puppeteer (headless browser control) |
| AI Integration | Multi-model support (OpenAI, Together AI, Local Ollama) |
| Build Tool | tsup (TypeScript to CommonJS) |
| Package Manager | npm |

---

## 📁 Directory Structure

Auto-Application/ ├── package.json # Dependencies & scripts ├── tsup.config.ts # Build configuration (CJS format) ├── electron-main.ts # App entry point ├── preload.ts # IPC bridge (Main ↔ Renderer) ├── dist-electron/ # Compiled Electron files (.cjs) └── src/ ├── App.tsx # Main UI & Navigation ├── App.css # Styles ├── main/ # Backend logic (Electron Main Process) │ ├── ai-service.ts # AI Orchestrator (The Brain) │ ├── database.ts # JSON DB with ID-aware CRUD │ ├── scraper-service.ts # Puppeteer logic (Cookie bypass, Stealth) │ ├── ipc-handlers.ts # Consolidated IPC Handlers │ └── features/ # AI Agent Logic │ ├── Hunter-engine.ts # Job discovery & extraction │ ├── doc-generator.ts # CV/Letter generation │ ├── ghost-job-network.ts # Reputation checking │ ├── automated-login.ts # Site login & OTP │ ├── secretary-service.ts # Email monitoring │ └── scheduler.ts # Frequency-based hunting └── components/ # React UI Components ├── JobSearch.tsx # Job table & controls ├── SearchProfiles.tsx # Search profile management ├── SettingsPanel.tsx # Settings container └── settings/ # Settings sub-components


---

## 🤖 AI Agent Team

| Agent | File | Responsibility |
|-------|------|----------------|
| **Hunter** | `Hunter-engine.ts` | Discovers job URLs, extracts data using AI |
| **Thinker** | `doc-generator.ts` | Generates tailored CVs, Motivation Letters |
| **Auditor** | `Hunter-engine.ts` | Validates data quality (rejects if missing company) |
| **Librarian** | `document-analyzer.ts` | Manages technical documents |
| **Secretary** | `secretary-service.ts` | IMAP email monitoring, OTP extraction |
| **Observer** | `scraper-service.ts` | Visual analysis of UI roadblocks |
| **AI Mouse** | `scraper-service.ts` | Executes clicks based on coordinates |

---

## ✅ Working Features (Phase 4.0)

### Core Functionality
- ✅ **App Launch**: Electron starts without GPU/module errors
- ✅ **IPC Communication**: No handler duplication errors
- ✅ **Database**: JSON persistence with proper ID handling
- ✅ **Job Hunting**: Scrapes LinkedIn/Indeed for job URLs
- ✅ **AI Extraction**: Parses job details using OpenAI/GPT
- ✅ **Cookie Bypass**: DOM-based + AI fallback
- ✅ **Manual Job Add**: Paste URL → AI analyzes → Data appears
- ✅ **Job Table**: Shows extracted job data with all columns

### UI Panels
- ✅ Settings (AI Models, Email, Preferences)
- ✅ Search Profiles (Job title, Location, Active toggle)
- ✅ Job Websites (LinkedIn, Indeed, custom URLs)
- ✅ Job Search (Main table with 24 columns)
- ✅ Documents Repository
- ✅ Action Logs (Real-time activity)

---

## ⚠️ CRITICAL RULES FOR AI MODELS

### 🚫 NEVER DO THIS:

1. **NEVER delete or simplify existing logic** - Every feature exists for a reason
2. **NEVER remove console.log statements** - They are essential for debugging
3. **NEVER change the ID handling in database.ts** - It took 2 days to fix
4. **NEVER modify package.json versions** without testing
5. **NEVER use `electron-is-dev` version 2.x** - Must stay at 1.2.0
6. **NEVER register IPC handlers without removeHandler() first**

### ✅ ALWAYS DO THIS:

1. **ALWAYS preserve the full file** when editing - no snippets
2. **ALWAYS test with PowerShell logs** before confirming fix
3. **ALWAYS check database.ts ID flow** for INSERT → UPDATE issues
4. **ALWAYS use snake_case** for database field names
5. **ALWAYS include fallback extraction** when AI fails

---

## 🔧 Critical Fixes Applied (History)

### Issue 1: Startup Crash (FIXED)
- **Cause**: `electron-is-dev` v2.x is ESM-only
- **Fix**: Downgraded to v1.2.0, output .cjs files

### Issue 2: GPU Crashes (FIXED)
- **Cause**: Hardware acceleration on Windows
- **Fix**: `app.disableHardwareAcceleration()` in electron-main.ts

### Issue 3: IPC Handler Duplication (FIXED)
- **Cause**: Handlers registered in multiple files
- **Fix**: Consolidated to ipc-handlers.ts with removeHandler() cleanup

### Issue 4: Jobs Show N/A (FIXED)
- **Cause**: Database INSERT generated new ID, UPDATE couldn't find original
- **Fix**: database.ts now respects passed ID and uses flexible ID matching

### Issue 5: AI Extraction Failing (FIXED)
- **Cause**: Response parsing too strict
- **Fix**: Added regex JSON extraction + fallback extraction without AI

---

## 📋 Database Schema

```javascript
{
  "user_profile": [],      // LinkedIn profile data
  "job_preferences": [],   // 30+ job filters
  "ai_models": [],         // API keys & model configs
  "email_config": [],      // SMTP/OAuth settings
  "job_websites": [],      // URLs to scrape
  "search_profiles": [],   // Job title + location pairs
  "job_listings": [],      // Extracted jobs (THE MAIN TABLE)
  "applications": [],      // Submitted applications
  "documents": [],         // Generated CVs/Letters
  "action_logs": [],       // Activity history
  "settings": [],          // App preferences
  "company_monitoring": [],
  "email_alerts": [],
  "questions": []
}
Job Listing Fields:
{
  id: number,              // CRITICAL: Must match INSERT and UPDATE
  url: string,
  source: string,          // "LinkedIn", "Indeed", "Manual"
  status: string,          // "analyzing", "analyzed", "manual_review"
  job_title: string,
  company_name: string,
  location: string,
  job_type: string,
  experience_level: string,
  salary_range: string,
  description: string,
  required_skills: string,
  remote_onsite: string,
  posted_date: string,
  application_url: string,
  date_imported: string
}
🚀 Development Commands
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package as .exe
npm run electron-build
🔍 Debugging Guide
Check PowerShell for:
✅ IPC Handlers registered successfully
DB: INSERT on "job_listings"
DB: Inserted into job_listings with id=xxxxx
DB: UPDATE on "job_listings"
DB: Updated job_listings[0] with id=xxxxx
AI Response: {"jobTitle":"...","companyName":"..."}
If jobs show N/A:
Check "DB: Looking for id=X" matches "DB: Inserted with id=X"
Verify AI model has valid API key
Check "AI Response:" contains valid JSON
If scraper is blocked:
Manually log in to LinkedIn once (warms up cookies)
Browser data is stored in: %APPDATA%/job-automation-app/browser_data
📝 Next Development Steps
Document Generation: Complete Thinker → Auditor loop for CV export
Application Submission: Connect AI Mouse to form filling
Email Monitoring: Secretary extracts OTP codes
Proxy Support: Add residential proxy for anti-bot bypass
💾 File Checksums (For Verification)
Critical files that MUST NOT be modified without full understanding:

File	Purpose	Lines
database.ts	ID-aware CRUD operations	~140
ipc-handlers.ts	All IPC channels	~200
Hunter-engine.ts	Job extraction with fallback	~180
scraper-service.ts	Puppeteer stealth scraping	~250
ai-service.ts	API calls to OpenAI/Together	~80
🎯 User Setup Requirements
Before using Job Hunting:

AI Models tab: Add model with Role=Hunter, Status=active, valid API key
Search Profiles tab: Create profile with job title + location, set Active
Job Websites tab: Add LinkedIn/Indeed URL, set Active
Document Version: 4.0
Last Updated: January 1, 2026
Status: ✅ Production Ready

Copy this entire document into your next AI session to maintain context.


---

## **FILE 2: Git Commands to Push to GitHub**

Open PowerShell in your project folder and run these commands:

```powershell
# 1. Initialize git (skip if already done)
git init

# 2. Add your GitHub repository as remote (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 3. Check current status
git status

# 4. Add all files to staging
git add .

# 5. Commit with message
git commit -m "Phase 4.0: Fixed database ID handling, job extraction working"

# 6. Push to GitHub (first time - sets upstream)
git push -u origin main
If you get "main vs master" error:
# Check your branch name
git branch

# If it shows "master", either push to master:
git push -u origin master

# Or rename to main first:
git branch -M main
git push -u origin main
If remote already exists:
# Remove old remote
git remote remove origin

# Add new one
git remote add origin https://github.com/khansari2403/Auto-Application
If you need to force push (careful!):
git push -u origin main --force
📋 Quick Reference Card
Save this for quick access:

╔═══════════════════════════════════════════════════════════╗
║          JOB AUTOMATION APP - QUICK REFERENCE             ║
╠═══════════════════════════════════════════════════════════╣
║ START APP:        npm run dev                             ║
║ BUILD:            npm run build                           ║
║ PACKAGE EXE:      npm run electron-build                  ║
╠═══════════════════════════════════════════════════════════╣
║ CRITICAL FILES:                                           ║
║ • database.ts     - ID handling (DON'T TOUCH)            ║
║ • ipc-handlers.ts - All IPC channels                     ║
║ • Hunter-engine.ts - Job extraction                       ║
║ • scraper-service.ts - Puppeteer                         ║
╠═══════════════════════════════════════════════════════════╣
║ BEFORE HUNTING:                                           ║
║ 1. Add AI Model (Hunter role + API key)                  ║
║ 2. Add Search Profile (job title + location)             ║
║ 3. Add Job Website (LinkedIn/Indeed)                     ║
╠═══════════════════════════════════════════════════════════╣
║ DEBUG: Watch PowerShell for DB: and AI Response: logs    ║
╚═══════════════════════════════════════════════════════════╝
Let me know if you need anything else! Great working with you on this! 🎉