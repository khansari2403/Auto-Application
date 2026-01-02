# Job Application Automation Tool - Project Handover

**Version:** 2.0  
**Last Updated:** December 2025  
**Status:** Feature Complete (Testing Required)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Features Summary](#features-summary)
5. [File Structure](#file-structure)
6. [Setup & Installation](#setup--installation)
7. [Key Components](#key-components)
8. [Database Schema](#database-schema)
9. [IPC Communication](#ipc-communication)
10. [AI Integration](#ai-integration)
11. [Document Generation](#document-generation)
12. [Known Issues & Limitations](#known-issues--limitations)
13. [Testing Checklist](#testing-checklist)
14. [Future Enhancements](#future-enhancements)

---

## Project Overview

A desktop application built with Electron that automates the job application process. The app helps users:
- Import their profile from LinkedIn or enter manually
- Search and collect job postings from various job boards
- Generate tailored CVs, cover letters, and motivation letters using AI
- Apply to jobs automatically with a "Smart Apply" feature
- Monitor email responses and send follow-ups via a virtual secretary

### Target User
Job seekers who want to streamline their application process, particularly those applying to multiple positions and needing customized documents for each application.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Electron (Desktop App) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js (Electron Main Process) |
| **Database** | LowDB (JSON file-based) |
| **Web Scraping** | Puppeteer |
| **Styling** | CSS Variables (Theme System) |
| **i18n** | Custom implementation (10 languages) |

### Key Dependencies
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "puppeteer": "^21.0.0",
  "lowdb": "^5.0.0",
  "axios": "^1.6.0"
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APPLICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │  RENDERER       │   IPC   │     MAIN PROCESS        │   │
│  │  (React App)    │◄───────►│   (Node.js Backend)     │   │
│  │                 │         │                         │   │
│  │  - Components   │         │  - IPC Handlers         │   │
│  │  - Contexts     │         │  - Database (LowDB)     │   │
│  │  - Styles       │         │  - AI Service           │   │
│  │  - i18n         │         │  - Scraper Service      │   │
│  └─────────────────┘         │  - Doc Generator        │   │
│                              │  - Smart Applicant      │   │
│                              │  - Email Monitor        │   │
│                              └─────────────────────────┘   │
│                                         │                   │
│                                         ▼                   │
│                              ┌─────────────────────────┐   │
│                              │    EXTERNAL SERVICES    │   │
│                              │  - AI APIs (OpenAI,etc) │   │
│                              │  - Job Websites         │   │
│                              │  - Email Providers      │   │
│                              └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Features Summary

### Completed Features ✅

| Feature | Description | Location |
|---------|-------------|----------|
| **Theming** | 8 themes (4 styles × Light/Dark) | `ThemeContext.tsx` |
| **i18n** | 10 languages supported | `i18n/translations.ts` |
| **LinkedIn Import** | Profile scraping via Puppeteer | `linkedin-scraper.ts` |
| **Manual Profile** | Full profile editor | `LinkedInSection.tsx` |
| **Job Websites** | Manage job sources with activate/deactivate | `JobWebsitesSection.tsx` |
| **Job Search** | Manual URL entry + Hunter search | `JobSearch.tsx` |
| **Document Generation** | CV, Cover Letter, Motivation Letter, Portfolio, Proposal | `doc-generator.ts` |
| **PDF Export** | Convert HTML docs to PDF | `pdf-export.ts` |
| **Smart Apply** | AI-powered form filling | `smart-applicant.ts` |
| **Q&A System** | Handle unknown form fields | `AlertsQASection.tsx` |
| **Secretary Panel** | Email monitoring & follow-ups | `SecretaryControlPanel.tsx` |
| **Bug Reports** | In-app bug reporting modal | `BugReportModal.tsx` |

### Pending Testing 🔄

- End-to-end Smart Apply flow
- Document generation quality (no hallucinations)
- CV generation specifically
- Email monitoring functionality

---

## File Structure

```
/app/
├── electron-main.ts          # Electron main entry point
├── preload.ts                # Preload script for IPC
├── package.json              # Dependencies & scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
│
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main app component with tabs
│   ├── App.css               # Global styles
│   │
│   ├── components/
│   │   ├── JobSearch.tsx             # Job search & document management
│   │   ├── DocumentRepository.tsx    # Uploaded documents viewer
│   │   ├── SettingsPanel.tsx         # Settings container
│   │   ├── ApplicationsPanel.tsx     # Application tracking
│   │   ├── ApplicationInbox.tsx      # Email inbox view
│   │   ├── ActionLog.tsx             # Activity log viewer
│   │   ├── SearchProfiles.tsx        # Search profile management
│   │   ├── EmailAlertsPanel.tsx      # Email alerts view
│   │   ├── AlertsQASection.tsx       # Q&A modal for Smart Apply
│   │   │
│   │   ├── settings/
│   │   │   ├── LinkedInSection.tsx       # Profile import & editor
│   │   │   ├── JobWebsitesSection.tsx    # Job sources management
│   │   │   ├── AIModelsSection.tsx       # AI model configuration
│   │   │   ├── StorageSettings.tsx       # File storage settings
│   │   │   ├── EmailMonitoringSection.tsx # Email connection
│   │   │   └── SecretaryControlPanel.tsx  # Secretary settings
│   │   │
│   │   └── common/
│   │       ├── ThemeSelector.tsx     # Theme picker dropdown
│   │       ├── LanguageSelector.tsx  # Language picker dropdown
│   │       └── BugReportModal.tsx    # Bug report form
│   │
│   ├── contexts/
│   │   ├── ThemeContext.tsx          # Theme state & CSS variables
│   │   └── LanguageContext.tsx       # i18n state & translations
│   │
│   ├── i18n/
│   │   └── translations.ts           # All language strings
│   │
│   ├── styles/
│   │   ├── app.css                   # Main app styles
│   │   ├── themes.css                # Theme definitions
│   │   └── settings.css              # Settings page styles
│   │
│   └── main/
│       ├── database.ts               # LowDB setup & queries
│       ├── ipc-handlers.ts           # All IPC handlers
│       ├── ai-service.ts             # AI API calls
│       ├── ai-core.ts                # AI utilities
│       ├── scraper-service.ts        # Puppeteer web scraping
│       ├── email-service.ts          # Email sending
│       ├── email-monitor.ts          # Email monitoring
│       │
│       └── features/
│           ├── doc-generator.ts      # Document generation logic
│           ├── pdf-export.ts         # HTML to PDF conversion
│           ├── linkedin-scraper.ts   # LinkedIn profile scraper
│           ├── smart-applicant.ts    # Auto-apply engine
│           ├── scheduler.ts          # Job hunting scheduler
│           ├── secretary-service.ts  # Secretary automation
│           └── Hunter-engine.ts      # Job search engine
│
└── memory/
    └── PRD.md                        # Product requirements
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Yarn package manager
- Windows/macOS/Linux

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd app

# 2. Install dependencies
yarn install

# 3. Run in development mode
yarn dev

# 4. Build for production
yarn build
```

### Environment Variables
The app stores configuration in LowDB (JSON file), not environment variables. Settings are managed through the UI.

---

## Key Components

### 1. App.tsx - Main Navigation
```typescript
// Tab-based navigation
type TabType = 'settings' | 'documents' | 'websites' | 'profiles' | 
               'search' | 'applications' | 'inbox' | 'alerts' | 'logs';
```

### 2. JobSearch.tsx - Document Generation
- Displays found jobs in a table
- Document icons (CV, ML, CL, PT, PR) for each job
- Click icon to generate that specific document
- "Smart Apply" button for automated application

### 3. ThemeContext.tsx - Theme System
```typescript
// Available themes
const THEMES = {
  minimalism: { light: {...}, dark: {...} },
  material: { light: {...}, dark: {...} },
  glassmorphism: { light: {...}, dark: {...} },
  neumorphism: { light: {...}, dark: {...} }
};
```

### 4. SecretaryControlPanel.tsx - Email Automation
- Master enable/disable toggle
- Follow-up timing (24h to 7 days)
- Auto-reply configuration
- Personal email notifications

---

## Database Schema

The database uses LowDB with the following tables:

```typescript
interface Database {
  settings: [{
    id: number;
    job_hunting_active: number;
    auto_apply: number;
    google_client_id?: string;
    google_client_secret?: string;
    email_provider?: string;
    email_connected?: boolean;
    secretary_settings?: string; // JSON
    save_directory?: string;
  }];

  user_profile: [{
    id: number;
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    photo?: string;
    summary?: string;
    experiences: string;    // JSON array
    educations: string;     // JSON array
    skills: string;         // JSON array
    licenses: string;       // JSON array
    languages: string;      // JSON array
    linkedin_url?: string;
  }];

  job_listings: [{
    id: number;
    url: string;
    job_title: string;
    company_name: string;
    location?: string;
    job_type?: string;
    description?: string;
    status: string;
    cv_status?: string;
    cv_path?: string;
    motivation_letter_status?: string;
    motivation_letter_path?: string;
    cover_letter_status?: string;
    cover_letter_path?: string;
    // ... more fields
  }];

  job_websites: [{
    id: number;
    user_id: number;
    website_name: string;
    website_url: string;
    site_type: string;
    is_active: number;
    email?: string;
    password?: string;
  }];

  ai_models: [{
    id: number;
    name: string;
    provider: string;
    api_key: string;
    role: string;  // 'Thinker', 'Auditor', 'Hunter', 'Observer', 'Librarian'
    status: string;
  }];

  documents: [{
    id: number;
    job_id: number;
    user_id: number;
    document_type: string;
    content: string;
    file_path: string;
    status: string;
  }];

  action_logs: [{
    id: number;
    user_id: number;
    agent_name: string;
    action: string;
    status: string;
    timestamp: string;
  }];
}
```

---

## IPC Communication

All communication between React (renderer) and Node.js (main) uses Electron IPC:

### Key Channels

| Channel | Description |
|---------|-------------|
| `settings:get` | Get app settings |
| `settings:update` | Update settings |
| `user:get-profile` | Get user profile |
| `user:update-profile` | Save user profile |
| `jobs:get-all` | Get all job listings |
| `jobs:add-manual` | Add job by URL |
| `ai:generate-tailored-docs` | Generate documents for job |
| `ai:smart-apply` | Start Smart Apply process |
| `websites:get-all` | Get configured job websites |
| `websites:toggle-active` | Activate/deactivate website |
| `docs:open-file` | Open generated document |
| `docs:convert-all-pdf` | Convert job docs to PDF |

### Example Usage
```typescript
// From React component
const result = await (window as any).electron.invoke('jobs:get-all', userId);
if (result.success) {
  setJobs(result.data);
}
```

---

## AI Integration

### AI Roles
1. **Thinker** - Generates documents (CV, Cover Letter, etc.)
2. **Auditor** - Reviews documents for quality and hallucinations
3. **Hunter** - Searches for job listings
4. **Observer** - Analyzes web pages for form filling
5. **Librarian** - Processes uploaded documents

### Document Generation Flow
```
1. User clicks document icon
2. Thinker generates content using profile + job data
3. cleanAIOutput() removes JSON artifacts
4. Auditor checks for quality + hallucinations
5. If rejected, Thinker revises (max 2 attempts)
6. If approved, save as HTML file
7. Optionally convert to PDF
```

### Anti-Hallucination Measures
- Explicit prompts: "DO NOT fabricate information"
- Auditor specifically checks for invented data
- Profile data passed directly to prompts
- Company research used when available

---

## Document Generation

### Supported Document Types
| Type | Key | Description |
|------|-----|-------------|
| CV | `cv` | Tailored resume |
| Motivation Letter | `motivation_letter` | Formal one-page letter |
| Cover Letter | `cover_letter` | Concise 250-300 word letter |
| Portfolio | `portfolio` | Project summary |
| Proposal | `proposal` | Business proposal |

### Output Format
- Documents saved as HTML files
- Located in: `{userData}/generated_docs/`
- Filename format: `{type}_job{id}_{timestamp}.html`
- Can be converted to PDF via Puppeteer

### Key Rules
- No "Generated for..." footer
- Must end with "Kind regards, [Name]"
- No JSON artifacts in output
- No AI clichés (thrilled, passionate, etc.)
- Match language of job description

---

## Known Issues & Limitations

### Current Limitations
1. **Email Integration** - SMTP not fully implemented; notifications are placeholder
2. **LinkedIn Scraping** - Requires manual login; may be blocked by LinkedIn
3. **Smart Apply** - Works on simple forms; complex multi-step forms may fail
4. **Proxy Support** - Basic implementation; may need enhancement for some sites

### Recently Fixed Bugs
- ✅ IPC handler duplication crash
- ✅ Documents tab white screen
- ✅ CV icon generating wrong document
- ✅ Cover letter missing sign-off
- ✅ "Generated for..." footer removed
- ✅ Job Websites page layout

---

## Testing Checklist

### Before Release
- [ ] Profile creation and saving
- [ ] LinkedIn profile import (with manual login)
- [ ] Job URL manual entry
- [ ] Document generation (CV, Cover Letter, Motivation Letter)
- [ ] Document quality check (no hallucinations)
- [ ] PDF conversion
- [ ] Smart Apply on test job
- [ ] Theme switching (all 8 themes)
- [ ] Language switching (all 10 languages)
- [ ] Job website activate/deactivate
- [ ] Secretary settings save/load

### Test Job for Smart Apply
```
Company: Wolt
Position: Technical Account Management - Team Lead
URL: https://careers.wolt.com/en/jobs/1/7391490
```

---

## Future Enhancements

### P1 - High Priority
- [ ] Full email integration (SMTP/IMAP)
- [ ] Storage organization (Company/Position/Files structure)
- [ ] Secretary authentication flow

### P2 - Medium Priority
- [ ] CV template customization
- [ ] Application analytics dashboard
- [ ] Batch document generation
- [ ] Interview scheduler integration

### P3 - Low Priority
- [ ] Mobile companion app
- [ ] Browser extension
- [ ] Team/enterprise features
- [ ] AI model fine-tuning

---

## Contact & Support

For questions about this project, refer to:
- `/app/memory/PRD.md` - Product requirements
- `/app/README.md` - Basic readme
- Code comments in key files

---

*This handover document was generated in December 2025. Update as the project evolves.*
