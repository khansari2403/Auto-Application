# 🔧 Technical Issues Report - Job Application Automation App (Phase 3.6)
**Date:** January 1, 2026  
**Purpose:** Comprehensive documentation of all issues, fixes attempted, and current status for testing in other applications.

---

## 📊 Executive Summary

| Issue Category | Status | Impact Level |
|---------------|--------|--------------|
| Startup/Build Crashes | ✅ FIXED | Critical |
| GPU Process Errors | ✅ FIXED | Critical |
| IPC Handler Duplication | ✅ FIXED | High |
| Scraper Bot Detection | ❌ NOT FIXED | Critical |
| Blank Fields in Job List | ❌ NOT FIXED | High |
| AI Mouse Coordinates | 🟡 PARTIAL | Medium |

---

## 🛠️ ISSUE #1: Electron Startup/Build Crashes

### Problem Description
The app would not start due to multiple module resolution errors:
- `ERR_REQUIRE_ESM` errors
- `Module not found` errors
- Build process completing but app crashing on launch

### Root Cause Analysis
**Conflict between ES Modules (Vite/React) and CommonJS (Electron)**

1. `electron-is-dev` package version 2.0+ is ESM-only
2. The build tool (`tsup`) was outputting CommonJS format (`.cjs`)
3. Electron's main process expects CommonJS modules
4. The `"type": "module"` in `package.json` caused import resolution conflicts

### Technical Details
```
Error: require() of ES Module not supported
Error: Cannot find module './dist-electron/electron-main.cjs'
```

### Attempted Solutions

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Used dynamic imports in electron-main.ts | ❌ Still crashed |
| 2 | Changed tsup output format to ESM | ❌ Electron can't run ESM in main process |
| 3 | Used `require()` with full path | ❌ Module resolution failed |
| 4 | **Downgraded electron-is-dev to 1.2.0** | ✅ SUCCESS |

### Final Fix Applied

**File: `package.json`**
```json
{
  "main": "dist-electron/electron-main.cjs",
  "dependencies": {
    "electron-is-dev": "^1.2.0"  // Downgraded from 2.x
  },
  "scripts": {
    "dev:electron": "tsup electron-main.ts preload.ts --format cjs --platform node --out-dir dist-electron --watch"
  }
}
```

**File: `electron-main.ts`**
```typescript
// Must use CommonJS-compatible import
import isDev from 'electron-is-dev';

// preload path must point to .cjs file
webPreferences: {
  preload: path.join(__dirname, "preload.cjs"),
}
```

### Verification Steps
1. Delete `node_modules` and `dist-electron` folders
2. Run `npm install`
3. Run `npm run dev`
4. Check PowerShell for: `"Electron app ready"` message

---

## 🛠️ ISSUE #2: GPU Process Crashes (Windows)

### Problem Description
Random crashes during scraping with error:
```
GPU process exited unexpectedly
Error code: STATUS_ACCESS_VIOLATION
```

### Root Cause
Electron's Chromium uses hardware GPU acceleration by default. On some Windows systems with outdated drivers or virtual environments, this causes crashes.

### Attempted Solutions

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Updated GPU drivers | ❌ Crashes persisted |
| 2 | Used `--disable-gpu` flag in Puppeteer | ❌ Electron still crashed |
| 3 | **Disabled hardware acceleration in Electron** | ✅ SUCCESS |

### Final Fix Applied

**File: `electron-main.ts` (Line 1-8)**
```typescript
import { app, BrowserWindow, Menu, MenuItem } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { initializeDatabase } from './src/main/database';
import { setupIpcHandlers } from './src/main/ipc-handlers';

// FIX: Resolve GPU process crashes on Windows
app.disableHardwareAcceleration();
```

### Trade-offs
- ⚠️ Slightly reduced rendering performance
- ⚠️ CSS animations may be less smooth
- ✅ 100% crash prevention

---

## 🛠️ ISSUE #3: IPC Handler Duplication

### Problem Description
PowerShell console flooded with errors:
```
Attempted to register a second handler for 'settings:get'
Attempted to register a second handler for 'jobs:get-all'
...
```
App would freeze after ~30 seconds due to handler conflicts.

### Root Cause
IPC handlers were being registered in **two places**:
1. Individual files in `src/main/handlers/` folder (modular approach)
2. Central file `src/main/ipc-handlers.ts` (consolidated approach)

When the app loaded, both sets of handlers tried to register, causing conflicts.

### Attempted Solutions

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Only used modular handlers | ❌ Some handlers missing |
| 2 | Only used central handlers | ❌ Lost modularity |
| 3 | **"Clean Slate" approach with removeHandler()** | ✅ SUCCESS |

### Final Fix Applied

**File: `src/main/ipc-handlers.ts`**
```typescript
export function setupIpcHandlers(): void {
  // CLEAN SLATE: Remove existing handlers to prevent duplication error
  const channels = [
    'settings:get', 'settings:update', 'user:get-profile', 
    'profiles:get-all', 'profiles:save', 'profiles:update',
    'jobs:get-all', 'jobs:delete', 'jobs:add-manual', 'jobs:update-doc-confirmation',
    'hunter:start-search', 'ai:process-application', 'docs:get-all', 'docs:save',
    'websites:get-all', 'websites:add', 'websites:delete',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all'
  ];
  
  // Remove all existing handlers first
  channels.forEach(channel => ipcMain.removeHandler(channel));

  // Now register fresh handlers
  ipcMain.handle('settings:get', async () => { /* ... */ });
  // ... rest of handlers
}
```

### Key Lesson
Always call `ipcMain.removeHandler(channel)` before `ipcMain.handle(channel)` to prevent duplication errors during hot reload or module re-import.

---

## 🛠️ ISSUE #4: Scraper Bot Detection (CRITICAL - NOT FIXED)

### Problem Description
LinkedIn and Indeed detect the scraper 70% of the time. Instead of job content, the scraper receives:
- "Verify you are human" pages
- CAPTCHA challenges
- "Sign in to view more jobs" modals
- Blank/blocked pages

### Root Cause Analysis
2026-level bot detection uses multiple signals:
1. **Browser Fingerprinting**: Detects automated browsers via Canvas, WebGL, AudioContext
2. **Behavioral Analysis**: Unnatural mouse movement, instant page interactions
3. **IP Reputation**: Known cloud provider IPs are flagged
4. **WebDriver Detection**: `navigator.webdriver` property set to `true`
5. **Timing Analysis**: Requests too fast or too consistent

### Attempted Solutions

| Attempt | Approach | Result | Code Location |
|---------|----------|--------|---------------|
| 1 | `puppeteer-extra-plugin-stealth` | ❌ Still detected 70% | scraper-service.ts |
| 2 | Persistent `userDataDir` (session cookies) | 🟡 Helps 30% | scraper-service.ts |
| 3 | Custom User-Agent string | ❌ Not sufficient | scraper-service.ts:49 |
| 4 | JSON-LD extraction strategy | 🟡 Works when page loads | scraper-service.ts:55-71 |
| 5 | Visual AI cookie bypass | 🟡 Works sometimes | scraper-service.ts:11-38 |
| 6 | Disabled automation flags | ❌ Still detected | scraper-service.ts:47 |

### Current Implementation

**File: `src/main/scraper-service.ts`**
```typescript
// Launch with stealth flags
browser = await puppeteer.launch({ 
  headless: false,  // Headless mode is easily detected
  args: [
    '--no-sandbox', 
    '--disable-setuid-sandbox', 
    '--disable-blink-features=AutomationControlled'  // Hide webdriver flag
  ] 
});

// Human-like User-Agent
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

// Fixed viewport to prevent fingerprinting
await page.setViewport({ width: 1280, height: 800 });
```

### What STILL Doesn't Work
1. **IP Address**: Running from cloud/VM IPs triggers instant flags
2. **Headless Mode**: Even with stealth plugin, headless is detected
3. **WebDriver Property**: Some sites check `navigator.webdriver` before page load
4. **Canvas Fingerprint**: Puppeteer's canvas produces unique hash

### Recommended Next Steps (Not Yet Implemented)
1. **Residential Proxy Service**: Route traffic through real residential IPs
   - Services: Bright Data, ScrapingBee, Oxylabs
   - Cost: $10-50/GB
   
2. **Human-in-the-Loop**: When Auditor detects "Blocked", pop up notification for manual CAPTCHA solving

3. **Browser Profile Warm-up**: Manual login once to populate cookies before automated scraping

4. **Request Rate Limiting**: Add random delays (3-10 seconds) between requests

---

## 🛠️ ISSUE #5: Blank Fields in Job List

### Problem Description
Jobs appear in the table but with empty fields:
- `companyName: "N/A"`
- `jobTitle: "N/A"`
- `location: "N/A"`

### Root Cause
This is a **downstream effect of Issue #4**. When the scraper is blocked:
1. Page content contains "Verify you are human" instead of job details
2. Hunter AI analyzes the security page, finds no job data
3. JSON extraction returns empty fields

### Attempted Solutions

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Multiple extraction strategies (Selectors, Semantic, Density) | 🟡 Works when page loads correctly |
| 2 | Auditor validation with retry loop | 🟡 Retries but still gets blocked |
| 3 | Content length check (< 200 chars = delete) | ✅ Prevents garbage entries |

### Current Implementation

**File: `src/main/features/Hunter-engine.ts`**
```typescript
export async function analyzeJobUrl(jobId: number, userId: number, url: string, hunter: any, auditor: any, callAI: Function) {
  const pageData = await getJobPageContent(url, userId, callAI);
  
  // Delete if content too short (likely blocked page)
  if (!pageData.content || pageData.content.length < 200) {
    await runQuery('DELETE FROM job_listings', { id: jobId });
    return;
  }
  
  // Verify it's actually a job listing
  const relevancePrompt = `Is this page a specific job listing? Answer ONLY "YES" or "NO".`;
  const isRelevant = await callAI(hunter, relevancePrompt);
  
  if (isRelevant.toUpperCase().includes("NO")) {
    await logAction(userId, 'ai_hunter', `Irrelevant URL detected. Deleting: ${url}`, 'failed', false);
    await runQuery('DELETE FROM job_listings', { id: jobId });
    return;
  }
  // ... rest of analysis
}
```

### Key Insight
This issue **cannot be fully fixed** until Issue #4 (Bot Detection) is resolved. The validation logic only prevents garbage data; it doesn't get the actual job content.

---

## 🛠️ ISSUE #6: AI Mouse Coordinate Mismatch

### Problem Description
Observer AI provides coordinates for clicking "Reject" on cookie banners, but AI Mouse clicks in wrong location (empty space).

### Root Cause
1. **Viewport Mismatch**: Screenshot taken at different resolution than click executed
2. **Dynamic Content**: Cookie banner position changes after page load
3. **AI Prompt Ambiguity**: GPT-4V sometimes returns relative vs absolute coordinates
4. **Scroll Position**: Coordinates don't account for page scroll offset

### Current Implementation

**File: `src/main/scraper-service.ts`**
```typescript
async function handleCookieRoadblock(page: Page, userId: number, callAI: Function) {
  // Take screenshot at current viewport
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  // Ask Observer AI for coordinates
  const prompt = `Analyze this cookie banner. Identify the (x, y) coordinates for the "Reject", "Deny", or "Essential Only" button. Return ONLY JSON: {"x": 0, "y": 0, "action": "reject"}`;
  const analysis = await callAI({ model_name: 'gpt-4o', role: 'Observer' }, prompt, `data:image/png;base64,${screenshot}`);
  
  try {
    const coords = JSON.parse(analysis.replace(/```json|```/g, '').trim());
    await page.mouse.click(coords.x, coords.y);  // Click at returned coordinates
  } catch (e) {
    // Fallback: Try DOM-based click
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const reject = btns.find(b => b.textContent?.toLowerCase().includes('reject'));
      if (reject) (reject as HTMLElement).click();
    });
  }
}
```

### Attempted Solutions

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Fixed viewport (1280x800) | 🟡 Improved accuracy |
| 2 | Scroll to top before screenshot | 🟡 Improved accuracy |
| 3 | DOM-based fallback | ✅ Works when element found |
| 4 | Strict JSON prompt | 🟡 Better parsing |

### Recommended Fix (Not Yet Implemented)
```typescript
// Before screenshot, ensure consistent state
await page.setViewport({ width: 1280, height: 800 });
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(resolve => setTimeout(resolve, 1000));

// Updated prompt with strict viewport reference
const prompt = `
This screenshot is exactly 1280x800 pixels.
Find the "Reject All" or "Decline" button on this cookie consent banner.
Return ONLY valid JSON: {"x": [pixel from left], "y": [pixel from top], "confidence": 0.0-1.0}
If confidence < 0.7, return: {"x": 0, "y": 0, "confidence": 0}
`;
```

---

## 🏗️ Architecture Reference

### AI Agent Roles

| Agent | File | Responsibility |
|-------|------|----------------|
| **Hunter** | `Hunter-engine.ts` | Discovers job URLs, extracts 24-point criteria |
| **Thinker** | `doc-generator.ts` | Generates tailored CVs, Motivation Letters |
| **Auditor** | `Hunter-engine.ts` | Validates scraping quality, ATS compatibility |
| **Librarian** | `document-analyzer.ts` | Manages technical documents (15-word limit summaries) |
| **Secretary** | `secretary-service.ts` | IMAP email monitoring, OTP extraction |
| **Observer** | `scraper-service.ts` | Visual analysis of UI roadblocks |
| **AI Mouse** | `scraper-service.ts` | Executes clicks based on Observer coordinates |

### Critical Files for Bug Fixing

| File | Purpose | Lines |
|------|---------|-------|
| `electron-main.ts` | App entry point, GPU fix | 49 |
| `src/main/ipc-handlers.ts` | All IPC handlers consolidated | 53 |
| `src/main/scraper-service.ts` | Puppeteer cluster logic | 114 |
| `src/main/features/Hunter-engine.ts` | Auditor retry loop | 68 |
| `src/main/ai-service.ts` | AI orchestration (The Brain) | 76 |

---

## 📋 Testing Checklist for Other Apps

### For Electron + Puppeteer Apps:

1. **Module System**
   - [ ] Check `package.json` for `"type": "module"`
   - [ ] Verify electron dependencies are CommonJS compatible
   - [ ] Use `electron-is-dev@1.2.0` if needed

2. **IPC Handlers**
   - [ ] Call `removeHandler()` before `handle()` for hot reload
   - [ ] Consolidate handlers in one file OR ensure no duplicates

3. **GPU Crashes**
   - [ ] Add `app.disableHardwareAcceleration()` at start
   - [ ] Test on Windows with integrated graphics

4. **Bot Detection**
   - [ ] Use `headless: false` for critical scraping
   - [ ] Implement persistent sessions (`userDataDir`)
   - [ ] Add random delays between requests
   - [ ] Consider residential proxy service

5. **AI Vision (Coordinates)**
   - [ ] Lock viewport size before screenshots
   - [ ] Scroll to (0,0) before capturing
   - [ ] Include pixel dimensions in AI prompt
   - [ ] Implement DOM-based fallback

---

## 📊 Current Status Summary

```
✅ WORKING:
- App launches successfully
- UI renders correctly (Settings, Job Search, Search Profiles)
- Database persistence (db.json)
- IPC communication (no duplicates)
- AI model configuration
- Action logging

🟡 PARTIALLY WORKING:
- Cookie bypass (30% success)
- Job URL extraction (when not blocked)
- Document generation (needs clean job data)

❌ NOT WORKING:
- Bot detection bypass (70% blocked)
- Reliable job content scraping
- AI Mouse coordinate accuracy
```

---

**Document Version:** 1.0  
**Last Updated:** January 1, 2026  
**Author:** Auto-Generated from Session Analysis

---

*Use this document to understand the architecture and issues before implementing fixes in other applications.*
