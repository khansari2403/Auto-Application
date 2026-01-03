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
- [x] CV icon clicking generates wrong document - FIXED
- [x] "Generated for..." footer removed from documents
- [x] Cover letter missing "Kind regards" sign-off - FIXED
- [x] Auditor now checks for hallucinations/fabricated info
- [x] Theme dropdown closing unexpectedly - FIXED
- [x] Glassmorphism dropdown transparency - FIXED
- [x] Arabic language removed
- [x] Tutorial/Why Free buttons moved to right side
- [x] New "Interview Insider" tab with HR AI
- [x] Girlish themes added (Rose Petal, Lavender Dream)
- [x] Headshot upload in Manual Profile
- [x] **Job Hunting Timer** - Schedule start/end time for auto hunting
- [x] **Auto-Apply Criteria** - Set minimum compatibility (Yellow/Green/Gold)
- [x] **Compatibility Score Dial** - Vertical gauge on Job Search (Red→Yellow→Green→Gold)
- [x] **Document Rejection Explanation** - Shows why auditor rejected and tips
- [x] **Interview Social Decorum** - Online/In-person etiquette, body language, dress code tips
- [x] **Removed Glassmorphism & Neumorphism themes** - Too buggy, removed from theme options
- [x] **Job dropdown closes on mouse leave** - Fixed dropdown behavior in SearchProfiles
- [x] **Expanded job titles database** - Added 150+ new job titles across all industries
- [x] **Merged Start Job Hunting buttons** - Removed duplicate, kept one in Control Center
- [x] **Auto-Apply toggle in top bar** - Moved to header next to Start Job Hunting button
- [x] **Fixed document icons display** - Only shows icons with dashed borders when not generated
- [x] **HR AI role added** - New AI role option in Settings > AI Models
- [x] **Auto job hunting disabled by default** - Must be explicitly enabled by user
- [x] **HR AI hallucination fix** - Uses actual job data, strict instructions to prevent fabrication
- [x] **Generate More button** - Added to Interview Insider to generate additional questions
- [x] **Compatibility score shows N/A** - When score not calculated instead of random values

### P1 - High Priority (Testing Needed)
- [ ] End-to-end test of Smart Apply flow
- [ ] CV generation verification
- [ ] Document quality verification (no hallucinations)
- [ ] Interview Insider feature testing
- [ ] HR AI question relevance testing (no more project management Q's for warehouse jobs)

### P2 - Medium Priority - ✅ ALL COMPLETED
- [x] Secretary Authentication Flow - PIN-based access with sessions
- [x] Storage directory structure (Company/Position/Files) - Documents now organized
- [x] Compatibility score calculation implementation - Full scoring algorithm

### P3 - Low Priority - ✅ ALL COMPLETED
- [x] Full email integration (SMTP/IMAP) - SMTP sending with nodemailer
- [x] Actual email sending for notifications - Follow-ups, confirmations, alerts
- [x] Email verification flow completion - Test email configuration

## Changes Made - December 2025

### Session 5 - Bug Fixes & UI Improvements (Latest)
1. **Removed Glassmorphism & Neumorphism themes** - Removed due to numerous visual bugs
2. **Job Title Dropdown Fix** - Now closes automatically on mouse leave instead of requiring click
3. **Expanded Job Titles Database** - Added 150+ job titles across all industries:
   - Warehouse & Logistics (Warehouse Worker, Forklift Operator, etc.)
   - Construction & Trades (Electrician, Plumber, etc.)
   - Retail & Hospitality (Server, Chef, Hotel Manager, etc.)
   - Healthcare (Nurse, Physician, etc.)
   - Education (Teacher, Professor, etc.)
   - And many more...
4. **Merged Start Job Hunting Buttons** - Removed duplicate button from main view, kept single button in Control Center header with Auto-Apply toggle next to it
5. **Auto-Apply Toggle in Header** - Visual toggle button with ON/OFF state next to Start Job Hunting
6. **Document Icons Display Fix** - Icons now show:
   - Dashed border + 60% opacity when document not yet generated
   - Solid border + checkmarks when generated
   - Warning icon when rejected
7. **HR AI Role Added** - New "🎯 HR AI (Interview & Compatibility)" option in AI Models settings
8. **Auto Job Hunting Disabled by Default** - Scheduler no longer starts automatically on app launch
9. **HR AI Hallucination Prevention** - Updated prompt with strict rules:
   - Only uses actual job data from database
   - Only references skills from user profile
   - Generates generic questions if job info is missing
   - Falls back to safe generic questions on parse failure
10. **Generate More Button** - Added to Interview Insider to append additional questions
11. **Compatibility Score N/A State** - Shows dashed "N/A" instead of random values when not calculated
12. **Ask Your Question Feature** - Custom question input in Interview Insider for personalized answers
13. **New Themes** - Added Forest Green and Ocean Blue themes (light/dark modes)
14. **Secretary Authentication** - PIN-based access (4-8 digits) with secure sessions
15. **Storage Directory Structure** - Documents now saved in organized folders: `Company/Position/Files`
16. **Compatibility Score Algorithm** - Full scoring system:
    - Skills matching (40% weight)
    - Experience level (30% weight)
    - Education matching (20% weight)
    - Location compatibility (10% weight)
17. **Email Service** - Full SMTP integration:
    - Test email configuration
    - Send notifications (response, follow-up, verification)
    - Send follow-up emails
    - Send thank you confirmations

### Session 4 - Job Hunting Controls & Interview Decorum
1. **Job Hunting Control Center** - New component with:
   - Schedule Timer: Set start/end time (e.g., 9:00-14:00) for hunting
   - Auto-Apply Criteria: Choose minimum compatibility level (Yellow/Green/Gold)
   - Visual status indicator when hunting is active
2. **Compatibility Score Dial** - Vertical gauge showing match level:
   - Red (0-25%): Poor match
   - Yellow (26-50%): Fair match
   - Green (51-75%): Good match
   - Gold (76-100%): Perfect match
3. **Document Rejection Explanation** - When auditor rejects a document:
   - Shows warning icon (⚠) on document
   - Click to see rejection reason
   - Explains why (profile mismatch, missing data, etc.)
   - Tips on how to improve
4. **Interview Social Decorum Section** - Added to Interview Insider:
   - Online Interview Tips (tech, background, lighting)
   - In-Person Interview Tips (arrival, greeting, posture)
   - Body Language (eye contact, smile, open posture)
   - Dress Code Guide (research, colors, grooming)
   - Making a Great Impression (authenticity, enthusiasm)
   - Communication Tips (clarity, conciseness, pausing)

### Session 3 - New Features
1. **Theme Dropdown Fix** - Added useRef and useEffect for proper click-outside handling
2. **Glassmorphism Dropdown** - Added solid backgrounds (98% opacity) to prevent text mixing
3. **Arabic Removed** - Removed from available languages list
4. **Nav Restructure** - Split nav into nav-main and nav-secondary, moved Tutorial/Why Free to right
5. **Interview Insider Tab** - New tab with HR AI for interview preparation
   - Generates interview questions by category (Get to Know, Psychological, Aptitude, Culture, Position Specific)
   - Identifies important tools/technologies for the position
   - Provides suggested answers tailored to user's profile
6. **Girlish Themes** - Added Rose Petal and Lavender Dream themes (light/dark variants)
7. **Headshot Upload** - Manual profile now has file upload for profile photo with preview

### Bug Fixes (Session 2)
1. **CV Icon Bug** - Fixed: Clicking CV icon was generating Cover Letter instead. Added `handleGenerateSingleDoc()` function to generate only the specific document type clicked
2. **"Generated for..." Footer** - Removed automated footer text from Motivation Letter and Cover Letter HTML templates
3. **Cover Letter Sign-off** - Added requirement for "Kind regards," + applicant name at the end
4. **Motivation Letter Sign-off** - Same as above
5. **Hallucination Detection** - Updated Auditor prompt to specifically check for fabricated/invented information
6. **Anti-Hallucination Rules** - Added explicit rules to Thinker prompts to only use data from the provided profile

### Bug Fixes (Session 1)
1. **Documents Tab Crash** - Fixed DocumentRepository.tsx to handle errors gracefully, added loading states
2. **IPC Handler for docs:delete** - Added missing handler
3. **LinkedIn Profile Section** - Removed "1. Open LinkedIn" and "2. Capture Profile Data" buttons, kept only "Edit Profile"
4. **Job Websites Page** - Complete redesign with clean list layout, proper grid, activate/pause/edit/delete buttons
5. **Cover Letter JSON Fix** - Added cleanAIOutput() function to strip JSON formatting and meta-text
6. **Motivation Letter** - Improved prompts to require full page (400-500 words), better structure, no apologies

### Files Modified/Created
- `/app/src/App.tsx` - Added Interview Insider tab, restructured nav layout
- `/app/src/App.css` - Added nav-main and nav-secondary flex styles
- `/app/src/components/InterviewInsider.tsx` - NEW: HR AI interview prep component
- `/app/src/components/common/ThemeSelector.tsx` - Fixed dropdown with click-outside handler
- `/app/src/components/common/ThemeSelector.css` - Fixed glassmorphism transparency
- `/app/src/components/SettingsPanel.tsx` - Added headshot upload with preview
- `/app/src/contexts/ThemeContext.tsx` - Added rosePetal, lavenderDream theme types
- `/app/src/contexts/LanguageContext.tsx` - Removed Arabic
- `/app/src/i18n/translations.ts` - Added new theme names, Interview Insider translations
- `/app/src/styles/themes.css` - Added Rose Petal and Lavender Dream themes
- `/app/src/main/ipc-handlers.ts` - Added ai:generate-interview-prep handler

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
