var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron-main.ts
var import_electron3 = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require("electron-is-dev"), 1);

// src/main/database.ts
var import_path = __toESM(require("path"), 1);
var import_electron = require("electron");
var import_fs = __toESM(require("fs"), 1);
var dbData = global.dbData || null;
var getDbPath = () => {
  const dataDir = import_path.default.join(import_electron.app.getPath("userData"), "data");
  if (!import_fs.default.existsSync(dataDir))
    import_fs.default.mkdirSync(dataDir, { recursive: true });
  return import_path.default.join(dataDir, "db.json");
};
function getDatabase() {
  if (!dbData) {
    const dbPath = getDbPath();
    if (import_fs.default.existsSync(dbPath)) {
      try {
        dbData = JSON.parse(import_fs.default.readFileSync(dbPath, "utf8"));
      } catch (e) {
        dbData = getDefaultData();
      }
    } else {
      dbData = getDefaultData();
    }
    global.dbData = dbData;
  }
  const tables = ["user_profile", "email_config", "job_preferences", "ai_models", "job_websites", "company_monitoring", "job_listings", "applications", "action_logs", "email_alerts", "documents", "search_profiles", "settings", "questions"];
  tables.forEach((t) => {
    if (!dbData[t])
      dbData[t] = [];
  });
  return dbData;
}
var getDefaultData = () => ({
  user_profile: [],
  email_config: [],
  job_preferences: [],
  ai_models: [],
  job_websites: [],
  company_monitoring: [],
  job_listings: [],
  applications: [],
  action_logs: [],
  email_alerts: [],
  documents: [],
  search_profiles: [],
  settings: [],
  questions: []
});
var saveDb = () => import_fs.default.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));
async function initializeDatabase() {
  getDatabase();
}
var toSnakeCase = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
var mapToSnakeCase = (obj) => {
  const newObj = {};
  for (const key in obj) {
    newObj[toSnakeCase(key)] = obj[key];
  }
  return newObj;
};
async function runQuery(sql, params = []) {
  const db = getDatabase();
  const id = Date.now();
  const sqlParts = sql.trim().split(/\s+/);
  let table = "";
  if (sql.toUpperCase().includes("INSERT INTO"))
    table = sqlParts[2];
  else if (sql.toUpperCase().includes("UPDATE"))
    table = sqlParts[1];
  else if (sql.toUpperCase().includes("DELETE FROM"))
    table = sqlParts[2];
  table = table.replace(/[`"']/g, "");
  if (!db[table])
    return { success: false, error: "Table not found" };
  const newData = Array.isArray(params) ? params[0] : params;
  if (sql.toUpperCase().includes("INSERT")) {
    const mapped = mapToSnakeCase(newData);
    db[table].push({ ...mapped, id, is_active: mapped.is_active ?? 1, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (sql.toUpperCase().includes("UPDATE")) {
    const index = db[table].findIndex((item) => item.id === newData.id || ["user_profile", "settings"].includes(table));
    if (index !== -1)
      db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData) };
    else if (["user_profile", "settings"].includes(table))
      db[table].push({ ...mapToSnakeCase(newData), id });
  } else if (sql.toUpperCase().includes("DELETE")) {
    const deleteId = typeof newData === "object" ? newData.id : newData;
    db[table] = db[table].filter((item) => item.id !== deleteId);
  }
  saveDb();
  return { id };
}
async function getAllQuery(sql) {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3].replace(/[`"']/g, "");
  return db[table] || [];
}
async function logAction(userId, type, desc, status, success) {
  await runQuery("INSERT INTO action_logs", {
    user_id: userId,
    action_type: type,
    action_description: desc,
    status,
    success
  });
}

// src/main/ipc-handlers.ts
var import_electron2 = require("electron");

// src/main/ai-service.ts
var import_axios = __toESM(require("axios"), 1);

// src/main/scraper-service.ts
var import_puppeteer = __toESM(require("puppeteer"), 1);
async function handleCookieRoadblock(page, userId, callAI2) {
  try {
    const isBannerVisible = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("cookie") || text.includes("accept") || text.includes("agree") || text.includes("zustimmen");
    });
    if (!isBannerVisible)
      return;
    await logAction(userId, "ai_observer", "\u{1F4F8} Cookie banner detected. Taking a photo...", "in_progress");
    const screenshot = await page.screenshot({ encoding: "base64" });
    const prompt = `Analyze this cookie banner. Identify the (x, y) coordinates for the "Reject", "Deny", or "Essential Only" button. Return ONLY JSON: {"x": 0, "y": 0, "action": "reject"}`;
    const analysis = await callAI2({ model_name: "gpt-4o", role: "Observer" }, prompt, `data:image/png;base64,${screenshot}`);
    try {
      const coords = JSON.parse(analysis.replace(/```json|```/g, "").trim());
      await logAction(userId, "ai_mouse", `\u9F20\u6807 AI Mouse clicking ${coords.action} at (${coords.x}, ${coords.y})`, "in_progress");
      await page.mouse.click(coords.x, coords.y);
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    } catch (e) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button, a"));
        const reject = btns.find((b) => {
          var _a, _b;
          return ((_a = b.textContent) == null ? void 0 : _a.toLowerCase().includes("reject")) || ((_b = b.textContent) == null ? void 0 : _b.toLowerCase().includes("ablehnen"));
        });
        if (reject)
          reject.click();
      });
    }
  } catch (e) {
  }
}
async function getJobPageContent(url, userId, callAI2) {
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({ headless: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 6e4 });
    await handleCookieRoadblock(page, userId, callAI2);
    await new Promise((resolve) => setTimeout(resolve, 4e3));
    const result = await page.evaluate(() => {
      const getCleanText = (el) => el ? el.innerText.replace(/\s+/g, " ").trim() : "";
      const s1 = document.querySelector(".job-description, #jobDescriptionText, .description__text, .show-more-less-html__markup");
      if (s1 && s1.textContent && s1.textContent.length > 300)
        return { content: getCleanText(s1), strategy: "Style A: Selectors" };
      const s2 = document.querySelector("main, article");
      if (s2 && s2.textContent && s2.textContent.length > 300)
        return { content: getCleanText(s2), strategy: "Style B: Semantic" };
      const blocks = Array.from(document.querySelectorAll("div")).map((el) => getCleanText(el));
      const t3 = blocks.sort((a, b) => b.length - a.length)[0];
      if (t3 && t3.length > 300)
        return { content: t3, strategy: "Style C: Density" };
      return { content: getCleanText(document.body), strategy: "Style D: Body Dump" };
    });
    return { content: result.content, strategyUsed: result.strategy };
  } catch (error) {
    return { content: "", strategyUsed: "Failed" };
  } finally {
    if (browser)
      await browser.close();
  }
}
async function scrapeJobs(baseUrl, query, location, credentials, userId, callAI2) {
  let browser = null;
  const jobUrls = [];
  try {
    browser = await import_puppeteer.default.launch({ headless: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", "--start-maximized"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    const startUrl = baseUrl.includes("linkedin.com") ? "https://www.linkedin.com/jobs/" : "https://de.indeed.com/";
    await page.goto(startUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    if (callAI2 && userId)
      await handleCookieRoadblock(page, userId, callAI2);
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    const links = await page.evaluate(() => {
      const selectors = ["a.job-card-container__link", "a.base-card__full-link", "a.jcs-JobTitle", "h2.jobTitle a"];
      const foundLinks = [];
      selectors.forEach((s) => document.querySelectorAll(s).forEach((el) => {
        const href = el.href;
        if (href && href.startsWith("http") && !foundLinks.includes(href))
          foundLinks.push(href);
      }));
      return foundLinks.slice(0, 15);
    });
    jobUrls.push(...links);
  } catch (error) {
    console.error("Scraper Error:", error);
  } finally {
    if (browser)
      await browser.close();
  }
  return jobUrls;
}

// src/main/features/ghost-job-network.ts
async function reportGhostJob(jobData, reason) {
  console.log(`GJN: Reporting ${jobData.companyName}...`);
}

// src/main/features/Hunter-engine.ts
async function analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI2) {
  const pageData = await getJobPageContent(url, userId, callAI2);
  if (!pageData.content || pageData.content.length < 200) {
    await runQuery("DELETE FROM job_listings", { id: jobId });
    return;
  }
  await logAction(userId, "ai_hunter", `Scraping successful using ${pageData.strategyUsed}`, "completed", true);
  const relevancePrompt = `Is this page a specific job listing? Answer ONLY "YES" or "NO". 

Content: ${pageData.content.substring(0, 2e3)}`;
  const isRelevant = await callAI2(hunter, relevancePrompt);
  if (isRelevant.toUpperCase().includes("NO")) {
    await logAction(userId, "ai_hunter", `Irrelevant URL detected. Deleting: ${url}`, "failed", false);
    await runQuery("DELETE FROM job_listings", { id: jobId });
    return;
  }
  await runQuery("UPDATE job_listings", { id: jobId, description: pageData.content, status: "analyzed" });
  const prompt = `Analyze this job listing. Extract in STRICT JSON: { "jobTitle": "...", "companyName": "...", "location": "...", "jobType": "...", "experienceLevel": "...", "salaryRange": "...", "industry": "...", "requiredSkills": "...", "educationLevel": "...", "remoteOnsite": "...", "benefits": "...", "companySize": "...", "companyRating": "...", "deadline": "...", "certifications": "...", "languages": "...", "visaSponsorship": "...", "relocation": "...", "travelRequirement": "...", "shiftSchedule": "...", "role": "...", "postedDate": "...", "applicationUrl": "...", "isGhostJob": "boolean" }. 

Content: ${pageData.content.substring(0, 1e4)}`;
  const result = await callAI2(hunter, prompt);
  try {
    const data = JSON.parse(result.replace(/```json|```/g, "").trim());
    await runQuery("UPDATE job_listings", { id: jobId, ...data, status: "analyzed", date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString() });
    if (data.isGhostJob)
      await reportGhostJob(data, "Flagged during analysis");
  } catch (e) {
    await runQuery("UPDATE job_listings", { id: jobId, status: "manual_review" });
  }
}
async function startHunterSearch(userId, callAI2) {
  try {
    const db = getDatabase();
    const profiles = db.search_profiles.filter((p) => p.is_active === 1);
    const websites = db.job_websites.filter((w) => w.is_active === 1);
    const models = await getAllQuery("SELECT * FROM ai_models");
    const hunter = models.find((m) => m.role === "Hunter" && m.status === "active");
    if (!hunter)
      return { success: false, error: "Hunter missing" };
    for (const profile of profiles) {
      for (const website of websites) {
        const queryPrompt = `Generate a job search query for ${website.website_name} based on: ${profile.job_title} in ${profile.location}.`;
        let query = await callAI2(hunter, queryPrompt);
        query = query.replace(/Here is.*?:\s*/gi, "").replace(/[`"']/g, "").trim();
        const jobUrls = await scrapeJobs(website.website_url, query, profile.location, { email: website.email, password: website.password }, userId, callAI2);
        for (const url of jobUrls) {
          const existing = db.job_listings.find((j) => j.url === url);
          if (!existing) {
            const jobId = Date.now() + Math.floor(Math.random() * 1e3);
            await runQuery("INSERT INTO job_listings", { id: jobId, url, source: website.website_name, status: "analyzing" });
            analyzeJobUrl(jobId, userId, url, hunter, models.find((m) => m.role === "Auditor"), callAI2).catch(console.error);
          }
        }
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// src/main/features/doc-generator.ts
async function generateTailoredDocs(job, thinker, auditor, options, callAI2) {
  const docTypes = [
    { key: "cv", label: "CV" },
    { key: "motivation_letter", label: "Motivation Letter" },
    { key: "portfolio", label: "Portfolio" },
    { key: "proposal", label: "Proposal" },
    { key: "cover_letter", label: "Cover Letter" }
  ];
  for (const type of docTypes) {
    const optionKey = type.key === "motivation_letter" ? "motivationLetter" : type.key;
    if (options[optionKey]) {
      try {
        await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "generating" });
        const genPrompt = `Generate a tailored ${type.label} for: ${job.job_title} at ${job.company_name}. 
Job Description: ${job.description}`;
        const content = await callAI2(thinker, genPrompt);
        await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "thinker_done" });
        const auditResult = await callAI2(auditor, `Review this ${type.label}: ${content}. Answer APPROVED or REJECT.`);
        if (auditResult.toUpperCase().includes("APPROVED")) {
          await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "auditor_done" });
        } else {
          await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "failed" });
        }
      } catch (e) {
        await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "failed" });
      }
    }
  }
}

// src/main/features/scheduler.ts
function startHuntingScheduler(userId, startHunterSearch3, callAI2) {
  return setInterval(async () => {
    const db = getDatabase();
    const websites = db.job_websites.filter((w) => w.is_active === 1);
    const now = /* @__PURE__ */ new Date();
    for (const website of websites) {
      const lastChecked = website.last_checked ? new Date(website.last_checked) : /* @__PURE__ */ new Date(0);
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1e3 * 60 * 60);
      const frequency = website.site_type === "career_page" ? 24 : website.check_frequency || 4;
      if (hoursSinceLastCheck >= frequency) {
        await startHunterSearch3(userId, callAI2);
        await runQuery("UPDATE job_websites", { id: website.id, last_checked: now.toISOString() });
      }
    }
  }, 6e4);
}

// src/main/ai-service.ts
var huntingInterval = null;
async function callAI(model, prompt, fileData) {
  var _a, _b, _c, _d;
  try {
    if (!model)
      return "Error: Model missing";
    let apiKey = model.api_key ? model.api_key.trim() : "";
    let modelName = model.model_name;
    if (!apiKey && model.role) {
      const models = await getAllQuery("SELECT * FROM ai_models");
      const dbModel = models.find((m) => m.role === model.role && m.status === "active");
      if (dbModel) {
        apiKey = dbModel.api_key.trim();
        if (!modelName || modelName === "gpt-4o")
          modelName = dbModel.model_name;
      }
    }
    let endpoint = model.model_type === "local" || ((_a = model.api_endpoint) == null ? void 0 : _a.includes("localhost")) ? model.api_endpoint || "http://localhost:11434/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    if (apiKey.startsWith("tgp_v1_"))
      endpoint = "https://api.together.xyz/v1/chat/completions";
    const response = await import_axios.default.post(endpoint, {
      model: modelName,
      messages: [{ role: "system", content: "Professional Assistant" }, { role: "user", content: prompt }],
      max_tokens: 1e3
    }, {
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 6e4
    });
    return response.data.choices[0].message.content;
  } catch (err) {
    return "Error: " + (((_d = (_c = (_b = err.response) == null ? void 0 : _b.data) == null ? void 0 : _c.error) == null ? void 0 : _d.message) || err.message);
  }
}
async function startHunterSearch2(userId) {
  return await startHunterSearch(userId, callAI);
}
async function analyzeJobUrl2(jobId, userId, url) {
  const models = await getAllQuery("SELECT * FROM ai_models");
  const hunter = models.find((m) => m.role === "Hunter" && m.status === "active");
  const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
  return await analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI);
}
async function processApplication(jobId, userId, userConsentGiven = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    if (!job)
      return { success: false, error: "Job not found" };
    const models = await getAllQuery("SELECT * FROM ai_models");
    const thinker = models.find((m) => m.role === "Thinker" && m.status === "active");
    const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
    if (thinker && auditor) {
      await generateTailoredDocs(job, thinker, auditor, { cv: true, coverLetter: true }, callAI);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function startHuntingScheduler2(userId) {
  if (huntingInterval)
    clearInterval(huntingInterval);
  huntingInterval = startHuntingScheduler(userId, startHunterSearch2, callAI);
}

// src/main/ipc-handlers.ts
function setupIpcHandlers() {
  const channels = [
    "settings:get",
    "settings:update",
    "user:get-profile",
    "profiles:get-all",
    "profiles:save",
    "profiles:update",
    "jobs:get-all",
    "jobs:delete",
    "jobs:add-manual",
    "jobs:update-doc-confirmation",
    "hunter:start-search",
    "ai:process-application",
    "docs:get-all",
    "docs:save",
    "websites:get-all",
    "websites:add",
    "websites:delete",
    "ai-models:get-all",
    "ai-models:add",
    "ai-models:update",
    "ai-models:delete",
    "logs:get-recent-actions",
    "apps:get-all"
  ];
  channels.forEach((channel) => import_electron2.ipcMain.removeHandler(channel));
  import_electron2.ipcMain.handle("settings:get", async () => ({ success: true, data: (await getAllQuery("SELECT * FROM settings"))[0] || null }));
  import_electron2.ipcMain.handle("settings:update", async (_, data) => await runQuery("UPDATE settings", data));
  import_electron2.ipcMain.handle("user:get-profile", async () => ({ success: true, data: (await getAllQuery("SELECT * FROM user_profile"))[0] || null }));
  import_electron2.ipcMain.handle("profiles:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM search_profiles") }));
  import_electron2.ipcMain.handle("profiles:save", async (_, data) => await runQuery("INSERT INTO search_profiles", [data]));
  import_electron2.ipcMain.handle("profiles:update", async (_, data) => await runQuery("UPDATE search_profiles", data));
  import_electron2.ipcMain.handle("jobs:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM job_listings") }));
  import_electron2.ipcMain.handle("jobs:delete", async (_, id) => await runQuery("DELETE FROM job_listings", { id: typeof id === "object" ? id.id : id }));
  import_electron2.ipcMain.handle("jobs:add-manual", async (_, data) => {
    const result = await runQuery("INSERT INTO job_listings", { ...data, source: "Manual", status: "analyzing" });
    analyzeJobUrl2(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });
  import_electron2.ipcMain.handle("hunter:start-search", async (_, userId) => await startHunterSearch2(userId));
  import_electron2.ipcMain.handle("ai:process-application", async (_, jobId, userId) => await processApplication(jobId, userId));
  import_electron2.ipcMain.handle("docs:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM documents") }));
  import_electron2.ipcMain.handle("docs:save", async (_, data) => await runQuery("INSERT INTO documents", [data]));
  import_electron2.ipcMain.handle("websites:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM job_websites") }));
  import_electron2.ipcMain.handle("websites:add", async (_, data) => await runQuery("INSERT INTO job_websites", [data]));
  import_electron2.ipcMain.handle("websites:delete", async (_, id) => await runQuery("DELETE FROM job_websites", { id }));
  import_electron2.ipcMain.handle("ai-models:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM ai_models") }));
  import_electron2.ipcMain.handle("ai-models:add", async (_, data) => await runQuery("INSERT INTO ai_models", [data]));
  import_electron2.ipcMain.handle("ai-models:update", async (_, data) => await runQuery("UPDATE ai_models", [data]));
  import_electron2.ipcMain.handle("ai-models:delete", async (_, id) => await runQuery("DELETE FROM ai_models", { id }));
  import_electron2.ipcMain.handle("logs:get-recent-actions", async () => ({ success: true, data: await getAllQuery("SELECT * FROM action_logs") }));
  import_electron2.ipcMain.handle("apps:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM applications") }));
  startHuntingScheduler2(1);
}

// electron-main.ts
import_electron3.app.disableHardwareAcceleration();
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron3.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    webPreferences: {
      preload: import_path2.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const startUrl = import_electron_is_dev.default ? "http://localhost:5173" : `file://${import_path2.default.join(__dirname, "../dist/index.html")}`;
  mainWindow.loadURL(startUrl);
  if (import_electron_is_dev.default)
    mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new import_electron3.Menu();
    menu.append(new import_electron3.MenuItem({ label: "Cut", role: "cut", enabled: params.editFlags.canCut }));
    menu.append(new import_electron3.MenuItem({ label: "Copy", role: "copy", enabled: params.editFlags.canCopy }));
    menu.append(new import_electron3.MenuItem({ label: "Paste", role: "paste", enabled: params.editFlags.canPaste }));
    menu.append(new import_electron3.MenuItem({ type: "separator" }));
    menu.append(new import_electron3.MenuItem({ label: "Select All", role: "selectAll", enabled: params.editFlags.canSelectAll }));
    menu.popup({ window: mainWindow });
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron3.app.on("ready", async () => {
  await initializeDatabase();
  setupIpcHandlers();
  createWindow();
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    import_electron3.app.quit();
});
//# sourceMappingURL=electron-main.cjs.map