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

### Theming (8 Total)
- [x] Minimalism (Light/Dark)
- [x] Material Design (Light/Dark)
- [x] Glassmorphism (Light/Dark)
- [x] Neumorphism (Light/Dark)

### Internationalization (i18n)
- [x] Multi-language support for 10 most common languages

### Bug Reporting
- [x] "Report a bug for this page" popup

### UI/UX Issues Fixed (Session: Dec 2025)
- [x] Glassmorphism dropdown z-index issue - dropdowns now appear above panels
- [x] Theme consistency - themes now apply to all elements, not just the ribbon
- [x] Neumorphism input field consistency - all inputs now use same background
- [x] LinkedIn settings cleanup - removed "2. Capture & Import Profile" and "Manual Entry / Edit Profile" buttons, removed "1." from "Open LinkedIn"
- [x] Job Websites page - button sizing and spacing fixed
- [x] Job Search page - box sizing harmonized, removed "(24 Criteria)" text
- [x] Document generation buttons - fixed to properly trigger doc generation instead of opening job posting

## Technical Architecture

```
/app/
├── electron-main.ts        # Electron main process entry point
├── package.json
└── src/
    ├── main/               # Backend (Electron Main Process)
    │   ├── database.ts     # LowDB database management
    │   ├── ipc-handlers.ts # API layer (handles calls from frontend)
    │   ├── ai-service.ts   # Core business logic
    │   └── features/
    │       └── scheduler.ts # Background task scheduler
    │
    └── index.html
    └── main.tsx            # Frontend (Electron Renderer Process) entry point
    ├── App.tsx             # Main React component
    ├── components/         # React components
    ├── contexts/           # React contexts (Theme, Language)
    ├── i18n/               # Translation files
    └── styles/             # CSS stylesheets
```

## What's Been Implemented

### Dec 2025 - UI/UX Design Fixes
1. **Glassmorphism Z-Index Fix**
   - Added proper z-index layering for dropdowns and modals
   - Dropdowns now appear above glassmorphism panels

2. **Theme Consistency**
   - All inline-styled elements now use CSS variables
   - Tables, cards, inputs, buttons all respect theme
   - Added comprehensive theme support in app.css

3. **Neumorphism Input Consistency**
   - Fixed input fields to consistently use `var(--input-bg)`
   - All form elements now have uniform appearance

4. **LinkedIn Section Cleanup**
   - Removed unnecessary buttons as requested
   - Simplified to single "Open LinkedIn" button

5. **Job Websites Page**
   - Fixed button sizing (min-width, consistent height)
   - Added proper spacing between buttons
   - Improved overall layout

6. **Job Search Page**
   - Harmonized box sizing using flexbox with min-height
   - Removed "(24 Criteria)" text
   - Applied theme variables throughout

7. **Document Generation Buttons**
   - Fixed click handler to use stopPropagation
   - Now properly generates documents instead of opening job posting
   - Added visual feedback on hover

### Previous Session - Core Features
1. Theme system with ThemeContext and 8 themes
2. Language system with 10 languages
3. Bug report modal
4. UI scaffolding for profiles and settings

## Prioritized Backlog

### P0 - Critical
- [ ] Backend logic for new UI components
- [ ] Multi-select field saving (Job Titles, Experience, Certifications)

### P1 - High Priority
- [ ] Industry & Excluded Industries backend implementation
- [ ] LinkedIn Profile Scraper (requires Playwright)

### P2 - Medium Priority
- [ ] New "Posted Date" options (4h, 8h, 12h)
- [ ] CV Generation from profile
- [ ] Secretary email access authentication

### P3 - Low Priority
- [ ] Local job database export
- [ ] Microinteractions and animations

## Files Modified This Session
- `/app/src/styles/app.css` - Added dropdown z-index fixes, theme consistency styles, neumorphism input fixes
- `/app/src/styles/settings.css` - Added settings-specific theme styles
- `/app/src/components/settings/LinkedInSection.tsx` - Removed buttons, added theme variables
- `/app/src/components/settings/JobWebsitesSection.tsx` - Fixed button sizing and spacing
- `/app/src/components/JobSearch.tsx` - Fixed box sizing, removed criteria text, theme variables
- `/app/src/components/SearchProfiles.tsx` - Added theme variables, fixed dropdown z-index

## Notes for Next Agent
- This is an **Electron App** - use `yarn dev` for full testing, not just Vite preview
- Theme system uses CSS variables defined in `/app/src/styles/themes.css`
- All new components should use CSS variables, not hardcoded colors
