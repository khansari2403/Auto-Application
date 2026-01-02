# Job Application Automation Tool - PRD

## Original Problem Statement
Build an Electron-based desktop application for automated job application management with comprehensive document generation and smart application capabilities.

## Test User Profile (from CV analysis)
**Name:** Kian Khansari
**Title:** Projektmanager (Project Manager)
**Email:** kian.khansari@gmx.de
**Phone:** +4917675130617
**Location:** Apianstraße 7, 85051 Ingolstadt, Deutschland

**Key Skills:**
- PMP, Lean Six Sigma Black Belt, Scrum Master II, Scrum PO I
- JIRA, Microsoft Office, Slack/Trello/Confluence/MS Teams
- Agile Project Management, Change Management, Process Optimization

**Experience:**
- WITTMANN/AUDI AG - Junior Agile Project Lead (2024)
- TEDI GmbH - Deputy Team Lead (2021-2023)
- Yarfile.com - Project Manager (2013-2018)

**Education:**
- M.Sc. Entrepreneurship & Corporate Venturing - TH Ingolstadt
- B.A. International Business - OTH Amberg-Weiden
- B.E. Mechanical Engineering - Azad University

**Languages:** German (Advanced), English (Advanced), Persian (Native)

## Test Job
**Company:** Wolt
**Position:** Technical Account Management - Team Lead
**URL:** https://careers.wolt.com/en/jobs/1/7391490
**Requirements:**
- Leading/mentoring technical customer-facing teams
- API/system integration experience
- Process design and documentation
- AI/automation knowledge

## Core Features

### 1. Theming (8 Total) ✅
### 2. Internationalization (i18n) ✅
### 3. Document Production System ✅
### 4. LinkedIn Profile Scraper ✅
### 5. PDF Export ✅
### 6. Smart Application System ✅
### 7. Q&A Database ✅
### 8. Secretary Control Panel ✅ (NEW)

## Secretary Control Panel Features

Located in Settings > Email & Secretary > Secretary Settings tab:

### Master Toggle
- Enable/disable secretary assistant

### Follow-up Timing
- Configurable delay: 24h, 48h, 72h, 96h, 168h (7 days)
- Custom hours input (1-720 hours)

### Auto-Responses
- "Thanks for Confirmation" email toggle
- Auto-reply to acknowledge receipt of company confirmation

### Personal Email Notifications
- Configure personal email for notifications
- Test notification button
- Notification triggers:
  - Company response
  - Follow-up sent
  - Verification needed

### Status Display
- Real-time status of secretary settings
- Last check time

## Files Created This Session
- `/app/src/components/settings/SecretaryControlPanel.tsx` - Full secretary settings UI

## Files Modified This Session
- `/app/src/components/settings/EmailMonitoringSection.tsx` - Added tabs, integrated SecretaryControlPanel

## Technical Notes

### Testing the Smart Application Flow
1. User must create profile in Settings > LinkedIn Profile
2. Add job URL manually or via Hunter search
3. Generate documents (CV, Cover Letter, etc.)
4. Click "🤖 Smart Apply" on job card
5. If questions arise, Q&A modal appears
6. Answer questions and continue
7. Secretary monitors for responses

### Wolt Application Form Fields (for testing)
From job page analysis:
- First Name, Last Name
- Email, Phone
- Location
- Resume upload (PDF)
- Cover letter upload (PDF)
- Age group (select)
- Gender (select)
- Work authorization question

### Secretary Settings Storage
Settings are stored in `settings.secretary_settings` as JSON:
```json
{
  "enabled": true,
  "followUpDelay": 48,
  "sendThanksConfirmation": true,
  "notifyUserEmail": "user@personal.com",
  "notifyOnResponse": true,
  "notifyOnFollowUp": true,
  "notifyOnVerification": true
}
```

## Remaining Work

### P0 - Critical (Fixed in this session - Dec 2025)
- [x] IPC Handler duplicate fix (user:capture-linkedin)
- [x] Documents tab crash fix
- [x] LinkedIn Profile section cleanup (removed extra buttons)
- [x] Job Websites page redesign as clean list
- [x] Cover letter JSON artifacts fix
- [x] Motivation letter improvements

### P1 - High Priority (Testing Needed)
- [ ] End-to-end test of Smart Apply flow
- [ ] CV generation verification
- [ ] Document quality verification (no JSON artifacts)

### P2 - Medium Priority
- [ ] Secretary Authentication Flow
- [ ] Storage directory structure (Company/Position/Files)

### P3 - Low Priority
- [ ] Full email integration (SMTP/IMAP)
- [ ] Actual email sending for notifications
- [ ] Email verification flow completion

## Changes Made - December 2025

### Bug Fixes
1. **Documents Tab Crash** - Fixed DocumentRepository.tsx to handle errors gracefully, added loading states
2. **IPC Handler for docs:delete** - Added missing handler
3. **LinkedIn Profile Section** - Removed "1. Open LinkedIn" and "2. Capture Profile Data" buttons, kept only "Edit Profile"
4. **Job Websites Page** - Complete redesign with clean list layout, proper grid, activate/pause/edit/delete buttons
5. **Cover Letter JSON Fix** - Added cleanAIOutput() function to strip JSON formatting and meta-text
6. **Motivation Letter** - Improved prompts to require full page (400-500 words), better structure, no apologies

### Files Modified
- `/app/src/components/DocumentRepository.tsx` - Fixed crashes, better error handling, theme support
- `/app/src/components/settings/LinkedInSection.tsx` - Simplified UI, removed extra buttons
- `/app/src/components/settings/JobWebsitesSection.tsx` - Complete redesign as clean list
- `/app/src/main/features/doc-generator.ts` - Added cleanAIOutput(), improved prompts
- `/app/src/main/ipc-handlers.ts` - Added docs:delete handler

## Run Instructions
```bash
cd /app
yarn dev  # Full Electron app with backend
```

## Notes for Next Agent
- **This is an Electron Desktop App** - Cannot be tested in web preview
- User must download and run locally with `yarn dev`
- All features implemented, testing requires desktop environment
- Secretary notification emails require SMTP configuration (not implemented)
