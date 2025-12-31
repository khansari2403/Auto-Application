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
    const deleteId = Array.isArray(params) ? params[0] : params;
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

// src/main/features/secretary-service.ts
var import_imap = __toESM(require("imap"), 1);
var import_mailparser = require("mailparser");
async function fetchLatestOTP(userId) {
  console.log("Secretary: Accessing inbox to retrieve security code...");
  const configRes = await getAllQuery("SELECT * FROM email_config");
  const config = configRes[0];
  if (!config || !config.imap_host || !config.email_user || !config.email_password)
    return null;
  return new Promise((resolve) => {
    const imap = new import_imap.default({
      user: config.email_user,
      password: config.email_password,
      host: config.imap_host,
      port: config.imap_port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          resolve(null);
          return;
        }
        imap.search(["UNSEEN", ["OR", ["FROM", "linkedin.com"], ["FROM", "indeed.com"]]], (err2, results) => {
          if (err2 || !results || results.length === 0) {
            imap.end();
            resolve(null);
            return;
          }
          const f = imap.fetch(results[results.length - 1], { bodies: ["HEADER", "TEXT"] });
          f.on("message", (msg) => {
            msg.on("body", async (stream) => {
              const parsed = await (0, import_mailparser.simpleParser)(stream);
              const otpMatch = (parsed.text || "").match(/\b\d{6}\b/);
              resolve(otpMatch ? otpMatch[0] : null);
            });
          });
          f.once("end", () => imap.end());
        });
      });
    });
    imap.once("error", () => resolve(null));
    imap.connect();
  });
}

// src/main/features/automated-login.ts
async function handleLoginRoadblock(page, credentials, userId) {
  console.log("Login: Attempting automated login...");
  try {
    const cookieButton = 'button[data-tracking-control-name="ga-cookie-banner-accept"], button.artdeco-button--primary';
    try {
      await page.waitForSelector(cookieButton, { timeout: 3e3 });
      await page.click(cookieButton);
    } catch (e) {
    }
    const modalSignInButton = 'button.authwall-join-form__form-toggle--vis, button[data-tracking-control-name="public_jobs_authwall-base_sign-in-button"]';
    const isModalPresent = await page.evaluate((sel) => !!document.querySelector(sel), modalSignInButton);
    if (isModalPresent) {
      await page.click(modalSignInButton);
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    }
    const userSelector = '#username, #session_key, input[name="session_key"], input[type="email"]';
    const passSelector = '#password, #session_password, input[name="session_password"], input[type="password"]';
    const submitSelector = 'button[type="submit"], .login__form_action_container button, .btn__primary--large';
    await page.waitForSelector(userSelector, { timeout: 1e4 });
    await page.type(userSelector, credentials.email, { delay: 100 });
    await page.type(passSelector, credentials.password, { delay: 100 });
    await page.waitForSelector(submitSelector, { timeout: 5e3 });
    await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.scrollIntoView();
        btn.click();
      }
    }, submitSelector);
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    const isOTPRequested = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("verification code") || text.includes("otp") || !!document.querySelector('input[name="pin"]');
    });
    if (isOTPRequested) {
      await logAction(userId, "ai_secretary", "\u{1F4E7} Login requires OTP. Secretary is searching email...", "in_progress");
      const otp = await fetchLatestOTP(userId);
      if (otp) {
        const otpInput = 'input[name="pin"], #input-otp, .input_verification_pin';
        await page.waitForSelector(otpInput, { timeout: 5e3 });
        await page.type(otpInput, otp, { delay: 100 });
        await page.keyboard.press("Enter");
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 });
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false };
  }
}

// src/main/scraper-service.ts
var import_fs2 = __toESM(require("fs"), 1);
async function scrapeJobs(baseUrl, query, location, credentials, userId, callAI2) {
  console.log(`Scraper: Starting localized search for "${query}" in "${location}"`);
  let browser = null;
  const jobUrls = [];
  try {
    browser = await import_puppeteer.default.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled", "--start-maximized"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    const startUrl = baseUrl.includes("linkedin.com") ? "https://www.linkedin.com/jobs/" : "https://de.indeed.com/";
    await page.goto(startUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    const roadblock = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes("sign in") || !!document.querySelector("#username"))
        return "login";
      if (text.includes("not a robot") || text.includes("captcha"))
        return "captcha";
      return null;
    });
    if (roadblock === "login" && userId) {
      await handleLoginRoadblock(page, credentials, userId);
      await page.goto(startUrl, { waitUntil: "networkidle2" });
    } else if (roadblock === "captcha" && userId) {
      await logAction(userId, "ai_observer", "\u{1F916} CAPTCHA detected! Please solve it in the browser window...", "waiting");
      await page.waitForSelector('input[name="q"], #keywords', { timeout: 3e5 });
    }
    if (callAI2) {
      console.log("Scraper: Observer is analyzing the search layout...");
      const screenshot = await page.screenshot({ encoding: "base64" });
      const observerPrompt = `Analyze this job search page. Identify coordinates (x, y) for: 1. Keywords field, 2. Location field, 3. Search button. Return ONLY JSON: {"keywords": {"x": 0, "y": 0}, "location": {"x": 0, "y": 0}, "search": {"x": 0, "y": 0}}`;
      const analysis = await callAI2({ model_name: "gpt-4o", role: "Observer" }, observerPrompt, `data:image/png;base64,${screenshot}`);
      try {
        const coords = JSON.parse(analysis.replace(/```json|```/g, "").trim());
        await page.mouse.click(coords.keywords.x, coords.keywords.y);
        await page.keyboard.type(query, { delay: 100 });
        await page.mouse.click(coords.location.x, coords.location.y);
        await page.keyboard.down("Control");
        await page.keyboard.press("A");
        await page.keyboard.up("Control");
        await page.keyboard.press("Backspace");
        await page.keyboard.type(location, { delay: 100 });
        await page.mouse.click(coords.search.x, coords.search.y);
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 3e4 });
      } catch (e) {
        const cleanQuery = query.replace(/"/g, "");
        const searchUrl = baseUrl.includes("linkedin.com") ? `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(cleanQuery)}&location=${encodeURIComponent(location)}` : `https://de.indeed.com/jobs?q=${encodeURIComponent(cleanQuery)}&l=${encodeURIComponent(location)}`;
        await page.goto(searchUrl, { waitUntil: "networkidle2" });
      }
    }
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    const links = await page.evaluate(() => {
      const selectors = ["a.job-card-container__link", "a.job-card-list__title", "a.base-card__full-link", "a.jcs-JobTitle", "h2.jobTitle a"];
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
async function getJobPageContent(url, useAlternativeMethod = false, userId) {
  console.log(`Deep Reader: Opening ${url}...`);
  let browser = null;
  try {
    browser = await import_puppeteer.default.launch({ headless: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 6e4 });
    const isCaptcha = await page.evaluate(() => document.body.innerText.toLowerCase().includes("not a robot") || document.body.innerText.toLowerCase().includes("captcha"));
    if (isCaptcha && userId) {
      await logAction(userId, "ai_observer", "\u{1F916} CAPTCHA blocked the reader! Please solve it in the browser window...", "waiting");
      await page.waitForSelector(".job-description, #jobDescriptionText, .description__text", { timeout: 3e5 });
    }
    const selectors = [".job-description", "#jobDescriptionText", ".description__text", ".show-more-less-html__markup", "main"];
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1e4 });
        await page.evaluate((s) => {
          var _a;
          return (_a = document.querySelector(s)) == null ? void 0 : _a.scrollIntoView();
        }, selector);
        break;
      } catch (e) {
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    const content = await page.evaluate(() => document.body.innerText);
    const draftPath = `C:/Users/Sideadde/Auto-Application/Drafts/last_capture.txt`;
    try {
      import_fs2.default.writeFileSync(draftPath, content);
    } catch (e) {
    }
    return { content: content || "" };
  } catch (error) {
    console.error(`Deep Reader Error:`, error);
    return { content: "" };
  } finally {
    if (browser)
      await browser.close();
  }
}

// src/main/features/ghost-job-network.ts
async function reportGhostJob(jobData, reason) {
  console.log(`GJN: Reporting ${jobData.companyName}...`);
}

// src/main/features/Hunter-engine.ts
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
            const jobId = Date.now();
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
async function analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI2, isRetry = false) {
  const pageData = await getJobPageContent(url, isRetry, userId);
  if (!pageData.content || pageData.content.length < 100) {
    if (!isRetry)
      return await analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI2, true);
    return;
  }
  await runQuery("UPDATE job_listings", { id: jobId, description: pageData.content, status: "draft_saved" });
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
      messages: [{ role: "system", content: "Professional Assistant. Always respond in the language of the input text." }, { role: "user", content: prompt }],
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
async function startHunterSearch2(userId) {
  return await startHunterSearch(userId, callAI);
}
async function analyzeJobUrl2(jobId, userId, url) {
  const models = await getAllQuery("SELECT * FROM ai_models");
  const hunter = models.find((m) => m.role === "Hunter" && m.status === "active");
  const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
  return await analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI);
}
async function analyzeDocument(docId, userId) {
  console.log(`Orchestrator: Triggering document analysis for ID ${docId}`);
}
function startHuntingScheduler2(userId) {
  if (huntingInterval)
    clearInterval(huntingInterval);
  huntingInterval = startHuntingScheduler(userId, startHunterSearch2, callAI);
}

// src/main/ipc-handlers.ts
function setupIpcHandlers() {
  console.log("Registering all IPC Handlers...");
  import_electron2.ipcMain.handle("docs:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM documents") }));
  import_electron2.ipcMain.handle("docs:save", async (_, data) => {
    const result = await runQuery("INSERT INTO documents", [data]);
    analyzeDocument(result.id, data.userId).catch(console.error);
    return result;
  });
  import_electron2.ipcMain.handle("websites:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM job_websites") }));
  import_electron2.ipcMain.handle("websites:add", async (_, data) => await runQuery("INSERT INTO job_websites", [data]));
  import_electron2.ipcMain.handle("websites:delete", async (_, id) => await runQuery("DELETE FROM job_websites", { id }));
  import_electron2.ipcMain.handle("ai-models:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM ai_models") }));
  import_electron2.ipcMain.handle("ai-models:add", async (_, data) => await runQuery("INSERT INTO ai_models", [data]));
  import_electron2.ipcMain.handle("ai-models:update", async (_, data) => await runQuery("UPDATE ai_models", [data]));
  import_electron2.ipcMain.handle("ai-models:delete", async (_, id) => await runQuery("DELETE FROM ai_models", { id }));
  import_electron2.ipcMain.handle("jobs:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM job_listings") }));
  import_electron2.ipcMain.handle("jobs:delete", async (_, id) => await runQuery("DELETE FROM job_listings", { id }));
  import_electron2.ipcMain.handle("jobs:add-manual", async (_, data) => {
    const result = await runQuery("INSERT INTO job_listings", { ...data, source: "Manual", status: "analyzing" });
    analyzeJobUrl2(result.id, data.userId, data.url).catch(console.error);
    return { success: true, id: result.id };
  });
  import_electron2.ipcMain.handle("hunter:start-search", async (_, userId) => await startHunterSearch2(userId));
  import_electron2.ipcMain.handle("ai:process-application", async (_, jobId, userId) => await processApplication(jobId, userId));
  import_electron2.ipcMain.handle("profiles:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM search_profiles") }));
  import_electron2.ipcMain.handle("profiles:save", async (_, data) => await runQuery("INSERT INTO search_profiles", [data]));
  import_electron2.ipcMain.handle("profiles:update", async (_, data) => await runQuery("UPDATE search_profiles", data));
  import_electron2.ipcMain.handle("user:get-profile", async () => {
    const profile = await getAllQuery("SELECT * FROM user_profile");
    return { success: true, data: profile[0] || null };
  });
  import_electron2.ipcMain.handle("settings:get", async () => {
    const settings = await getAllQuery("SELECT * FROM settings");
    return { success: true, data: settings[0] || null };
  });
  import_electron2.ipcMain.handle("logs:get-recent-actions", async () => ({ success: true, data: await getAllQuery("SELECT * FROM action_logs") }));
  import_electron2.ipcMain.handle("apps:get-all", async () => ({ success: true, data: await getAllQuery("SELECT * FROM applications") }));
  startHuntingScheduler2(1);
  console.log("All IPC Handlers (including Profiles and Manual Jobs) successfully restored.");
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