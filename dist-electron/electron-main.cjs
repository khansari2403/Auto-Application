var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main/database.ts
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
    if (!dbData[t]) dbData[t] = [];
  });
  return dbData;
}
async function initializeDatabase() {
  getDatabase();
}
async function runQuery(sql, params = []) {
  const db = getDatabase();
  const sqlUpper = sql.toUpperCase();
  const sqlParts = sql.trim().split(/\s+/);
  let table = "";
  if (sqlUpper.includes("INSERT INTO")) {
    table = sqlParts[2];
  } else if (sqlUpper.includes("UPDATE")) {
    table = sqlParts[1];
  } else if (sqlUpper.includes("DELETE FROM")) {
    table = sqlParts[2];
  }
  table = table.replace(/[`"']/g, "");
  console.log(`DB: ${sqlUpper.split(" ")[0]} on "${table}"`);
  if (!db[table]) {
    console.log(`DB: Table "${table}" not found!`);
    return { success: false, error: "Table not found" };
  }
  const newData = Array.isArray(params) ? params[0] : params;
  if (sqlUpper.includes("INSERT")) {
    const mapped = mapToSnakeCase(newData);
    const recordId = mapped.id || newData.id || Date.now();
    const record = {
      ...mapped,
      id: recordId,
      is_active: mapped.is_active ?? 1,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    db[table].push(record);
    saveDb();
    console.log(`DB: Inserted into ${table} with id=${recordId}`);
    return { id: recordId, success: true };
  } else if (sqlUpper.includes("UPDATE")) {
    const mapped = mapToSnakeCase(newData);
    const updateId = mapped.id || newData.id;
    console.log(`DB: Looking for id=${updateId} in ${table} (${db[table].length} records)`);
    let index = -1;
    if (updateId !== void 0) {
      index = db[table].findIndex((item) => {
        return item.id === updateId || item.id === Number(updateId) || String(item.id) === String(updateId);
      });
    }
    if (index === -1 && ["user_profile", "settings", "job_preferences", "email_config"].includes(table)) {
      if (db[table].length > 0) {
        index = 0;
      } else {
        const record = { ...mapped, id: updateId || Date.now(), timestamp: (/* @__PURE__ */ new Date()).toISOString() };
        db[table].push(record);
        saveDb();
        console.log(`DB: Created new ${table} record`);
        return { id: record.id, success: true };
      }
    }
    if (index !== -1) {
      db[table][index] = {
        ...db[table][index],
        ...mapped,
        id: db[table][index].id
        // Keep original ID
      };
      saveDb();
      console.log(`DB: Updated ${table}[${index}] with id=${db[table][index].id}`);
      return { success: true, id: db[table][index].id };
    } else {
      console.log(`DB: \u274C Record not found for update! id=${updateId}`);
      console.log(`DB: Available IDs in ${table}:`, db[table].map((r) => r.id));
      return { success: false, error: "Record not found" };
    }
  } else if (sqlUpper.includes("DELETE")) {
    const deleteId = typeof newData === "object" ? newData.id : newData;
    const beforeCount = db[table].length;
    db[table] = db[table].filter((item) => {
      return item.id !== deleteId && item.id !== Number(deleteId) && String(item.id) !== String(deleteId);
    });
    const deleted = beforeCount - db[table].length;
    saveDb();
    console.log(`DB: Deleted ${deleted} record(s) from ${table} where id=${deleteId}`);
    return { success: true, deleted };
  }
  return { success: false, error: "Unknown operation" };
}
async function getAllQuery(sql) {
  const db = getDatabase();
  const parts = sql.trim().split(/\s+/);
  let table = "";
  const fromIndex = parts.findIndex((p) => p.toUpperCase() === "FROM");
  if (fromIndex !== -1 && parts[fromIndex + 1]) {
    table = parts[fromIndex + 1].replace(/[`"']/g, "");
  }
  const result = db[table] || [];
  console.log(`DB: SELECT from ${table} returned ${result.length} records`);
  return result;
}
async function logAction(userId, type, desc, status, success) {
  const db = getDatabase();
  const logEntry = {
    id: Date.now(),
    user_id: userId,
    action_type: type,
    action_description: desc,
    status,
    success,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.action_logs.push(logEntry);
  if (db.action_logs.length > 200) {
    db.action_logs = db.action_logs.slice(-200);
  }
  saveDb();
}
var import_path, import_electron, import_fs, dbData, getDbPath, getDefaultData, saveDb, toSnakeCase, mapToSnakeCase;
var init_database = __esm({
  "src/main/database.ts"() {
    import_path = __toESM(require("path"), 1);
    import_electron = require("electron");
    import_fs = __toESM(require("fs"), 1);
    dbData = global.dbData || null;
    getDbPath = () => {
      const dataDir = import_path.default.join(import_electron.app.getPath("userData"), "data");
      if (!import_fs.default.existsSync(dataDir)) import_fs.default.mkdirSync(dataDir, { recursive: true });
      return import_path.default.join(dataDir, "db.json");
    };
    getDefaultData = () => ({
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
    saveDb = () => {
      try {
        import_fs.default.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));
        console.log("DB: Saved to disk");
      } catch (e) {
        console.error("DB: Save failed", e);
      }
    };
    toSnakeCase = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    mapToSnakeCase = (obj) => {
      const newObj = {};
      for (const key in obj) {
        newObj[toSnakeCase(key)] = obj[key];
      }
      return newObj;
    };
  }
});

// src/main/scraper-service.ts
async function launchBrowser(options = {}) {
  const db = getDatabase();
  const settings = db.settings[0] || {};
  const proxyServer = settings.proxy_url;
  const defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--window-size=1280,800"
  ];
  if (proxyServer) {
    console.log(`Scraper: Using proxy server: ${proxyServer}`);
    defaultArgs.push(`--proxy-server=${proxyServer}`);
  }
  const launchOptions = {
    headless: options.headless !== void 0 ? options.headless : false,
    userDataDir: options.userDataDir || getUserDataDir(),
    args: [...defaultArgs, ...options.args || []]
  };
  const browser = await import_puppeteer.default.launch(launchOptions);
  if (proxyServer && proxyServer.includes("@")) {
    const authPart = proxyServer.split("@")[0].replace("http://", "").replace("https://", "");
    const [username, password] = authPart.split(":");
    if (username && password) {
      const page = (await browser.pages())[0] || await browser.newPage();
      await page.authenticate({ username, password });
    }
  }
  return browser;
}
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
async function handleCookieRoadblock(page, userId, callAI2) {
  try {
    const isBannerVisible = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("cookie") || text.includes("accept") || text.includes("agree") || text.includes("zustimmen") || text.includes("akzeptieren");
    });
    if (!isBannerVisible) return;
    await logAction(userId, "ai_observer", "\u{1F4F8} Cookie banner detected. Attempting bypass...", "in_progress");
    const clicked = await page.evaluate(() => {
      const selectors = [
        'button[data-testid="cookie-policy-dialog-accept-button"]',
        'button[id*="reject"]',
        'button[id*="decline"]',
        'button[id*="ablehnen"]',
        'button[class*="reject"]',
        'button[class*="decline"]',
        '[data-tracking-control-name*="cookie"]',
        "button.artdeco-button--secondary"
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          btn.click();
          return true;
        }
      }
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const rejectBtn = btns.find((b) => {
        var _a;
        const txt = ((_a = b.textContent) == null ? void 0 : _a.toLowerCase()) || "";
        return txt.includes("reject") || txt.includes("decline") || txt.includes("ablehnen") || txt.includes("nur notwendige") || txt.includes("essential");
      });
      if (rejectBtn) {
        rejectBtn.click();
        return true;
      }
      const acceptBtn = btns.find((b) => {
        var _a;
        const txt = ((_a = b.textContent) == null ? void 0 : _a.toLowerCase()) || "";
        return txt.includes("accept") || txt.includes("agree") || txt.includes("akzeptieren") || txt.includes("alle akzeptieren");
      });
      if (acceptBtn) {
        acceptBtn.click();
        return true;
      }
      return false;
    });
    if (clicked) {
      await logAction(userId, "ai_observer", "\u2705 Cookie banner dismissed", "completed", true);
      await randomDelay(1500, 2500);
    }
  } catch (e) {
    console.log("Cookie bypass error:", e);
  }
}
async function isPageBlocked(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes("verify you are human") || text.includes("captcha") || text.includes("unusual traffic") || text.includes("sign in to view") || text.includes("please verify") || text.includes("robot") || text.includes("blocked");
  });
}
async function getJobPageContent(url, userId, callAI2) {
  let browser = null;
  try {
    console.log(`Scraper: Opening ${url}`);
    browser = await launchBrowser({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en", "de"] });
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 6e4 });
    await handleCookieRoadblock(page, userId, callAI2);
    await page.evaluate(() => window.scrollBy(0, 300));
    await randomDelay(800, 1500);
    await page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(1500, 3e3);
    if (await isPageBlocked(page)) {
      console.log("Scraper: Page blocked by bot detection");
      return { content: "", strategyUsed: "Blocked" };
    }
    const result = await page.evaluate(() => {
      const getCleanText = (el) => el ? el.innerText.replace(/\s+/g, " ").trim() : "";
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          if (data["@type"] === "JobPosting" || data.title || data.jobTitle) {
            console.log("Found JSON-LD JobPosting");
            return { content: JSON.stringify(data, null, 2), strategy: "JSON-LD" };
          }
          if (Array.isArray(data)) {
            const job = data.find((item) => item["@type"] === "JobPosting");
            if (job) {
              return { content: JSON.stringify(job, null, 2), strategy: "JSON-LD" };
            }
          }
          if (data["@graph"]) {
            const job = data["@graph"].find((item) => item["@type"] === "JobPosting");
            if (job) {
              return { content: JSON.stringify(job, null, 2), strategy: "JSON-LD" };
            }
          }
        } catch (e) {
        }
      }
      const jobSelectors = [
        ".job-description",
        "#jobDescriptionText",
        ".description__text",
        ".show-more-less-html__markup",
        ".jobs-description__content",
        ".jobs-box__html-content",
        '[data-testid="job-description"]',
        ".job-details",
        ".jobsearch-JobComponent-description",
        "#job-details"
      ];
      for (const sel of jobSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.length > 300) {
          return { content: getCleanText(el), strategy: `Selector: ${sel}` };
        }
      }
      const semanticEls = document.querySelectorAll('main, article, [role="main"]');
      for (const el of semanticEls) {
        if (el.textContent && el.textContent.length > 500) {
          return { content: getCleanText(el), strategy: "Semantic" };
        }
      }
      const divs = Array.from(document.querySelectorAll("div, section"));
      const blocks = divs.map((el) => {
        var _a;
        return { el, text: getCleanText(el), len: ((_a = el.textContent) == null ? void 0 : _a.length) || 0 };
      }).filter((b) => b.len > 500 && b.len < 5e4).sort((a, b) => b.len - a.len);
      if (blocks.length > 0) {
        return { content: blocks[0].text, strategy: "Density" };
      }
      const bodyText = getCleanText(document.body);
      if (bodyText.length > 300) {
        return { content: bodyText.substring(0, 15e3), strategy: "Body" };
      }
      return { content: "", strategy: "Empty" };
    });
    console.log(`Scraper: Extracted using ${result.strategy}, length: ${result.content.length}`);
    return { content: result.content, strategyUsed: result.strategy };
  } catch (error) {
    console.error("Scraper Error:", error.message);
    return { content: "", strategyUsed: "Failed: " + error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
async function scrapeJobs(baseUrl, query, location, credentials, userId, callAI2) {
  let browser = null;
  const jobUrls = [];
  try {
    console.log(`Scraper: Searching for "${query}" in "${location}" on ${baseUrl}`);
    browser = await launchBrowser({ headless: false, args: ["--start-maximized"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    let searchUrl;
    if (baseUrl.includes("linkedin.com")) {
      searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("indeed")) {
      searchUrl = `https://de.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("glassdoor")) {
      searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locKeyword=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("xing")) {
      searchUrl = `https://www.xing.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    } else {
      searchUrl = baseUrl;
    }
    console.log(`Scraper: Navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    if (callAI2 && userId) {
      await handleCookieRoadblock(page, userId, callAI2);
    }
    await randomDelay(2e3, 4e3);
    await page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(1e3, 2e3);
    await page.evaluate(() => window.scrollBy(0, 400));
    await randomDelay(2e3, 4e3);
    if (await isPageBlocked(page)) {
      console.log("Scraper: Search page blocked");
      if (userId) {
        await logAction(userId, "ai_hunter", "\u{1F6AB} Search page blocked by bot detection", "failed", false);
      }
      return [];
    }
    const links = await page.evaluate(() => {
      const selectors = [
        // LinkedIn
        "a.job-card-container__link",
        "a.base-card__full-link",
        'a[data-tracking-control-name="public_jobs_jserp-result_search-card"]',
        ".jobs-search__results-list a",
        // Indeed
        "a.jcs-JobTitle",
        "h2.jobTitle a",
        ".job_seen_beacon a[data-jk]",
        ".jobsearch-ResultsList a.tapItem",
        // Glassdoor
        "a.job-title",
        ".react-job-listing a",
        // Xing
        'a[data-testid="job-posting-link"]',
        ".jobs-list a",
        // Generic
        'a[href*="/job/"]',
        'a[href*="/jobs/"]',
        'a[href*="jobPosting"]'
      ];
      const foundLinks = [];
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          const href = el.href;
          if (href && href.startsWith("http") && !foundLinks.includes(href) && !href.includes("/login") && !href.includes("/signup") && !href.includes("/register")) {
            foundLinks.push(href);
          }
        });
      });
      return foundLinks;
    });
    const uniqueLinks = [...new Set(links)].slice(0, 15);
    jobUrls.push(...uniqueLinks);
    console.log(`Scraper: Found ${jobUrls.length} job URLs`);
  } catch (error) {
    console.error("Scraper Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  return jobUrls;
}
async function getCompanyInfo(companyName, userId, callAI2) {
  let browser = null;
  try {
    console.log(`Scraper: Researching company: ${companyName}`);
    await logAction(userId, "ai_observer", `\u{1F50D} Researching company: ${companyName}`, "in_progress");
    browser = await launchBrowser({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    const siteSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + " official website")}`;
    await page.goto(siteSearchUrl, { waitUntil: "networkidle2" });
    const officialSite = await page.evaluate(() => {
      var _a;
      return (_a = document.querySelector("div.g a")) == null ? void 0 : _a.getAttribute("href");
    });
    const searchUrl = officialSite ? `https://www.google.com/search?q=site:${new URL(officialSite).hostname} mission history about` : `https://www.google.com/search?q=${encodeURIComponent(companyName + " company mission history news")}`;
    await page.goto(searchUrl, { waitUntil: "networkidle2" });
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div.g a")).map((a) => a.href).filter((href) => href && !href.includes("google.com")).slice(0, 2);
    });
    let combinedInfo = "";
    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: "networkidle2", timeout: 3e4 });
        const text = await page.evaluate(() => {
          const body = document.body.innerText;
          return body.substring(0, 5e3).replace(/\s+/g, " ").trim();
        });
        combinedInfo += `
--- Source: ${link} ---
${text}
`;
      } catch (e) {
        console.log(`Failed to scrape ${link}:`, e);
      }
    }
    return combinedInfo || "No specific company info found.";
  } catch (error) {
    console.error("Company Research Error:", error.message);
    return "Error researching company: " + error.message;
  } finally {
    if (browser) await browser.close();
  }
}
async function capturePageScreenshot(page) {
  const screenshot = await page.screenshot({ encoding: "base64" });
  return `data:image/png;base64,${screenshot}`;
}
async function executeMouseAction(page, action) {
  console.log(`AI Mouse: Executing ${action.type} at (${action.x}, ${action.y})`);
  await page.mouse.move(action.x + Math.random() * 5, action.y + Math.random() * 5, { steps: 10 });
  await randomDelay(200, 500);
  if (action.type === "click") {
    await page.mouse.click(action.x, action.y);
  } else if (action.type === "type" && action.text) {
    await page.mouse.click(action.x, action.y);
    await randomDelay(100, 300);
    await page.keyboard.type(action.text, { delay: Math.random() * 100 + 50 });
  } else if (action.type === "upload" && action.filePath) {
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.mouse.click(action.x, action.y)
    ]);
    await fileChooser.accept([action.filePath]);
  }
}
async function getFormCoordinates(page, userId, observerModel, callAI2) {
  await logAction(userId, "ai_observer", "\u{1F4F8} Analyzing page layout visually...", "in_progress");
  const screenshot = await capturePageScreenshot(page);
  const prompt = `
    Analyze this screenshot of a job application form. 
    Identify the (x, y) coordinates for the following fields:
    - First Name
    - Last Name
    - Email
    - Phone Number
    - Upload CV/Resume button
    - Submit button
    
    Return ONLY a JSON array of objects:
    [{"field": "first_name", "x": 123, "y": 456}, ...]
    
    The coordinates should be relative to the top-left of the image (1280x800).
  `;
  const response = await callAI2(observerModel, prompt, screenshot);
  try {
    const cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse observer response:", e);
    return [];
  }
}
var import_puppeteer, import_path2, app2, getUserDataDir;
var init_scraper_service = __esm({
  "src/main/scraper-service.ts"() {
    import_puppeteer = __toESM(require("puppeteer"), 1);
    init_database();
    import_path2 = __toESM(require("path"), 1);
    try {
      app2 = require("electron").app;
    } catch (e) {
      app2 = global.electronApp;
    }
    getUserDataDir = () => {
      return import_path2.default.join(app2.getPath("userData"), "browser_data");
    };
  }
});

// src/main/features/doc-generator.ts
var doc_generator_exports = {};
__export(doc_generator_exports, {
  generateSingleDocument: () => generateSingleDocument,
  generateTailoredDocs: () => generateTailoredDocs
});
function generateDocumentHTML(content, docType, userProfile, job) {
  const title = `${docType} - ${(userProfile == null ? void 0 : userProfile.name) || "Applicant"} - ${(job == null ? void 0 : job.company_name) || "Company"}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }
    
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0077b5;
    }
    
    .name {
      font-size: 28px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
    }
    
    .title {
      font-size: 16px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .contact {
      font-size: 13px;
      color: #444;
    }
    
    .contact span {
      margin-right: 15px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .content {
      font-size: 14px;
      text-align: justify;
      white-space: pre-wrap;
    }
    
    .content p {
      margin-bottom: 12px;
    }
    
    .experience-item, .education-item {
      margin-bottom: 15px;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    
    .item-title {
      font-weight: 600;
      font-size: 15px;
    }
    
    .item-company {
      color: #666;
      font-size: 14px;
    }
    
    .item-date {
      color: #888;
      font-size: 13px;
    }
    
    .item-description {
      font-size: 13px;
      color: #444;
      margin-top: 5px;
    }
    
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .skill-tag {
      background: #e3f2fd;
      color: #0077b5;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 12px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #888;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      .footer {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${(userProfile == null ? void 0 : userProfile.name) || "Your Name"}</div>
    <div class="title">${(userProfile == null ? void 0 : userProfile.title) || "Professional Title"}</div>
    <div class="contact">
      ${(userProfile == null ? void 0 : userProfile.email) ? `<span>\u{1F4E7} ${userProfile.email}</span>` : ""}
      ${(userProfile == null ? void 0 : userProfile.phone) ? `<span>\u{1F4F1} ${userProfile.phone}</span>` : ""}
      ${(userProfile == null ? void 0 : userProfile.location) ? `<span>\u{1F4CD} ${userProfile.location}</span>` : ""}
    </div>
  </div>
  
  <div class="section">
    <div class="content">${content.replace(/\n/g, "<br>")}</div>
  </div>
  
  <div class="footer">
    Generated for ${(job == null ? void 0 : job.company_name) || "Company"} - ${(job == null ? void 0 : job.job_title) || "Position"} | ${(/* @__PURE__ */ new Date()).toLocaleDateString()}
  </div>
</body>
</html>`;
}
function generateCVHTML(content, userProfile, job) {
  var _a;
  const experiences = (userProfile == null ? void 0 : userProfile.experiences) || [];
  const educations = (userProfile == null ? void 0 : userProfile.educations) || [];
  const skills = (userProfile == null ? void 0 : userProfile.skills) || [];
  const certifications = (userProfile == null ? void 0 : userProfile.licenses) || [];
  let experiencesHTML = "";
  if (Array.isArray(experiences)) {
    experiencesHTML = experiences.map((exp) => `
      <div class="experience-item">
        <div class="item-header">
          <div>
            <span class="item-title">${exp.title || exp}</span>
            ${exp.company ? `<span class="item-company"> at ${exp.company}</span>` : ""}
          </div>
          <span class="item-date">${exp.startDate || ""} - ${exp.endDate || "Present"}</span>
        </div>
        ${exp.location ? `<div style="color: #666; font-size: 13px;">${exp.location}</div>` : ""}
        ${exp.description ? `<div class="item-description">${exp.description}</div>` : ""}
      </div>
    `).join("");
  }
  let educationsHTML = "";
  if (Array.isArray(educations)) {
    educationsHTML = educations.map((edu) => `
      <div class="education-item">
        <div class="item-header">
          <div>
            <span class="item-title">${edu.degree || edu}</span>
            ${edu.field ? `<span class="item-company"> in ${edu.field}</span>` : ""}
          </div>
          <span class="item-date">${edu.startYear || ""} - ${edu.endYear || ""}</span>
        </div>
        ${edu.school ? `<div style="color: #666; font-size: 13px;">${edu.school}</div>` : ""}
      </div>
    `).join("");
  }
  let skillsHTML = "";
  if (Array.isArray(skills) && skills.length > 0) {
    skillsHTML = `<div class="skills-list">${skills.map((s) => `<span class="skill-tag">${s}</span>`).join("")}</div>`;
  }
  let certsHTML = "";
  if (Array.isArray(certifications) && certifications.length > 0) {
    certsHTML = `<div class="skills-list">${certifications.map((c) => `<span class="skill-tag" style="background: #fff3e0; color: #ef6c00;">${c}</span>`).join("")}</div>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${(userProfile == null ? void 0 : userProfile.name) || "Applicant"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      max-width: 850px;
      margin: 0 auto;
      padding: 30px 40px;
      background: #fff;
    }
    
    .header {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0077b5;
    }
    
    .header-photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #0077b5;
    }
    
    .header-info { flex: 1; }
    .name { font-size: 32px; font-weight: 700; color: #0077b5; }
    .title { font-size: 18px; color: #444; margin: 5px 0; }
    .contact { font-size: 13px; color: #666; display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px; }
    
    .main { display: grid; grid-template-columns: 1fr 300px; gap: 30px; }
    .left-column { }
    .right-column { }
    
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #0077b5;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .summary { font-size: 14px; color: #333; text-align: justify; }
    
    .experience-item, .education-item { margin-bottom: 18px; }
    .item-header { display: flex; justify-content: space-between; flex-wrap: wrap; }
    .item-title { font-weight: 600; font-size: 15px; color: #1a1a1a; }
    .item-company { color: #666; font-size: 14px; }
    .item-date { color: #888; font-size: 12px; }
    .item-description { font-size: 13px; color: #444; margin-top: 5px; }
    
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tag {
      background: #e3f2fd;
      color: #0077b5;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    
    @media print {
      body { padding: 15px; font-size: 12px; }
      .section-title { font-size: 11px; }
      .name { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${(userProfile == null ? void 0 : userProfile.photo) ? `<img src="${userProfile.photo}" class="header-photo" alt="Photo">` : ""}
    <div class="header-info">
      <div class="name">${(userProfile == null ? void 0 : userProfile.name) || "Your Name"}</div>
      <div class="title">${(userProfile == null ? void 0 : userProfile.title) || "Professional Title"}</div>
      <div class="contact">
        ${(userProfile == null ? void 0 : userProfile.email) ? `<span>\u{1F4E7} ${userProfile.email}</span>` : ""}
        ${(userProfile == null ? void 0 : userProfile.phone) ? `<span>\u{1F4F1} ${userProfile.phone}</span>` : ""}
        ${(userProfile == null ? void 0 : userProfile.location) ? `<span>\u{1F4CD} ${userProfile.location}</span>` : ""}
      </div>
    </div>
  </div>
  
  <div class="main">
    <div class="left-column">
      ${(userProfile == null ? void 0 : userProfile.summary) ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${userProfile.summary}</div>
        </div>
      ` : ""}
      
      ${experiencesHTML ? `
        <div class="section">
          <div class="section-title">Work Experience</div>
          ${experiencesHTML}
        </div>
      ` : ""}
      
      ${educationsHTML ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${educationsHTML}
        </div>
      ` : ""}
    </div>
    
    <div class="right-column">
      ${skillsHTML ? `
        <div class="section">
          <div class="section-title">Skills</div>
          ${skillsHTML}
        </div>
      ` : ""}
      
      ${certsHTML ? `
        <div class="section">
          <div class="section-title">Certifications</div>
          ${certsHTML}
        </div>
      ` : ""}
      
      ${((_a = userProfile == null ? void 0 : userProfile.languages) == null ? void 0 : _a.length) > 0 ? `
        <div class="section">
          <div class="section-title">Languages</div>
          <div class="skills-list">
            ${userProfile.languages.map((l) => `<span class="skill-tag" style="background: #e8f5e9; color: #388e3c;">${l}</span>`).join("")}
          </div>
        </div>
      ` : ""}
    </div>
  </div>
</body>
</html>`;
}
function saveDocumentFile(content, jobId, docType, format = "html") {
  const docsDir = getDocsDir();
  const timestamp = Date.now();
  const fileName = `${docType}_job${jobId}_${timestamp}.${format}`;
  const filePath = path3.join(docsDir, fileName);
  fs2.writeFileSync(filePath, content, "utf-8");
  console.log(`Document saved: ${filePath}`);
  return filePath;
}
async function generateTailoredDocs(job, userId, thinker, auditor, options, callAI2) {
  var _a, _b;
  const db = getDatabase();
  const userProfile = ((_a = db.user_profile) == null ? void 0 : _a.find((p) => p.id === userId)) || ((_b = db.user_profile) == null ? void 0 : _b[0]);
  if (!userProfile) {
    await logAction(userId, "ai_thinker", "\u274C No user profile found. Please create your profile first.", "failed", false);
    return;
  }
  let companyResearch = "";
  try {
    await logAction(userId, "ai_thinker", `\u{1F50D} Researching ${job.company_name} mission and history...`, "in_progress");
    companyResearch = await getCompanyInfo(job.company_name, userId, callAI2);
  } catch (e) {
    console.error("Research failed:", e);
    companyResearch = "Research unavailable.";
  }
  for (const type of DOC_TYPES) {
    if (options[type.optionKey]) {
      try {
        await logAction(userId, "ai_thinker", `\u270D\uFE0F Generating tailored ${type.label} for ${job.company_name}`, "in_progress");
        await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "generating" });
        let attempts = 0;
        let approved = false;
        let content = "";
        let feedback = "";
        while (attempts < 2 && !approved) {
          attempts++;
          const thinkerPrompt = buildThinkerPrompt(type.key, type.label, userProfile, job, companyResearch, feedback);
          content = await callAI2(thinker, thinkerPrompt);
          await logAction(userId, "ai_auditor", `\u{1F9D0} Auditing ${type.label} (Attempt ${attempts})`, "in_progress");
          const auditorPrompt = buildAuditorPrompt(type.key, type.label, content, job);
          const auditResponse = await callAI2(auditor, auditorPrompt);
          if (auditResponse.toUpperCase().includes("APPROVED")) {
            approved = true;
            await logAction(userId, "ai_auditor", `\u2705 ${type.label} approved`, "completed", true);
          } else {
            feedback = auditResponse.replace(/REJECTED:/i, "").trim();
            await logAction(userId, "ai_auditor", `\u274C ${type.label} rejected: ${feedback}`, "in_progress", false);
          }
        }
        if (approved) {
          let htmlContent;
          if (type.key === "cv") {
            htmlContent = generateCVHTML(content, userProfile, job);
          } else {
            htmlContent = generateDocumentHTML(content, type.label, userProfile, job);
          }
          const filePath = saveDocumentFile(htmlContent, job.id, type.key, "html");
          const docId = Date.now() + Math.floor(Math.random() * 1e3);
          await runQuery("INSERT INTO documents", {
            id: docId,
            job_id: job.id,
            user_id: userId,
            document_type: type.key,
            content,
            file_path: filePath,
            version: 1,
            status: "final",
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          await runQuery("UPDATE job_listings", {
            id: job.id,
            [`${type.key}_status`]: "auditor_done",
            [`${type.key}_path`]: filePath
          });
          await logAction(userId, "ai_thinker", `\u{1F4C4} ${type.label} saved to: ${filePath}`, "completed", true);
        } else {
          await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "failed" });
          await logAction(userId, "ai_thinker", `\u274C Failed to generate acceptable ${type.label} after 2 attempts`, "failed", false);
        }
      } catch (e) {
        console.error(`Error generating ${type.key}:`, e);
        await runQuery("UPDATE job_listings", { id: job.id, [`${type.key}_status`]: "failed" });
        await logAction(userId, "ai_thinker", `\u274C Error: ${e.message}`, "failed", false);
      }
    }
  }
}
function buildThinkerPrompt(docKey, docLabel, userProfile, job, companyResearch, feedback) {
  const baseContext = `
USER PROFILE:
Name: ${(userProfile == null ? void 0 : userProfile.name) || "N/A"}
Title: ${(userProfile == null ? void 0 : userProfile.title) || "N/A"}
Location: ${(userProfile == null ? void 0 : userProfile.location) || "N/A"}
Email: ${(userProfile == null ? void 0 : userProfile.email) || "N/A"}
Phone: ${(userProfile == null ? void 0 : userProfile.phone) || "N/A"}
Summary: ${(userProfile == null ? void 0 : userProfile.summary) || "N/A"}
Experiences: ${JSON.stringify((userProfile == null ? void 0 : userProfile.experiences) || [])}
Skills: ${JSON.stringify((userProfile == null ? void 0 : userProfile.skills) || [])}
Education: ${JSON.stringify((userProfile == null ? void 0 : userProfile.educations) || [])}
Certifications: ${JSON.stringify((userProfile == null ? void 0 : userProfile.licenses) || [])}
Languages: ${JSON.stringify((userProfile == null ? void 0 : userProfile.languages) || [])}

JOB DETAILS:
Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || "N/A"}
Type: ${job.job_type || "N/A"}
Description: ${job.description || "N/A"}
Required Skills: ${job.required_skills || "N/A"}

COMPANY RESEARCH:
${companyResearch}

${feedback ? `PREVIOUS FEEDBACK FROM AUDITOR: ${feedback}
Please fix these issues in the new version.` : ""}
`;
  const prompts = {
    cv: `You are a professional CV/Resume writer. Create a tailored CV for this job application.

${baseContext}

REQUIREMENTS:
1. Tailor the CV specifically to the job requirements
2. Highlight relevant experiences and skills that match the job description
3. Use action verbs and quantify achievements where possible
4. Keep it ATS-friendly (no tables, columns, graphics)
5. Include contact information at the top
6. Language: Match the job description language

OUTPUT FORMAT: Return ONLY the CV content in clean text format (not HTML). Use clear headings.`,
    motivation_letter: `You are an expert Motivation Letter writer. Create a compelling, HUMAN-SOUNDING motivation letter.

${baseContext}

NEGATIVE PROMPT (DO NOT USE):
- Clich\xE9s: "I am thrilled to apply", "In today's fast-paced world", "I am a passionate professional"
- AI Structures: Repetitive "I have..." or "My experience..." at the start of every sentence
- Long hyphens (\u2014), use standard dashes (-) if needed
- Bullet points - write in paragraph form

STRUCTURE (follow exactly):
1. CLEAR PURPOSE: State intent upfront. Who are you and why are you writing?
2. RESEARCH: Reference specific facts from the company research (Mission, History, News)
3. ALIGNMENT: Connect your personal goals to their mission
4. QUALIFICATIONS: Highlight 2-3 key achievements with METRICS
5. PASSION: Why this role? Why are you the best candidate?
6. CLOSING: Professional sign-off, thank the reader

MUST ANSWER 3 QUESTIONS:
- Why this company?
- Why this role?
- Why am I the best candidate?

Language: Match the job description language.
Length: One page maximum (300-400 words).

Return ONLY the motivation letter content.`,
    cover_letter: `You are an expert Cover Letter writer. Create a concise, professional cover letter.

${baseContext}

REQUIREMENTS:
1. Be concise (250-300 words)
2. Address the hiring manager professionally
3. Highlight 2-3 most relevant qualifications
4. Show enthusiasm for the specific role
5. Include a clear call to action
6. No clich\xE9s or AI-sounding phrases
7. Language: Match the job description

STRUCTURE:
- Opening: State the position and where you found it
- Middle: Your relevant qualifications and why you're a great fit
- Closing: Thank them and suggest next steps

Return ONLY the cover letter content.`,
    portfolio: `You are a Portfolio Description writer. Create a portfolio summary for this job application.

${baseContext}

REQUIREMENTS:
1. Highlight 3-5 most relevant projects or achievements
2. For each project:
   - Brief description (2-3 sentences)
   - Technologies/skills used
   - Measurable impact/results
3. Tailor selection to the job requirements
4. Include links placeholders [Project Link] where appropriate

Return ONLY the portfolio description content.`,
    proposal: `You are a professional Proposal writer. Create a proposal for this job application.

${baseContext}

REQUIREMENTS:
1. Executive Summary: What you propose to do for them
2. Understanding: Show you understand their challenges
3. Approach: How you would tackle the role
4. Value Proposition: What unique value you bring
5. Next Steps: Suggest a meeting or discussion
6. Professional tone, business-focused

Return ONLY the proposal content.`
  };
  return prompts[docKey] || prompts["motivation_letter"];
}
function buildAuditorPrompt(docKey, docLabel, content, job) {
  return `You are the "Auditor" agent. Review this ${docLabel} for accuracy and quality.

JOB: ${job.job_title} at ${job.company_name}

CONTENT TO REVIEW:
${content}

EVALUATION CRITERIA:
1. LANGUAGE: Is it in the same language as the job description?
2. HUMAN-LIKE: Does it avoid AI clich\xE9s (thrilled, passionate, fast-paced world)?
3. NO LONG HYPHENS: Are there any \u2014 characters? (Should use - instead)
4. CONTACT INFO: Is the applicant's contact info included?
5. ATS FRIENDLY: Is the structure clear and professional?
6. TAILORED: Does it specifically reference the company and role?
7. QUANTIFIED: Are achievements quantified where possible?
8. NO PLACEHOLDERS: Are there any "[Insert...]", "XYZ", or "N/A" in critical fields?
9. LENGTH: Is it appropriate (motivation/cover letters: 1 page)?

RESPONSE FORMAT:
If it passes ALL criteria, respond with exactly: "APPROVED"
If it fails any criteria, respond with: "REJECTED: " followed by specific feedback on what to fix.`;
}
async function generateSingleDocument(jobId, userId, docType, thinker, auditor, callAI2) {
  var _a, _b, _c, _d;
  const db = getDatabase();
  const job = (_a = db.job_listings) == null ? void 0 : _a.find((j) => j.id === jobId);
  const userProfile = ((_b = db.user_profile) == null ? void 0 : _b.find((p) => p.id === userId)) || ((_c = db.user_profile) == null ? void 0 : _c[0]);
  if (!job) return { success: false, error: "Job not found" };
  if (!userProfile) return { success: false, error: "User profile not found" };
  const options = {};
  const typeConfig = DOC_TYPES.find((t) => t.key === docType);
  if (typeConfig) {
    options[typeConfig.optionKey] = true;
  }
  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI2);
  const updatedJob = (_d = db.job_listings) == null ? void 0 : _d.find((j) => j.id === jobId);
  const filePath = updatedJob == null ? void 0 : updatedJob[`${docType}_path`];
  if (filePath) {
    return { success: true, filePath };
  }
  return { success: false, error: "Document generation failed" };
}
var fs2, path3, app3, getDocsDir, DOC_TYPES;
var init_doc_generator = __esm({
  "src/main/features/doc-generator.ts"() {
    init_database();
    init_scraper_service();
    fs2 = __toESM(require("fs"), 1);
    path3 = __toESM(require("path"), 1);
    try {
      app3 = require("electron").app;
    } catch (e) {
      app3 = global.electronApp;
    }
    getDocsDir = () => {
      const docsPath = path3.join(app3.getPath("userData"), "generated_docs");
      if (!fs2.existsSync(docsPath)) {
        fs2.mkdirSync(docsPath, { recursive: true });
      }
      return docsPath;
    };
    DOC_TYPES = [
      { key: "cv", label: "CV", optionKey: "cv" },
      { key: "motivation_letter", label: "Motivation Letter", optionKey: "motivationLetter" },
      { key: "cover_letter", label: "Cover Letter", optionKey: "coverLetter" },
      { key: "portfolio", label: "Portfolio", optionKey: "portfolio" },
      { key: "proposal", label: "Proposal", optionKey: "proposal" }
    ];
  }
});

// src/main/features/secretary-service.ts
async function monitorConfirmations(userId) {
  const configRes = await getAllQuery("SELECT * FROM email_config");
  const config = configRes[0];
  if (!config || !config.email_user || !config.email_password) return;
  const confirmation = await performImapSearch(config, ["UNSEEN"], (text, subject) => {
    const keywords = ["application received", "thank you for applying", "confirmation", "received your application"];
    const combined = (text + " " + subject).toLowerCase();
    if (keywords.some((k) => combined.includes(k))) {
      return { subject, snippet: text.substring(0, 200) };
    }
    return null;
  });
  if (confirmation) {
    await logAction(userId, "ai_secretary", `\u{1F4EC} Received confirmation: ${confirmation.subject}`, "completed", true);
    await runQuery("INSERT INTO email_alerts", {
      user_id: userId,
      alert_type: "confirmation",
      subject: confirmation.subject,
      snippet: confirmation.snippet,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
async function performImapSearch(config, criteria, extractor) {
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
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          console.error("IMAP: Could not open inbox", err);
          imap.end();
          resolve(null);
          return;
        }
        imap.search(criteria, (err2, results) => {
          if (err2 || !results || results.length === 0) {
            imap.end();
            resolve(null);
            return;
          }
          const f = imap.fetch(results[results.length - 1], { bodies: "" });
          f.on("message", (msg) => {
            msg.on("body", async (stream) => {
              const parsed = await (0, import_mailparser.simpleParser)(stream);
              const result = extractor(parsed.text || "", parsed.subject || "");
              resolve(result);
            });
          });
          f.once("end", () => imap.end());
        });
      });
    });
    imap.once("error", (err) => {
      console.error("IMAP Connection Error:", err);
      resolve(null);
    });
    imap.connect();
  });
}
var import_imap, import_mailparser;
var init_secretary_service = __esm({
  "src/main/features/secretary-service.ts"() {
    import_imap = __toESM(require("imap"), 1);
    import_mailparser = require("mailparser");
    init_database();
  }
});

// src/main/features/scheduler.ts
var scheduler_exports = {};
__export(scheduler_exports, {
  setSchedulerEnabled: () => setSchedulerEnabled,
  startHuntingScheduler: () => startHuntingScheduler
});
function setSchedulerEnabled(enabled) {
  schedulerEnabled = enabled;
  console.log(`Scheduler: ${enabled ? "ENABLED" : "DISABLED"}`);
}
function startHuntingScheduler(userId, startHunterSearch3, callAI2) {
  return setInterval(async () => {
    const db = getDatabase();
    const settings = db.settings[0];
    if (!settings || settings.job_hunting_active !== 1) {
      return;
    }
    if (!schedulerEnabled) {
      console.log("Scheduler: Skipping - not explicitly enabled");
      return;
    }
    const websites = db.job_websites.filter((w) => w.is_active === 1);
    const now = /* @__PURE__ */ new Date();
    for (const website of websites) {
      const lastChecked = website.last_checked ? new Date(website.last_checked) : /* @__PURE__ */ new Date(0);
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1e3 * 60 * 60);
      const frequency = website.site_type === "career_page" ? 24 : website.check_frequency || 4;
      if (hoursSinceLastCheck >= frequency) {
        console.log(`Scheduler: Checking ${website.website_name}...`);
        await startHunterSearch3(userId, callAI2);
        await runQuery("UPDATE job_websites", { id: website.id, last_checked: now.toISOString() });
      }
    }
    try {
      await monitorConfirmations(userId);
    } catch (e) {
      console.error("Scheduler: Secretary monitoring failed", e);
    }
  }, 6e4);
}
var schedulerEnabled;
var init_scheduler = __esm({
  "src/main/features/scheduler.ts"() {
    init_database();
    init_secretary_service();
    schedulerEnabled = false;
  }
});

// src/main/features/linkedin-scraper.ts
var linkedin_scraper_exports = {};
__export(linkedin_scraper_exports, {
  closeLinkedInBrowser: () => closeLinkedInBrowser,
  openLinkedInForLogin: () => openLinkedInForLogin,
  saveLinkedInProfile: () => saveLinkedInProfile,
  scrapeLinkedInProfile: () => scrapeLinkedInProfile
});
async function openLinkedInForLogin(userId) {
  try {
    await logAction(userId, "linkedin", "\u{1F517} Opening LinkedIn for login...", "in_progress");
    const browser = await import_puppeteer3.default.launch({
      headless: false,
      userDataDir: getUserDataDir2(),
      args: ["--no-sandbox", "--start-maximized", "--disable-blink-features=AutomationControlled"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    await page.goto("https://www.linkedin.com/login", { waitUntil: "networkidle2" });
    global.linkedInBrowser = browser;
    global.linkedInPage = page;
    await logAction(userId, "linkedin", "\u2705 LinkedIn opened. Please login manually.", "completed", true);
    return {
      success: true,
      message: 'LinkedIn opened. Please login manually, then click "Capture Profile".'
    };
  } catch (error) {
    await logAction(userId, "linkedin", `\u274C Error: ${error.message}`, "failed", false);
    return { success: false, message: error.message };
  }
}
async function scrapeLinkedInProfile(userId, profileUrl) {
  let browser = global.linkedInBrowser;
  let page = global.linkedInPage;
  let shouldCloseBrowser = false;
  try {
    await logAction(userId, "linkedin", "\u{1F50D} Starting LinkedIn profile capture...", "in_progress");
    if (!browser || !page) {
      browser = await import_puppeteer3.default.launch({
        headless: false,
        userDataDir: getUserDataDir2(),
        args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
      });
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      shouldCloseBrowser = true;
    }
    if (profileUrl) {
      await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    } else {
      await page.goto("https://www.linkedin.com/in/me/", { waitUntil: "networkidle2", timeout: 6e4 });
    }
    await page.waitForSelector(".pv-top-card", { timeout: 3e4 }).catch(() => {
    });
    await new Promise((r) => setTimeout(r, 2e3 + Math.random() * 2e3));
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise((r) => setTimeout(r, 1e3));
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise((r) => setTimeout(r, 1e3));
    const profileData = await page.evaluate(() => {
      const getText = (selector) => {
        var _a, _b;
        return ((_b = (_a = document.querySelector(selector)) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || "";
      };
      const getAttr = (selector, attr) => {
        var _a;
        return ((_a = document.querySelector(selector)) == null ? void 0 : _a.getAttribute(attr)) || "";
      };
      const name = getText(".pv-top-card--list li:first-child") || getText("h1.text-heading-xlarge") || getText(".pv-text-details__left-panel h1");
      const title = getText(".pv-top-card--list-bullet li:first-child") || getText(".text-body-medium.break-words") || "";
      const location = getText(".pv-top-card--list-bullet li:last-child") || getText(".text-body-small.inline.t-black--light.break-words") || "";
      const photo = getAttr(".pv-top-card-profile-picture__image", "src") || getAttr("img.pv-top-card-profile-picture__image--show", "src") || "";
      const summary = getText(".pv-about-section .pv-about__summary-text") || getText("#about ~ .display-flex .full-width") || "";
      const experiences = [];
      document.querySelectorAll("#experience ~ .pvs-list__outer-container > ul > li").forEach((li) => {
        var _a, _b;
        const titleEl = li.querySelector('.t-bold span[aria-hidden="true"]') || li.querySelector(".mr1.t-bold span");
        const companyEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]') || li.querySelector(".t-14.t-normal");
        const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        const descEl = li.querySelector('.pvs-list__outer-container .t-14.t-normal.t-black span[aria-hidden="true"]');
        if (titleEl) {
          const fullText = (companyEl == null ? void 0 : companyEl.textContent) || "";
          const [company, ...locationParts] = fullText.split("\xB7").map((s) => s.trim());
          const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
          const dateMatch = datesText.match(/(\w+ \d{4})\s*[-–]\s*(\w+ \d{4}|Present)/i);
          experiences.push({
            title: ((_a = titleEl.textContent) == null ? void 0 : _a.trim()) || "",
            company: company || "",
            location: locationParts.join(" ").trim(),
            startDate: (dateMatch == null ? void 0 : dateMatch[1]) || "",
            endDate: (dateMatch == null ? void 0 : dateMatch[2]) || "",
            description: ((_b = descEl == null ? void 0 : descEl.textContent) == null ? void 0 : _b.trim()) || ""
          });
        }
      });
      const educations = [];
      document.querySelectorAll("#education ~ .pvs-list__outer-container > ul > li").forEach((li) => {
        var _a;
        const schoolEl = li.querySelector('.t-bold span[aria-hidden="true"]');
        const degreeEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
        if (schoolEl) {
          const degreeText = (degreeEl == null ? void 0 : degreeEl.textContent) || "";
          const [degree, field] = degreeText.split(",").map((s) => s.trim());
          const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
          const yearMatch = datesText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
          educations.push({
            school: ((_a = schoolEl.textContent) == null ? void 0 : _a.trim()) || "",
            degree: degree || "",
            field: field || "",
            startYear: (yearMatch == null ? void 0 : yearMatch[1]) || "",
            endYear: (yearMatch == null ? void 0 : yearMatch[2]) || ""
          });
        }
      });
      const skills = [];
      document.querySelectorAll('#skills ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach((el) => {
        var _a;
        const skill = (_a = el.textContent) == null ? void 0 : _a.trim();
        if (skill && !skills.includes(skill)) skills.push(skill);
      });
      const licenses = [];
      document.querySelectorAll('#licenses_and_certifications ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach((el) => {
        var _a;
        const license = (_a = el.textContent) == null ? void 0 : _a.trim();
        if (license && !licenses.includes(license)) licenses.push(license);
      });
      const languages = [];
      document.querySelectorAll('#languages ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach((el) => {
        var _a;
        const lang = (_a = el.textContent) == null ? void 0 : _a.trim();
        if (lang && !languages.includes(lang)) languages.push(lang);
      });
      return { name, title, location, photo, summary, experiences, educations, skills, licenses, languages };
    });
    await logAction(userId, "linkedin", `\u2705 Profile captured: ${profileData.name}`, "completed", true);
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
    return { success: true, data: profileData };
  } catch (error) {
    console.error("LinkedIn scrape error:", error);
    await logAction(userId, "linkedin", `\u274C Capture failed: ${error.message}`, "failed", false);
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
    return { success: false, error: error.message };
  }
}
async function saveLinkedInProfile(userId, profileData) {
  try {
    const db = getDatabase();
    const existingProfile = db.user_profile.find((p) => p.id === userId) || db.user_profile[0];
    const profileToSave = {
      id: (existingProfile == null ? void 0 : existingProfile.id) || userId,
      name: profileData.name,
      title: profileData.title,
      location: profileData.location,
      photo: profileData.photo,
      summary: profileData.summary,
      experiences: JSON.stringify(profileData.experiences),
      educations: JSON.stringify(profileData.educations),
      skills: JSON.stringify(profileData.skills),
      licenses: JSON.stringify(profileData.licenses),
      languages: JSON.stringify(profileData.languages),
      linkedin_imported: true,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingProfile) {
      await runQuery("UPDATE user_profile", profileToSave);
    } else {
      await runQuery("INSERT INTO user_profile", profileToSave);
    }
    await logAction(userId, "linkedin", `\u{1F4BE} Profile saved to database`, "completed", true);
    return { success: true };
  } catch (error) {
    console.error("Save profile error:", error);
    return { success: false };
  }
}
async function closeLinkedInBrowser() {
  const browser = global.linkedInBrowser;
  if (browser) {
    await browser.close();
    global.linkedInBrowser = null;
    global.linkedInPage = null;
  }
}
var import_puppeteer3, import_path4, app5, getUserDataDir2;
var init_linkedin_scraper = __esm({
  "src/main/features/linkedin-scraper.ts"() {
    import_puppeteer3 = __toESM(require("puppeteer"), 1);
    init_database();
    import_path4 = __toESM(require("path"), 1);
    try {
      app5 = require("electron").app;
    } catch (e) {
      app5 = global.electronApp;
    }
    getUserDataDir2 = () => import_path4.default.join(app5.getPath("userData"), "browser_data");
  }
});

// src/main/features/pdf-export.ts
var pdf_export_exports = {};
__export(pdf_export_exports, {
  convertAllJobDocsToPdf: () => convertAllJobDocsToPdf,
  convertHtmlToPdf: () => convertHtmlToPdf,
  generatePdfFromContent: () => generatePdfFromContent
});
async function convertHtmlToPdf(htmlPath, userId) {
  let browser = null;
  try {
    await logAction(userId, "pdf", `\u{1F4C4} Converting to PDF: ${path6.basename(htmlPath)}`, "in_progress");
    if (!fs3.existsSync(htmlPath)) {
      return { success: false, error: "HTML file not found" };
    }
    const htmlContent = fs3.readFileSync(htmlPath, "utf-8");
    browser = await import_puppeteer4.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const pdfPath = htmlPath.replace(".html", ".pdf");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm"
      }
    });
    await browser.close();
    await logAction(userId, "pdf", `\u2705 PDF created: ${path6.basename(pdfPath)}`, "completed", true);
    return { success: true, pdfPath };
  } catch (error) {
    console.error("PDF conversion error:", error);
    if (browser) await browser.close();
    await logAction(userId, "pdf", `\u274C PDF conversion failed: ${error.message}`, "failed", false);
    return { success: false, error: error.message };
  }
}
async function convertAllJobDocsToPdf(jobId, userId) {
  var _a;
  const db = getDatabase();
  const job = (_a = db.job_listings) == null ? void 0 : _a.find((j) => j.id === jobId);
  if (!job) {
    return { success: false, pdfs: [], errors: ["Job not found"] };
  }
  const docTypes = ["cv", "motivation_letter", "cover_letter", "portfolio", "proposal"];
  const pdfs = [];
  const errors = [];
  for (const docType of docTypes) {
    const htmlPath = job[`${docType}_path`];
    if (htmlPath && fs3.existsSync(htmlPath)) {
      const result = await convertHtmlToPdf(htmlPath, userId);
      if (result.success && result.pdfPath) {
        pdfs.push(result.pdfPath);
      } else if (result.error) {
        errors.push(`${docType}: ${result.error}`);
      }
    }
  }
  return { success: pdfs.length > 0, pdfs, errors };
}
async function generatePdfFromContent(content, fileName, userId, options) {
  let browser = null;
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${(options == null ? void 0 : options.title) || "Document"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 0;
      background: #fff;
    }
    
    .header {
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #0077b5;
    }
    
    .name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 3px;
    }
    
    .title {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .contact {
      font-size: 11px;
      color: #444;
    }
    
    .content {
      font-size: 12px;
      text-align: justify;
      white-space: pre-wrap;
      line-height: 1.7;
    }
    
    .content p {
      margin-bottom: 10px;
    }
    
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
  </style>
</head>
<body>
  ${(options == null ? void 0 : options.headerName) ? `
  <div class="header">
    <div class="name">${options.headerName}</div>
    ${options.headerTitle ? `<div class="title">${options.headerTitle}</div>` : ""}
    ${options.headerContact ? `<div class="contact">${options.headerContact}</div>` : ""}
  </div>
  ` : ""}
  
  <div class="content">${content.replace(/\n/g, "<br>")}</div>
</body>
</html>`;
    browser = await import_puppeteer4.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const pdfPath = path6.join(getDocsDir2(), `${fileName}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" }
    });
    await browser.close();
    await logAction(userId, "pdf", `\u2705 PDF generated: ${fileName}.pdf`, "completed", true);
    return { success: true, pdfPath };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}
var import_puppeteer4, fs3, path6, app6, getDocsDir2;
var init_pdf_export = __esm({
  "src/main/features/pdf-export.ts"() {
    import_puppeteer4 = __toESM(require("puppeteer"), 1);
    fs3 = __toESM(require("fs"), 1);
    path6 = __toESM(require("path"), 1);
    init_database();
    try {
      app6 = require("electron").app;
    } catch (e) {
      app6 = global.electronApp;
    }
    getDocsDir2 = () => {
      const docsPath = path6.join(app6.getPath("userData"), "generated_docs");
      if (!fs3.existsSync(docsPath)) {
        fs3.mkdirSync(docsPath, { recursive: true });
      }
      return docsPath;
    };
  }
});

// src/main/features/smart-applicant.ts
var smart_applicant_exports = {};
__export(smart_applicant_exports, {
  cancelApplication: () => cancelApplication,
  continueApplicationWithAnswers: () => continueApplicationWithAnswers,
  deleteQuestion: () => deleteQuestion,
  getAllQuestions: () => getAllQuestions,
  submitApplication: () => submitApplication2,
  updateQuestionAnswer: () => updateQuestionAnswer
});
async function findSimilarAnswer(question, category) {
  const db = getDatabase();
  const questions = db.questions || [];
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(/\s+/).filter((w) => w.length > 3);
  for (const q of questions) {
    if (q.category === category) {
      const storedLower = q.question.toLowerCase();
      const matchCount = keywords.filter((k) => storedLower.includes(k)).length;
      if (matchCount >= keywords.length * 0.5) {
        return q.answer;
      }
    }
  }
  return null;
}
async function saveQuestionAnswer(question, answer, category, jobId) {
  const db = getDatabase();
  const existingIndex = db.questions.findIndex(
    (q) => q.question.toLowerCase() === question.toLowerCase()
  );
  if (existingIndex >= 0) {
    db.questions[existingIndex].answer = answer;
    db.questions[existingIndex].updated_at = (/* @__PURE__ */ new Date()).toISOString();
  } else {
    db.questions.push({
      id: Date.now(),
      job_id: jobId,
      question,
      answer,
      category,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  await runQuery("UPDATE settings", { id: 1, last_qa_update: (/* @__PURE__ */ new Date()).toISOString() });
}
async function getAllQuestions() {
  const db = getDatabase();
  return db.questions || [];
}
async function updateQuestionAnswer(questionId, newAnswer) {
  const db = getDatabase();
  const index = db.questions.findIndex((q) => q.id === questionId);
  if (index >= 0) {
    db.questions[index].answer = newAnswer;
    db.questions[index].updated_at = (/* @__PURE__ */ new Date()).toISOString();
    await runQuery("UPDATE settings", { id: 1, last_qa_update: (/* @__PURE__ */ new Date()).toISOString() });
    return { success: true };
  }
  return { success: false };
}
async function deleteQuestion(questionId) {
  const db = getDatabase();
  const initialLength = db.questions.length;
  db.questions = db.questions.filter((q) => q.id !== questionId);
  if (db.questions.length < initialLength) {
    await runQuery("UPDATE settings", { id: 1, last_qa_update: (/* @__PURE__ */ new Date()).toISOString() });
    return { success: true };
  }
  return { success: false };
}
async function analyzeFormFields(page, observerModel, callAI2) {
  const screenshot = await page.screenshot({ encoding: "base64" });
  const formInfo = await page.evaluate(() => {
    var _a;
    const fields = [];
    document.querySelectorAll("input, select, textarea").forEach((el) => {
      var _a2, _b;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const label = ((_b = (_a2 = el.labels) == null ? void 0 : _a2[0]) == null ? void 0 : _b.textContent) || el.placeholder || el.name || el.id || el.getAttribute("aria-label") || "";
        fields.push({
          type: el.type || el.tagName.toLowerCase(),
          name: el.name,
          id: el.id,
          label: label.trim(),
          required: el.required,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          options: el.tagName === "SELECT" ? Array.from(el.options).map((o) => o.text) : void 0
        });
      }
    });
    document.querySelectorAll('input[type="file"], button[class*="upload"], [data-testid*="upload"]').forEach((el) => {
      var _a2;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        fields.push({
          type: "file",
          label: ((_a2 = el.textContent) == null ? void 0 : _a2.trim()) || "Upload",
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    });
    const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button[class*="submit"], button:contains("Submit"), button:contains("Apply")');
    if (submitBtn) {
      const rect = submitBtn.getBoundingClientRect();
      fields.push({
        type: "submit",
        label: ((_a = submitBtn.textContent) == null ? void 0 : _a.trim()) || "Submit",
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
    return fields;
  });
  if (observerModel && callAI2) {
    try {
      const prompt = `Analyze this job application form screenshot. Identify all form fields and their purpose.
      
Return a JSON array of objects with:
- field: field name/purpose (e.g., "first_name", "email", "resume_upload", "cover_letter", "salary_expectation")
- type: input type (text, email, file, select, textarea, checkbox, submit)
- required: true/false
- x: approximate x coordinate (0-1280)
- y: approximate y coordinate (0-800)
- question: if this is a question that needs user input (e.g., "What are your salary expectations?")
- category: personal|experience|availability|salary|visa|education|skills|other

Current DOM fields detected: ${JSON.stringify(formInfo.slice(0, 10))}`;
      const response = await callAI2(observerModel, prompt, `data:image/png;base64,${screenshot}`);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiFields = JSON.parse(jsonMatch[0]);
        return [...formInfo, ...aiFields.filter((f) => !formInfo.find(
          (df) => Math.abs(df.x - f.x) < 50 && Math.abs(df.y - f.y) < 50
        ))];
      }
    } catch (e) {
      console.log("AI field analysis failed, using DOM only");
    }
  }
  return formInfo;
}
function mapProfileToField(fieldLabel, fieldType, userProfile) {
  var _a, _b, _c, _d, _e, _f;
  const label = fieldLabel.toLowerCase();
  if (label.includes("first name") || label === "firstname" || label === "vorname") {
    return ((_a = userProfile.name) == null ? void 0 : _a.split(" ")[0]) || "";
  }
  if (label.includes("last name") || label === "lastname" || label === "nachname" || label.includes("surname")) {
    return ((_b = userProfile.name) == null ? void 0 : _b.split(" ").slice(1).join(" ")) || "";
  }
  if (label.includes("full name") || label === "name") {
    return userProfile.name || "";
  }
  if (label.includes("email") || label.includes("e-mail")) {
    return userProfile.email || "";
  }
  if (label.includes("phone") || label.includes("tel") || label.includes("mobile")) {
    return userProfile.phone || "";
  }
  if (label.includes("city") || label.includes("stadt")) {
    return ((_d = (_c = userProfile.location) == null ? void 0 : _c.split(",")[0]) == null ? void 0 : _d.trim()) || "";
  }
  if (label.includes("country") || label.includes("land")) {
    return ((_f = (_e = userProfile.location) == null ? void 0 : _e.split(",").pop()) == null ? void 0 : _f.trim()) || "";
  }
  if (label.includes("address") || label.includes("location") || label.includes("adresse")) {
    return userProfile.location || "";
  }
  if (label.includes("current title") || label.includes("job title") || label.includes("position")) {
    return userProfile.title || "";
  }
  if (label.includes("linkedin")) {
    return userProfile.linkedin_url || "";
  }
  if (label.includes("website") || label.includes("portfolio")) {
    return userProfile.website || "";
  }
  if (label.includes("summary") || label.includes("about") || label.includes("introduction")) {
    return userProfile.summary || "";
  }
  return null;
}
function categorizeField(label) {
  const l = label.toLowerCase();
  if (l.includes("salary") || l.includes("compensation") || l.includes("gehalt")) return "salary";
  if (l.includes("visa") || l.includes("work permit") || l.includes("authorization")) return "visa";
  if (l.includes("experience") || l.includes("years") || l.includes("erfahrung")) return "experience";
  if (l.includes("education") || l.includes("degree") || l.includes("university")) return "education";
  if (l.includes("available") || l.includes("start date") || l.includes("notice")) return "availability";
  if (l.includes("skill") || l.includes("proficiency") || l.includes("language")) return "skills";
  if (l.includes("name") || l.includes("email") || l.includes("phone") || l.includes("address")) return "personal";
  return "other";
}
async function submitApplication2(jobId, userId, observerModel, callAI2) {
  console.log(`
========== SMART APPLICATION SUBMISSION FOR JOB ${jobId} ==========`);
  let browser = null;
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    const userProfile = db.user_profile.find((p) => p.id === userId) || db.user_profile[0];
    if (!job) {
      return { success: false, status: "failed", error: "Job not found" };
    }
    if (!userProfile) {
      return { success: false, status: "failed", error: "User profile not found. Please create your profile first." };
    }
    const applicationUrl = job.application_url || job.url;
    if (!applicationUrl) {
      return { success: false, status: "failed", error: "No application URL found" };
    }
    await logAction(userId, "ai_applicant", `\u{1F680} Starting smart application for ${job.company_name}`, "in_progress");
    const appState = {
      jobId,
      userId,
      status: "started",
      currentStep: "Opening application page",
      pendingQuestions: []
    };
    activeApplications.set(jobId, appState);
    browser = await import_puppeteer5.default.launch({
      headless: false,
      userDataDir: getUserDataDir3(),
      args: ["--no-sandbox", "--start-maximized", "--disable-blink-features=AutomationControlled"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    });
    appState.browser = browser;
    appState.page = page;
    await logAction(userId, "ai_applicant", `\u{1F4C4} Opening: ${applicationUrl}`, "in_progress");
    await page.goto(applicationUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    await new Promise((r) => setTimeout(r, 2e3 + Math.random() * 2e3));
    const needsAuth = await checkIfNeedsAuthentication(page);
    if (needsAuth.needsLogin) {
      await logAction(userId, "ai_applicant", "\u{1F511} Login required. Attempting to login...", "in_progress");
      const loginResult = await handleLogin(page, userId, userProfile, callAI2);
      if (!loginResult.success) {
        if (loginResult.needsRegistration) {
          await logAction(userId, "ai_applicant", "\u{1F4DD} Registration required...", "in_progress");
          const regResult = await handleRegistration(page, userId, userProfile, callAI2);
          if (!regResult.success) {
            return { success: false, status: "failed", error: "Registration failed: " + regResult.error };
          }
        } else {
          return { success: false, status: "failed", error: "Login failed: " + loginResult.error };
        }
      }
    }
    appState.status = "form_filling";
    await logAction(userId, "ai_applicant", "\u{1F4DD} Analyzing application form...", "in_progress");
    const formFields = await analyzeFormFields(page, observerModel, callAI2);
    console.log(`Found ${formFields.length} form fields`);
    const pendingQuestions = [];
    for (const field of formFields) {
      if (field.type === "submit") continue;
      let value = mapProfileToField(field.label, field.type, userProfile);
      if (!value && field.label) {
        const category = categorizeField(field.label);
        value = await findSimilarAnswer(field.label, category);
        if (value) {
          await logAction(userId, "ai_applicant", `\u{1F4A1} Found answer from Q&A database for "${field.label}"`, "in_progress");
        }
      }
      if (field.type === "file") {
        const uploadResult = await handleFileUpload(page, field, jobId, userId);
        if (!uploadResult.success) {
          await logAction(userId, "ai_applicant", `\u26A0\uFE0F File upload issue: ${uploadResult.error}`, "in_progress");
        }
        continue;
      }
      if (value) {
        await fillField(page, field, value);
        await logAction(userId, "ai_applicant", `\u2713 Filled: ${field.label}`, "in_progress");
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
      } else if (field.required || field.question) {
        const category = categorizeField(field.label);
        pendingQuestions.push({
          field: field.name || field.id || field.label,
          label: field.label,
          question: field.question || `What is your ${field.label}?`,
          type: field.type,
          category,
          options: field.options,
          x: field.x,
          y: field.y
        });
      }
    }
    if (pendingQuestions.length > 0) {
      appState.status = "questions_pending";
      appState.pendingQuestions = pendingQuestions;
      await logAction(userId, "ai_applicant", `\u2753 ${pendingQuestions.length} questions need your input`, "in_progress");
      return {
        success: true,
        status: "questions_pending",
        pendingQuestions
      };
    }
    appState.status = "uploading";
    await logAction(userId, "ai_applicant", "\u{1F4CE} Uploading application documents...", "in_progress");
    appState.status = "reviewing";
    await logAction(userId, "ai_applicant", "\u{1F50D} Final review before submission...", "in_progress");
    const reviewScreenshot = await page.screenshot({ encoding: "base64" });
    const submitBtn = formFields.find((f) => f.type === "submit");
    if (submitBtn) {
      await page.mouse.click(submitBtn.x, submitBtn.y);
      await new Promise((r) => setTimeout(r, 3e3));
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      const isSuccess = pageText.includes("thank you") || pageText.includes("submitted") || pageText.includes("application received") || pageText.includes("erfolgreich");
      if (isSuccess) {
        appState.status = "submitted";
        await logAction(userId, "ai_applicant", `\u2705 Application submitted successfully to ${job.company_name}!`, "completed", true);
        await runQuery("UPDATE job_listings", { id: jobId, status: "applied" });
        monitorConfirmations(userId).catch(console.error);
        return { success: true, status: "submitted" };
      }
    }
    return {
      success: true,
      status: "review_needed",
      pendingQuestions: [{
        field: "manual_submit",
        question: "Please review the form and click Submit manually. The form appears ready.",
        type: "action"
      }]
    };
  } catch (error) {
    console.error("Application submission error:", error);
    await logAction(userId, "ai_applicant", `\u274C Application failed: ${error.message}`, "failed", false);
    return { success: false, status: "failed", error: error.message };
  } finally {
    setTimeout(async () => {
      var _a;
      if (browser && ((_a = activeApplications.get(jobId)) == null ? void 0 : _a.status) === "submitted") {
        await browser.close();
        activeApplications.delete(jobId);
      }
    }, 3e4);
  }
}
async function continueApplicationWithAnswers(jobId, userId, answers) {
  const appState = activeApplications.get(jobId);
  if (!appState || !appState.page) {
    return { success: false, status: "failed", error: "Application session expired. Please start again." };
  }
  try {
    const page = appState.page;
    for (const ans of answers) {
      const pendingQ = appState.pendingQuestions.find((q) => q.field === ans.field);
      if (pendingQ) {
        await fillField(page, pendingQ, ans.answer);
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
        if (ans.saveForLater) {
          await saveQuestionAnswer(
            pendingQ.question || pendingQ.label,
            ans.answer,
            pendingQ.category || "other",
            jobId
          );
          await logAction(userId, "ai_applicant", `\u{1F4BE} Saved answer for future use: "${pendingQ.label}"`, "in_progress");
        }
      }
    }
    appState.pendingQuestions = [];
    const db = getDatabase();
    const models = await getAllQuery("SELECT * FROM ai_models");
    const observer = models.find((m) => m.role === "Observer" && m.status === "active");
    return await submitApplication2(jobId, userId, observer, global.callAI);
  } catch (error) {
    return { success: false, status: "failed", error: error.message };
  }
}
async function checkIfNeedsAuthentication(page) {
  const url = page.url().toLowerCase();
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const loginIndicators = ["sign in", "log in", "login", "anmelden", "einloggen"];
  const registerIndicators = ["sign up", "register", "create account", "registrieren"];
  const needsLogin = loginIndicators.some((i) => url.includes(i) || pageText.includes(i));
  const needsRegistration = registerIndicators.some((i) => pageText.includes(i));
  return { needsLogin, needsRegistration };
}
async function handleLogin(page, userId, userProfile, callAI2) {
  try {
    const emailField = await page.$('input[type="email"], input[name*="email"], input[name*="user"], input[id*="email"]');
    const passwordField = await page.$('input[type="password"]');
    if (emailField && passwordField) {
      await emailField.type(userProfile.email || "", { delay: 50 + Math.random() * 50 });
      await logAction(userId, "ai_applicant", "\u{1F511} Please enter your password to continue", "in_progress");
      return { success: false, error: "Password required. Please login manually in the browser window." };
    }
    return { success: false, needsRegistration: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleRegistration(page, userId, userProfile, callAI2) {
  var _a, _b, _c, _d, _e, _f, _g;
  try {
    await logAction(userId, "ai_applicant", "\u{1F4DD} Attempting automatic registration...", "in_progress");
    const fields = await page.$$eval(
      "input, select",
      (inputs) => inputs.map((input) => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      }))
    );
    for (const field of fields) {
      const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
      if (field.type === "email" || ((_a = field.name) == null ? void 0 : _a.includes("email"))) {
        await page.type(selector, userProfile.email || "");
      } else if (((_b = field.name) == null ? void 0 : _b.includes("first")) || ((_c = field.name) == null ? void 0 : _c.includes("vorname"))) {
        await page.type(selector, ((_d = userProfile.name) == null ? void 0 : _d.split(" ")[0]) || "");
      } else if (((_e = field.name) == null ? void 0 : _e.includes("last")) || ((_f = field.name) == null ? void 0 : _f.includes("nachname"))) {
        await page.type(selector, ((_g = userProfile.name) == null ? void 0 : _g.split(" ").slice(1).join(" ")) || "");
      }
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    }
    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      await logAction(userId, "ai_applicant", "\u{1F510} Please create a password in the browser window", "in_progress");
      return { success: false, error: "Please complete registration manually and create a password." };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function fillField(page, field, value) {
  try {
    let selector = "";
    if (field.id) selector = `#${field.id}`;
    else if (field.name) selector = `[name="${field.name}"]`;
    else if (field.x && field.y) {
      await page.mouse.click(field.x, field.y);
      await page.keyboard.type(value, { delay: 30 + Math.random() * 50 });
      return;
    }
    if (selector) {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await element.type(value, { delay: 30 + Math.random() * 50 });
      }
    }
  } catch (e) {
    console.log(`Could not fill field: ${field.label || field.name}`);
  }
}
async function handleFileUpload(page, field, jobId, userId) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    const label = (field.label || "").toLowerCase();
    let docPath = "";
    if (label.includes("cv") || label.includes("resume") || label.includes("lebenslauf")) {
      docPath = job == null ? void 0 : job.cv_path;
    } else if (label.includes("cover") || label.includes("anschreiben")) {
      docPath = job == null ? void 0 : job.cover_letter_path;
    } else if (label.includes("motivation")) {
      docPath = job == null ? void 0 : job.motivation_letter_path;
    } else if (label.includes("portfolio")) {
      docPath = job == null ? void 0 : job.portfolio_path;
    }
    if (!docPath || !fs4.existsSync(docPath)) {
      const pdfPath = docPath == null ? void 0 : docPath.replace(".html", ".pdf");
      if (pdfPath && fs4.existsSync(pdfPath)) {
        docPath = pdfPath;
      } else {
        return { success: false, error: `Document not found: ${label}` };
      }
    }
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        field.x && field.y ? page.mouse.click(field.x, field.y) : fileInput.click()
      ]);
      await fileChooser.accept([docPath]);
      await logAction(userId, "ai_applicant", `\u{1F4CE} Uploaded: ${import_path5.default.basename(docPath)}`, "in_progress");
      return { success: true };
    }
    return { success: false, error: "No file input found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function cancelApplication(jobId) {
  const appState = activeApplications.get(jobId);
  if (appState == null ? void 0 : appState.browser) {
    await appState.browser.close();
  }
  activeApplications.delete(jobId);
}
var import_puppeteer5, import_path5, fs4, app7, getUserDataDir3, activeApplications;
var init_smart_applicant = __esm({
  "src/main/features/smart-applicant.ts"() {
    init_database();
    import_puppeteer5 = __toESM(require("puppeteer"), 1);
    import_path5 = __toESM(require("path"), 1);
    fs4 = __toESM(require("fs"), 1);
    init_secretary_service();
    try {
      app7 = require("electron").app;
    } catch (e) {
      app7 = global.electronApp;
    }
    getUserDataDir3 = () => import_path5.default.join(app7.getPath("userData"), "browser_data");
    activeApplications = /* @__PURE__ */ new Map();
  }
});

// electron-main.ts
var import_electron4 = require("electron");
var import_path6 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require("electron-is-dev"), 1);
init_database();

// src/main/ipc-handlers.ts
init_database();
var import_electron3 = require("electron");

// src/main/ai-service.ts
init_database();
var import_axios = __toESM(require("axios"), 1);

// src/main/features/Hunter-engine.ts
init_database();
init_scraper_service();
async function analyzeJobUrl(jobId, userId, url, hunter, auditor, callAI2) {
  var _a;
  console.log(`
========== ANALYZING JOB ${jobId} ==========`);
  console.log(`URL: ${url}`);
  console.log(`Hunter model:`, hunter ? hunter.model_name : "MISSING!");
  await logAction(userId, "ai_hunter", `\u{1F50D} Analyzing: ${url}`, "in_progress");
  console.log("Step 1: Getting page content...");
  const pageData = await getJobPageContent(url, userId, callAI2);
  console.log(`Scraper result: strategy="${pageData.strategyUsed}", contentLength=${pageData.content.length}`);
  if (pageData.strategyUsed.includes("Blocked") || pageData.strategyUsed.includes("Failed")) {
    console.log("\u274C Page was blocked or failed");
    await logAction(userId, "ai_auditor", `\u274C Blocked: ${url}`, "failed", false);
    await runQuery("DELETE FROM job_listings", { id: jobId });
    return;
  }
  if (!pageData.content || pageData.content.length < 100) {
    console.log("\u274C Content too short:", pageData.content.length);
    await logAction(userId, "ai_auditor", `\u274C Empty content: ${url}`, "failed", false);
    await runQuery("DELETE FROM job_listings", { id: jobId });
    return;
  }
  console.log("\u2705 Got content, first 500 chars:", pageData.content.substring(0, 500));
  await logAction(userId, "ai_hunter", `\u{1F4C4} Got ${pageData.content.length} chars via ${pageData.strategyUsed}`, "in_progress");
  if (!hunter || !hunter.api_key) {
    console.log("\u274C No Hunter AI model or missing API key!");
    await logAction(userId, "ai_hunter", `\u274C No Hunter AI configured!`, "failed", false);
    console.log("Attempting fallback extraction...");
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery("UPDATE job_listings", {
        id: jobId,
        ...fallbackData,
        status: "analyzed",
        date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString()
      });
      console.log("\u2705 Saved with fallback data:", fallbackData);
    }
    return;
  }
  const isJsonLd = pageData.strategyUsed.includes("JSON-LD");
  console.log("Is JSON-LD:", isJsonLd);
  let prompt;
  if (isJsonLd) {
    prompt = `You are a job data extractor. Extract job details from this JSON-LD data.

Return ONLY a valid JSON object (no markdown, no explanation):
{"jobTitle":"exact job title","companyName":"company name","location":"city, country","jobType":"Full-time/Part-time/Contract","experienceLevel":"Junior/Mid/Senior","salaryRange":"salary or N/A","description":"2-3 sentence summary","requiredSkills":"comma separated","remoteOnsite":"Remote/Hybrid/Onsite"}

JSON-LD:
${pageData.content.substring(0, 6e3)}`;
  } else {
    prompt = `You are a job data extractor. Extract job details from this job listing text.

Return ONLY a valid JSON object (no markdown, no explanation):
{"jobTitle":"exact job title","companyName":"company name","location":"city, country","jobType":"Full-time/Part-time/Contract","experienceLevel":"Junior/Mid/Senior","salaryRange":"salary or N/A","description":"2-3 sentence summary","requiredSkills":"comma separated","remoteOnsite":"Remote/Hybrid/Onsite"}

Job listing:
${pageData.content.substring(0, 6e3)}`;
  }
  console.log("Step 3: Calling AI...");
  console.log("Prompt length:", prompt.length);
  let aiResponse;
  try {
    aiResponse = await callAI2(hunter, prompt);
    console.log("AI Response:", aiResponse);
  } catch (aiError) {
    console.log("\u274C AI call failed:", aiError.message);
    await logAction(userId, "ai_hunter", `\u274C AI error: ${aiError.message}`, "failed", false);
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery("UPDATE job_listings", { id: jobId, ...fallbackData, status: "analyzed", date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString() });
    } else {
      await runQuery("UPDATE job_listings", { id: jobId, status: "manual_review" });
    }
    return;
  }
  if (aiResponse.toLowerCase().includes("error:") || aiResponse.toLowerCase().includes("invalid api")) {
    console.log("\u274C AI returned error:", aiResponse);
    await logAction(userId, "ai_hunter", `\u274C AI error: ${aiResponse.substring(0, 100)}`, "failed", false);
    await runQuery("UPDATE job_listings", { id: jobId, status: "manual_review" });
    return;
  }
  console.log("Step 5: Parsing AI response...");
  try {
    let cleanedResponse = aiResponse.replace(/```json/gi, "").replace(/```/g, "").replace(/^[^{]*/, "").replace(/[^}]*$/, "").trim();
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("\u274C No JSON found in response");
      throw new Error("No JSON in response");
    }
    const data = JSON.parse(jsonMatch[0]);
    console.log("Parsed data:", data);
    const jobTitle = data.jobTitle || data.title || data.job_title || "";
    const companyName = data.companyName || data.company || data.company_name || ((_a = data.hiringOrganization) == null ? void 0 : _a.name) || "";
    if (!jobTitle || jobTitle.toLowerCase() === "n/a" || jobTitle.toLowerCase() === "unknown") {
      console.log("\u274C Missing job title");
      await logAction(userId, "ai_auditor", `\u274C Missing job title`, "failed", false);
      const fallbackData = extractBasicInfo(pageData.content, url);
      if (fallbackData.jobTitle) {
        await runQuery("UPDATE job_listings", { id: jobId, ...fallbackData, status: "analyzed", date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString() });
      } else {
        await runQuery("DELETE FROM job_listings", { id: jobId });
      }
      return;
    }
    console.log("Step 6: Saving to database...");
    const updateData = {
      id: jobId,
      job_title: jobTitle,
      company_name: companyName || "Unknown Company",
      location: data.location || data.jobLocation || "N/A",
      job_type: data.jobType || data.employmentType || "N/A",
      experience_level: data.experienceLevel || "N/A",
      salary_range: data.salaryRange || data.salary || data.baseSalary || "N/A",
      description: data.description || "",
      required_skills: data.requiredSkills || data.skills || "N/A",
      remote_onsite: data.remoteOnsite || data.jobLocationType || "N/A",
      posted_date: data.postedDate || data.datePosted || "N/A",
      application_url: data.applicationUrl || data.url || url,
      status: "analyzed",
      date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString()
    };
    console.log("Update data:", updateData);
    await runQuery("UPDATE job_listings", updateData);
    await logAction(userId, "ai_auditor", `\u2705 Extracted: ${jobTitle} at ${companyName}`, "completed", true);
    console.log(`\u2705 SUCCESS: ${jobTitle} at ${companyName}`);
  } catch (parseError) {
    console.log("\u274C Parse error:", parseError.message);
    await logAction(userId, "ai_auditor", `\u274C Parse failed`, "failed", false);
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery("UPDATE job_listings", { id: jobId, ...fallbackData, status: "analyzed", date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString() });
      console.log("\u2705 Saved with fallback:", fallbackData);
    } else {
      await runQuery("UPDATE job_listings", { id: jobId, status: "manual_review" });
    }
  }
}
function extractBasicInfo(content, url) {
  var _a, _b, _c, _d;
  console.log("Running fallback extraction...");
  const data = {
    application_url: url
  };
  try {
    if (content.startsWith("{")) {
      const json = JSON.parse(content);
      data.job_title = json.title || json.jobTitle || json.name || "";
      data.company_name = ((_a = json.hiringOrganization) == null ? void 0 : _a.name) || json.companyName || json.company || "";
      data.location = ((_c = (_b = json.jobLocation) == null ? void 0 : _b.address) == null ? void 0 : _c.addressLocality) || json.location || "";
      data.job_type = json.employmentType || "";
      data.description = ((_d = json.description) == null ? void 0 : _d.substring(0, 500)) || "";
      console.log("Extracted from JSON:", data);
      return data;
    }
  } catch (e) {
  }
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l);
  for (const line of lines.slice(0, 10)) {
    if (line.length > 5 && line.length < 100 && !line.includes("cookie") && !line.includes("Sign")) {
      if (!data.job_title) {
        data.job_title = line;
        break;
      }
    }
  }
  const companyPatterns = [
    /(?:at|@|by|company[:\s]+)([A-Z][A-Za-z0-9\s&.-]+)/i,
    /([A-Z][A-Za-z0-9\s&.-]+)(?:\s+is hiring|\s+jobs)/i
  ];
  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      data.company_name = match[1].trim();
      break;
    }
  }
  const locationPatterns = [
    /(?:location|located in|based in)[:\s]+([A-Za-z\s,]+)/i,
    /(Berlin|Munich|Hamburg|Frankfurt|London|Paris|Amsterdam|Remote)/i
  ];
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      data.location = match[1].trim();
      break;
    }
  }
  console.log("Fallback extracted:", data);
  return data;
}
async function startHunterSearch(userId, callAI2) {
  var _a;
  console.log("\n========== STARTING HUNTER SEARCH ==========");
  try {
    await logAction(userId, "ai_hunter", "\u{1F680} Starting job hunt...", "in_progress");
    const db = getDatabase();
    const profiles = db.search_profiles.filter((p) => p.is_active === 1);
    const websites = db.job_websites.filter((w) => w.is_active === 1);
    const models = await getAllQuery("SELECT * FROM ai_models");
    console.log("Search profiles:", profiles.length);
    console.log("Job websites:", websites.length);
    console.log("AI models:", models.length);
    const hunter = models.find((m) => m.role === "Hunter" && m.status === "active");
    const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
    console.log("Hunter:", hunter ? `${hunter.model_name} (key: ${(_a = hunter.api_key) == null ? void 0 : _a.substring(0, 10)}...)` : "NOT FOUND");
    console.log("Auditor:", auditor ? auditor.model_name : "NOT FOUND (will use Hunter)");
    if (!hunter) {
      const errorMsg = 'No active Hunter AI model. Go to Settings > AI Models and add one with role "Hunter".';
      console.log("\u274C", errorMsg);
      await logAction(userId, "ai_hunter", `\u274C ${errorMsg}`, "failed", false);
      return { success: false, error: errorMsg };
    }
    if (profiles.length === 0) {
      const errorMsg = "No active search profiles. Go to Search Profiles and create one.";
      console.log("\u274C", errorMsg);
      await logAction(userId, "ai_hunter", `\u274C ${errorMsg}`, "failed", false);
      return { success: false, error: errorMsg };
    }
    if (websites.length === 0) {
      const errorMsg = "No active job websites. Go to Job Websites and add one.";
      console.log("\u274C", errorMsg);
      await logAction(userId, "ai_hunter", `\u274C ${errorMsg}`, "failed", false);
      return { success: false, error: errorMsg };
    }
    let totalJobsFound = 0;
    for (const profile of profiles) {
      console.log(`
Profile: ${profile.job_title} in ${profile.location}`);
      for (const website of websites) {
        console.log(`Website: ${website.website_name} (${website.website_url})`);
        await logAction(userId, "ai_hunter", `\u{1F310} Searching ${website.website_name}...`, "in_progress");
        const query = profile.job_title;
        console.log(`Search query: "${query}"`);
        const jobUrls = await scrapeJobs(
          website.website_url,
          query,
          profile.location || "",
          { email: website.email, password: website.password },
          userId,
          callAI2
        );
        console.log(`Found ${jobUrls.length} URLs`);
        await logAction(userId, "ai_hunter", `\u{1F4E5} Found ${jobUrls.length} jobs on ${website.website_name}`, "completed", true);
        for (const url of jobUrls) {
          const existing = db.job_listings.find((j) => j.url === url);
          if (existing) {
            console.log(`Skipping duplicate: ${url}`);
            continue;
          }
          const jobId = Date.now() + Math.floor(Math.random() * 1e3);
          await runQuery("INSERT INTO job_listings", {
            id: jobId,
            url,
            source: website.website_name,
            status: "analyzing"
          });
          totalJobsFound++;
          console.log(`Added job ${jobId}: ${url}`);
          await analyzeJobUrl(jobId, userId, url, hunter, auditor || hunter, callAI2);
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
      }
    }
    await logAction(userId, "ai_hunter", `\u2705 Done! Processed ${totalJobsFound} jobs.`, "completed", true);
    console.log(`
========== HUNT COMPLETE: ${totalJobsFound} jobs ==========
`);
    return { success: true, jobsFound: totalJobsFound };
  } catch (error) {
    console.error("Hunt error:", error);
    await logAction(userId, "ai_hunter", `\u274C Error: ${error.message}`, "failed", false);
    return { success: false, error: error.message };
  }
}

// src/main/ai-service.ts
init_doc_generator();
init_scheduler();

// src/main/features/application-submitter.ts
init_database();
init_scraper_service();
var import_puppeteer2 = __toESM(require("puppeteer"), 1);
var import_path3 = __toESM(require("path"), 1);
var import_electron2 = require("electron");
async function submitApplication(jobId, userId, observerModel, callAI2) {
  console.log(`
========== SUBMITTING APPLICATION FOR JOB ${jobId} ==========`);
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    const userProfile = db.user_profile.find((p) => p.id === userId) || db.user_profile[0];
    const tailoredDoc = db.documents.find((d) => d.job_id === jobId && d.document_type === "cv");
    if (!job || !job.application_url) {
      throw new Error("Job or application URL not found");
    }
    await logAction(userId, "ai_mouse", `\u{1F5B1}\uFE0F Starting automated submission for ${job.company_name}`, "in_progress");
    const browser = await import_puppeteer2.default.launch({
      headless: false,
      userDataDir: import_path3.default.join(import_electron2.app.getPath("userData"), "browser_data"),
      args: ["--no-sandbox", "--start-maximized"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(job.application_url, { waitUntil: "networkidle2", timeout: 6e4 });
    const coordinates = await getFormCoordinates(page, userId, observerModel, callAI2);
    console.log("Form coordinates identified:", coordinates);
    for (const coord of coordinates) {
      let value = "";
      if (coord.field === "first_name") value = userProfile.name.split(" ")[0];
      else if (coord.field === "last_name") value = userProfile.name.split(" ").slice(1).join(" ");
      else if (coord.field === "email") value = userProfile.email || "";
      else if (coord.field === "phone") value = userProfile.phone || "";
      if (value) {
        await executeMouseAction(page, { type: "type", x: coord.x, y: coord.y, text: value });
      } else if (coord.field.includes("upload") && tailoredDoc) {
        const fs5 = require("fs");
        const tempPath = import_path3.default.join(import_electron2.app.getPath("temp"), `tailored_cv_${jobId}.txt`);
        fs5.writeFileSync(tempPath, tailoredDoc.content);
        await executeMouseAction(page, { type: "upload", x: coord.x, y: coord.y, filePath: tempPath });
      }
    }
    const submitBtn = coordinates.find((c) => c.field === "submit");
    if (submitBtn) {
      await logAction(userId, "ai_auditor", "\u{1F9D0} Final visual check before submission...", "in_progress");
      await executeMouseAction(page, { type: "click", x: submitBtn.x, y: submitBtn.y });
      await logAction(userId, "ai_mouse", `\u2705 Application submitted to ${job.company_name}`, "completed", true);
      await runQuery("UPDATE job_listings", { id: jobId, status: "submitted" });
    }
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    await browser.close();
    return { success: true };
  } catch (error) {
    console.error("Submission Error:", error);
    await logAction(userId, "ai_mouse", `\u274C Submission failed: ${error.message}`, "failed", false);
    return { success: false, error: error.message };
  }
}

// src/main/ai-service.ts
var huntingInterval = null;
async function callAI(model, prompt, fileData) {
  var _a, _b, _c, _d, _e, _f;
  console.log("\n----- CALL AI -----");
  console.log("Model:", model == null ? void 0 : model.model_name);
  console.log("Prompt length:", prompt.length);
  try {
    if (!model) {
      console.log("\u274C No model provided");
      return "Error: No AI model provided";
    }
    let apiKey = model.api_key ? model.api_key.trim() : "";
    let modelName = model.model_name || "gpt-3.5-turbo";
    if (!apiKey && model.role) {
      console.log(`Looking for API key by role: ${model.role}`);
      const models = await getAllQuery("SELECT * FROM ai_models");
      const dbModel = models.find((m) => m.role === model.role && m.status === "active");
      if (dbModel) {
        apiKey = ((_a = dbModel.api_key) == null ? void 0 : _a.trim()) || "";
        modelName = dbModel.model_name || modelName;
        console.log(`Found model: ${modelName}, key: ${apiKey == null ? void 0 : apiKey.substring(0, 15)}...`);
      }
    }
    if (!apiKey) {
      console.log("\u274C No API key found");
      return "Error: No API key configured. Go to Settings > AI Models and add your API key.";
    }
    let endpoint = "https://api.openai.com/v1/chat/completions";
    if (model.model_type === "local" || ((_b = model.api_endpoint) == null ? void 0 : _b.includes("localhost"))) {
      endpoint = model.api_endpoint || "http://localhost:11434/v1/chat/completions";
    } else if (apiKey.startsWith("tgp_v1_")) {
      endpoint = "https://api.together.xyz/v1/chat/completions";
    }
    console.log("Endpoint:", endpoint);
    console.log("Model name:", modelName);
    const requestBody = {
      model: modelName,
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts job information. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    };
    if (fileData && modelName.includes("vision") || modelName.includes("gpt-4o")) {
      requestBody.messages[1] = {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: fileData } }
        ]
      };
    }
    console.log("Making API request...");
    const response = await import_axios.default.post(endpoint, requestBody, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 6e4
    });
    const content = response.data.choices[0].message.content;
    console.log("AI Response (first 500 chars):", content == null ? void 0 : content.substring(0, 500));
    console.log("----- END CALL AI -----\n");
    return content;
  } catch (err) {
    const errorMsg = ((_e = (_d = (_c = err.response) == null ? void 0 : _c.data) == null ? void 0 : _d.error) == null ? void 0 : _e.message) || err.message;
    console.log("\u274C AI Error:", errorMsg);
    console.log("Full error:", ((_f = err.response) == null ? void 0 : _f.data) || err.message);
    return "Error: " + errorMsg;
  }
}
async function startHunterSearch2(userId) {
  console.log("startHunterSearch called with userId:", userId);
  return await startHunterSearch(userId, callAI);
}
async function analyzeJobUrl2(jobId, userId, url) {
  console.log("analyzeJobUrl called:", { jobId, userId, url });
  const models = await getAllQuery("SELECT * FROM ai_models");
  const hunter = models.find((m) => m.role === "Hunter" && m.status === "active");
  const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
  return await analyzeJobUrl(jobId, userId, url, hunter, auditor || hunter, callAI);
}
async function processApplication(jobId, userId, userConsentGiven = false) {
  try {
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    if (!job) return { success: false, error: "Job not found" };
    const models = await getAllQuery("SELECT * FROM ai_models");
    const thinker = models.find((m) => m.role === "Thinker" && m.status === "active");
    const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
    const observer = models.find((m) => m.role === "Observer" && m.status === "active") || thinker;
    if (thinker && auditor) {
      await generateTailoredDocs(job, userId, thinker, auditor, { cv: true, coverLetter: true }, callAI);
    }
    console.log(`AI Service: Docs ready for job ${jobId}. Handing over to AI Mouse...`);
    return await submitApplication(jobId, userId, observer, callAI);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function startHuntingScheduler2(userId) {
  if (huntingInterval) clearInterval(huntingInterval);
  huntingInterval = startHuntingScheduler(userId, startHunterSearch2, callAI);
}

// src/main/ipc-handlers.ts
var import_axios2 = __toESM(require("axios"), 1);
function setupIpcHandlers() {
  const channels = [
    "settings:get",
    "settings:update",
    "user:get-profile",
    "user:update-profile",
    "user:open-linkedin",
    "user:capture-linkedin",
    "user:save-linkedin-profile",
    "profiles:get-all",
    "profiles:save",
    "profiles:update",
    "profiles:delete",
    "jobs:get-all",
    "jobs:delete",
    "jobs:add-manual",
    "jobs:update-doc-confirmation",
    "hunter:start-search",
    "ai:process-application",
    "ai:generate-tailored-docs",
    "ai:smart-apply",
    "ai:continue-application",
    "ai:cancel-application",
    "ai:fetch-models",
    "docs:get-all",
    "docs:save",
    "docs:open-file",
    "docs:convert-to-pdf",
    "docs:convert-all-pdf",
    "websites:get-all",
    "websites:add",
    "websites:delete",
    "websites:toggle-active",
    "ai-models:get-all",
    "ai-models:add",
    "ai-models:update",
    "ai-models:delete",
    "logs:get-recent-actions",
    "apps:get-all",
    "scheduler:toggle",
    "scheduler:get-status",
    "qa:get-all",
    "qa:update",
    "qa:delete"
  ];
  channels.forEach((channel) => {
    try {
      import_electron3.ipcMain.removeHandler(channel);
    } catch (e) {
    }
  });
  import_electron3.ipcMain.handle("settings:get", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM settings");
      return { success: true, data: data[0] || null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("settings:update", async (_, data) => {
    try {
      await runQuery("UPDATE settings", data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:get-profile", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM user_profile");
      return { success: true, data: data[0] || null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:update-profile", async (_, data) => {
    try {
      const db = getDatabase();
      if (db.user_profile.length > 0) {
        await runQuery("UPDATE user_profile", { ...data, id: db.user_profile[0].id });
      } else {
        await runQuery("INSERT INTO user_profile", [{ ...data, id: 1 }]);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:open-linkedin", async (_, url) => {
    try {
      const linkedinUrl = url || "https://www.linkedin.com/in/";
      await import_electron3.shell.openExternal(linkedinUrl);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:capture-linkedin", async () => {
    try {
      return {
        success: true,
        data: {
          name: "",
          title: "",
          location: "",
          photo: "",
          summary: "",
          experienceList: [],
          educationList: [],
          skillList: [],
          licenseList: [],
          languageList: []
        },
        message: "LinkedIn capture requires browser automation. Please use manual entry for now."
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("profiles:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM search_profiles");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("profiles:save", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO search_profiles", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("profiles:update", async (_, data) => {
    try {
      await runQuery("UPDATE search_profiles", data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("profiles:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM search_profiles", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("jobs:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM job_listings");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("jobs:delete", async (_, id) => {
    try {
      const deleteId = typeof id === "object" ? id.id : id;
      await runQuery("DELETE FROM job_listings", { id: deleteId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("jobs:add-manual", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO job_listings", {
        ...data,
        source: "Manual",
        status: "analyzing"
      });
      analyzeJobUrl2(result.id, data.userId, data.url).catch(console.error);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("jobs:update-doc-confirmation", async (_, data) => {
    try {
      await runQuery("UPDATE job_listings", {
        id: data.jobId,
        user_confirmed_docs: data.confirmed
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("hunter:start-search", async (_, userId) => {
    try {
      const result = await startHunterSearch2(userId);
      return result;
    } catch (e) {
      console.error("Hunter search error:", e);
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:process-application", async (_, jobId, userId) => {
    try {
      return await processApplication(jobId, userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:generate-tailored-docs", async (_, data) => {
    var _a;
    try {
      const { jobId, userId, docOptions } = data;
      const db = getDatabase();
      const job = (_a = db.job_listings) == null ? void 0 : _a.find((j) => j.id === jobId);
      if (!job) {
        return { success: false, error: "Job not found" };
      }
      const models = await getAllQuery("SELECT * FROM ai_models");
      const thinker = models.find((m) => m.role === "Thinker" && m.status === "active");
      const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
      if (!thinker) {
        return { success: false, error: "No Thinker AI model configured. Go to Settings > AI Models." };
      }
      const DocGenerator = (init_doc_generator(), __toCommonJS(doc_generator_exports));
      await DocGenerator.generateTailoredDocs(
        job,
        userId,
        thinker,
        auditor || thinker,
        docOptions || { cv: true, motivationLetter: true, coverLetter: true },
        callAI
      );
      return { success: true };
    } catch (e) {
      console.error("Generate docs error:", e);
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:fetch-models", async (_, data) => {
    var _a;
    try {
      const { provider, apiKey } = data;
      let models = [];
      if (provider === "openai") {
        const response = await import_axios2.default.get("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` },
          timeout: 1e4
        });
        models = response.data.data.filter((m) => m.id.includes("gpt")).map((m) => m.id).sort();
      } else if (provider === "together") {
        models = [
          "mistralai/Mixtral-8x7B-Instruct-v0.1",
          "meta-llama/Llama-3-70b-chat-hf",
          "meta-llama/Llama-3-8b-chat-hf",
          "togethercomputer/CodeLlama-34b-Instruct"
        ];
      } else if (provider === "local") {
        try {
          const response = await import_axios2.default.get("http://localhost:11434/api/tags", { timeout: 5e3 });
          models = ((_a = response.data.models) == null ? void 0 : _a.map((m) => m.name)) || ["llama3", "mistral", "codellama"];
        } catch {
          models = ["llama3", "mistral", "codellama", "phi3"];
        }
      }
      return { success: true, models };
    } catch (e) {
      console.error("Fetch models error:", e.message);
      return { success: false, error: e.message, models: [] };
    }
  });
  import_electron3.ipcMain.handle("docs:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM documents");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("docs:save", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO documents", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("docs:open-file", async (_, filePath) => {
    try {
      const { shell: shell2 } = require("electron");
      await shell2.openPath(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("websites:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM job_websites");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("websites:add", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO job_websites", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("websites:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM job_websites", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("websites:toggle-active", async (_, data) => {
    try {
      await runQuery("UPDATE job_websites", { id: data.id, is_active: data.isActive });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai-models:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM ai_models");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai-models:add", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO ai_models", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai-models:update", async (_, data) => {
    try {
      await runQuery("UPDATE ai_models", [data]);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai-models:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM ai_models", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("logs:get-recent-actions", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM action_logs");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("apps:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM applications");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("scheduler:toggle", async (_, enabled) => {
    try {
      const { setSchedulerEnabled: setSchedulerEnabled2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
      setSchedulerEnabled2(enabled);
      await runQuery("UPDATE settings", { job_hunting_active: enabled ? 1 : 0 });
      return { success: true, enabled };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("scheduler:get-status", async () => {
    try {
      const db = getDatabase();
      const settings = db.settings[0];
      return {
        success: true,
        enabled: (settings == null ? void 0 : settings.job_hunting_active) === 1
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:capture-linkedin", async (_, data) => {
    try {
      const LinkedInScraper = (init_linkedin_scraper(), __toCommonJS(linkedin_scraper_exports));
      const { userId, profileUrl } = data || {};
      if (!profileUrl) {
        return await LinkedInScraper.openLinkedInForLogin(userId || 1);
      }
      return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, profileUrl);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("user:save-linkedin-profile", async (_, data) => {
    try {
      const LinkedInScraper = (init_linkedin_scraper(), __toCommonJS(linkedin_scraper_exports));
      return await LinkedInScraper.saveLinkedInProfile(data.userId, data.profileData);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("docs:convert-to-pdf", async (_, data) => {
    try {
      const PdfExport = (init_pdf_export(), __toCommonJS(pdf_export_exports));
      return await PdfExport.convertHtmlToPdf(data.htmlPath, data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("docs:convert-all-pdf", async (_, data) => {
    try {
      const PdfExport = (init_pdf_export(), __toCommonJS(pdf_export_exports));
      return await PdfExport.convertAllJobDocsToPdf(data.jobId, data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:smart-apply", async (_, data) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      const models = await getAllQuery("SELECT * FROM ai_models");
      const observer = models.find((m) => m.role === "Observer" && m.status === "active") || models.find((m) => m.role === "Hunter" && m.status === "active");
      global.callAI = callAI;
      return await SmartApplicant.submitApplication(data.jobId, data.userId, observer, callAI);
    } catch (e) {
      console.error("Smart apply error:", e);
      return { success: false, status: "failed", error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:continue-application", async (_, data) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.continueApplicationWithAnswers(data.jobId, data.userId, data.answers);
    } catch (e) {
      return { success: false, status: "failed", error: e.message };
    }
  });
  import_electron3.ipcMain.handle("ai:cancel-application", async (_, jobId) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      await SmartApplicant.cancelApplication(jobId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("qa:get-all", async () => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      const data = await SmartApplicant.getAllQuestions();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("qa:update", async (_, data) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.updateQuestionAnswer(data.questionId, data.answer);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron3.ipcMain.handle("qa:delete", async (_, questionId) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.deleteQuestion(questionId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  startHuntingScheduler2(1);
  console.log("\u2705 IPC Handlers registered successfully");
}

// electron-main.ts
import_electron4.app.disableHardwareAcceleration();
var gotTheLock = import_electron4.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron4.app.quit();
}
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron4.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    webPreferences: {
      preload: import_path6.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const startUrl = import_electron_is_dev.default ? "http://localhost:5173" : `file://${import_path6.default.join(__dirname, "../dist/index.html")}`;
  mainWindow.loadURL(startUrl);
  if (import_electron_is_dev.default) mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new import_electron4.Menu();
    menu.append(new import_electron4.MenuItem({ label: "Cut", role: "cut", enabled: params.editFlags.canCut }));
    menu.append(new import_electron4.MenuItem({ label: "Copy", role: "copy", enabled: params.editFlags.canCopy }));
    menu.append(new import_electron4.MenuItem({ label: "Paste", role: "paste", enabled: params.editFlags.canPaste }));
    menu.append(new import_electron4.MenuItem({ type: "separator" }));
    menu.append(new import_electron4.MenuItem({ label: "Select All", role: "selectAll", enabled: params.editFlags.canSelectAll }));
    menu.popup({ window: mainWindow });
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron4.app.on("ready", async () => {
  await initializeDatabase();
  setupIpcHandlers();
  createWindow();
});
import_electron4.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron4.app.quit();
});
import_electron4.app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
//# sourceMappingURL=electron-main.cjs.map