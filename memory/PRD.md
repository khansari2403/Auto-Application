# Job Application Automation Tool - PRD

## Original Problem Statement
Build an Electron-based desktop application for automated job application management with the following features:
- Multi-theme support (8 themes)
- Multi-language support (10 languages)
- Bug report modal
- LinkedIn profile import
- Manual profile creation
- Job search automation
- Auto-apply functionality
- Document generation (CV, motivation letters, etc.)

## User Personas
1. **Job Seeker** - Primary user who wants to automate job applications
2. **Secretary** - Secondary user who monitors emails on behalf of job seeker

## Core Requirements

### Theming (8 Total) ✅
- [x] Minimalism (Light/Dark)
- [x] Material Design (Light/Dark)
- [x] Glassmorphism (Light/Dark)
- [x] Neumorphism (Light/Dark)

### Internationalization (i18n) ✅
- [x] Multi-language support for 10 most common languages

### Bug Reporting ✅
- [x] "Report a bug for this page" popup

### UI/UX Issues Fixed (Session: Dec 2025) ✅
- [x] Glassmorphism dropdown z-index issue - dropdowns now appear above panels
- [x] Theme consistency - themes now apply to all elements, not just the ribbon
- [x] Neumorphism input field consistency - all inputs now use same background
- [x] LinkedIn settings cleanup - removed extra buttons, cleaned up "Open LinkedIn"
- [x] Job Websites page - button sizing and spacing fixed
- [x] Job Search page - box sizing harmonized, removed "(24 Criteria)" text
- [x] Document generation buttons - fixed to properly trigger doc generation

### Backend Implementation (Session: Dec 2025) ✅
- [x] **P0: Profile Management Backend**
  - `user:update-profile` - Save/update user profile data
  - `user:open-linkedin` - Open LinkedIn URL in external browser
  - `user:capture-linkedin` - Capture LinkedIn data (stub for Playwright)
  - `profiles:delete` - Delete search profiles
  
- [x] **P0: Multi-Select Fields Backend**
  - Search profiles now store comma-separated values for:
    - `job_titles` - Multiple job title selection
    - `industry` - Multiple industry selection
    - `excluded_industries` - Industry blacklist
    - `experience_levels` - Multiple experience levels
    - `certifications` - Multiple certifications

- [x] **P1: Scheduler Control**
  - `scheduler:toggle` - Enable/disable job hunting scheduler
  - `scheduler:get-status` - Check scheduler status
  - Scheduler is OFF by default (prevents auto-scraping)

## Technical Architecture

```
/app/
├── electron-main.ts        # Electron main process entry point
├── package.json
└── src/
    ├── main/               # Backend (Electron Main Process)
    │   ├── database.ts     # LowDB JSON database management
    │   ├── ipc-handlers.ts # API layer (handles IPC calls from frontend)
    │   ├── ai-service.ts   # AI orchestration
    │   └── features/
    │       ├── scheduler.ts      # Background task scheduler (disabled by default)
    │       ├── Hunter-engine.ts  # Job search engine
    │       ├── doc-generator.ts  # CV/Cover letter generation
    │       └── ...
    │
    └── src/
        ├── App.tsx             # Main React component
        ├── components/         # React components
        │   ├── JobSearch.tsx
        │   ├── SearchProfiles.tsx
        │   └── settings/
        │       ├── LinkedInSection.tsx
        │       ├── JobWebsitesSection.tsx
        │       └── ...
        ├── contexts/           # React contexts (Theme, Language)
        ├── i18n/               # Translation files
        └── styles/             # CSS stylesheets (themes.css, app.css)
```

## Database Schema (db.json)
- `user_profile`: User's profile data (name, title, experiences, skills, etc.)
- `search_profiles`: Job search criteria with multi-select fields
- `job_websites`: Configured job boards and career pages
- `job_listings`: Found jobs
- `applications`: Application history
- `settings`: Global settings including `job_hunting_active` flag
- `ai_models`: Configured AI models for different roles
- `action_logs`: Activity log
- `documents`: Generated documents

## IPC Channels (Backend API)

### Profile Management
- `user:get-profile` - Get user profile
- `user:update-profile` - Save user profile
- `user:open-linkedin` - Open LinkedIn in browser
- `user:capture-linkedin` - Capture LinkedIn data

### Search Profiles
- `profiles:get-all` - Get all search profiles
- `profiles:save` - Create new profile
- `profiles:update` - Update profile (including multi-select fields)
- `profiles:delete` - Delete profile

### Job Websites
- `websites:get-all` - Get all websites
- `websites:add` - Add new website
- `websites:delete` - Delete website
- `websites:toggle-active` - Activate/deactivate website

### Jobs
- `jobs:get-all` - Get all jobs
- `jobs:add-manual` - Add job manually by URL
- `jobs:delete` - Delete job
- `jobs:update-doc-confirmation` - Mark documents as reviewed

### Scheduler
- `scheduler:toggle` - Enable/disable scheduler
- `scheduler:get-status` - Get scheduler status

### AI/Documents
- `ai:generate-tailored-docs` - Generate CV, cover letters
- `ai:process-application` - Process full application
- `docs:open-file` - Open generated document

## Completed Work Summary

### Session 1: Theming & i18n
- 8 themes implemented with CSS variables
- 10 languages with translation files
- Bug report modal

### Session 2: UI/UX Fixes & Backend
- Fixed all visual issues (z-index, theme consistency, button sizing)
- Implemented backend handlers for profile management
- Added scheduler control (disabled by default)
- Updated all components to use theme CSS variables

## Remaining Work

### P2 - Medium Priority
- [ ] **LinkedIn Profile Scraper** - Requires Playwright integration for browser automation
- [ ] **CV Generation** - Generate PDF/DOCX from profile data

### P3 - Low Priority
- [ ] Secretary authentication flow
- [ ] Local job database export (CSV/SQLite)
- [ ] Microinteractions and animations

## Files Modified This Session
- `/app/src/styles/app.css` - Dropdown z-index, theme consistency, neumorphism fixes
- `/app/src/styles/settings.css` - Settings-specific theme styles
- `/app/src/components/settings/LinkedInSection.tsx` - Full theme update, profile editor
- `/app/src/components/settings/JobWebsitesSection.tsx` - Button sizing
- `/app/src/components/JobSearch.tsx` - Box sizing, theme variables, doc buttons fix
- `/app/src/components/SearchProfiles.tsx` - Theme variables, dropdown z-index
- `/app/src/main/ipc-handlers.ts` - Added profile, LinkedIn, scheduler handlers
- `/app/src/main/features/scheduler.ts` - Added toggle functionality

## Notes for Next Agent
- This is an **Electron App** - use `yarn dev` for full testing
- Theme system uses CSS variables defined in `/app/src/styles/themes.css`
- Scheduler is OFF by default to prevent auto-scraping
- LinkedIn scraper is a stub - needs Playwright for real implementation
- All multi-select fields are stored as comma-separated strings
