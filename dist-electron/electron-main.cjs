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
var database_exports = {};
__export(database_exports, {
  getAllQuery: () => getAllQuery,
  getDatabase: () => getDatabase,
  initializeDatabase: () => initializeDatabase,
  logAction: () => logAction,
  runQuery: () => runQuery
});
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
  const tables = ["user_profile", "email_config", "job_preferences", "ai_models", "job_websites", "company_monitoring", "job_listings", "applications", "action_logs", "email_alerts", "documents", "search_profiles", "settings", "questions", "auditor_questions", "auditor_criteria"];
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
      questions: [],
      auditor_questions: [],
      auditor_criteria: []
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

// src/main/features/linkedin-scraper.ts
var linkedin_scraper_exports = {};
__export(linkedin_scraper_exports, {
  closeLinkedInBrowser: () => closeLinkedInBrowser,
  enhanceProfileWithAI: () => enhanceProfileWithAI,
  isSearching: () => isSearching,
  openLinkedInForLogin: () => openLinkedInForLogin,
  saveLinkedInProfile: () => saveLinkedInProfile,
  scrapeLinkedInProfile: () => scrapeLinkedInProfile,
  scrapeLinkedInProfileWithAI: () => scrapeLinkedInProfileWithAI
});
async function isLoggedIn(page) {
  try {
    const loggedInIndicators = await page.evaluate(() => {
      return !!(document.querySelector(".global-nav__me") || document.querySelector(".feed-identity-module") || document.querySelector('[data-test-id="nav-settings"]') || document.querySelector(".share-box-feed-entry__trigger") || window.location.href.includes("/feed/") || window.location.href.includes("/in/"));
    });
    return loggedInIndicators;
  } catch (e) {
    return false;
  }
}
async function getOrCreateBrowser() {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    const pages2 = await sharedBrowser.pages();
    if (pages2.length > 0 && sharedPage && !sharedPage.isClosed()) {
      return { browser: sharedBrowser, page: sharedPage, isNew: false };
    }
    sharedPage = await sharedBrowser.newPage();
    await setupPage(sharedPage);
    return { browser: sharedBrowser, page: sharedPage, isNew: false };
  }
  console.log("Launching new browser with user data dir:", getUserDataDir());
  sharedBrowser = await import_puppeteer.default.launch({
    headless: false,
    userDataDir: getUserDataDir(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1280,800",
      "--start-maximized"
    ]
  });
  const pages = await sharedBrowser.pages();
  sharedPage = pages.length > 0 ? pages[0] : await sharedBrowser.newPage();
  await setupPage(sharedPage);
  return { browser: sharedBrowser, page: sharedPage, isNew: true };
}
async function setupPage(page) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => parameters.name === "notifications" ? Promise.resolve({ state: "denied" }) : originalQuery(parameters);
  });
}
async function openLinkedInForLogin(userId) {
  try {
    await logAction(userId, "linkedin", "\u{1F517} Opening LinkedIn...", "in_progress");
    const { browser, page, isNew } = await getOrCreateBrowser();
    page.setDefaultNavigationTimeout(6e4);
    page.setDefaultTimeout(3e4);
    global.linkedInBrowser = browser;
    global.linkedInPage = page;
    if (!isNew) {
      const currentUrl2 = page.url();
      if (currentUrl2.includes("linkedin.com")) {
        const loggedIn = await isLoggedIn(page);
        if (loggedIn) {
          await logAction(userId, "linkedin", "\u2705 Already logged in to LinkedIn!", "completed", true);
          return {
            success: true,
            message: 'You are already logged in to LinkedIn. You can click "Fetch Profile" directly.',
            isLoggedIn: true
          };
        }
      }
    }
    try {
      await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 45e3 });
    } catch (navError) {
      console.log("Navigation timeout, checking if page loaded...");
      const currentUrl2 = page.url();
      if (!currentUrl2.includes("linkedin.com")) {
        throw new Error("Failed to open LinkedIn. Please check your internet connection.");
      }
    }
    await new Promise((r) => setTimeout(r, 2e3));
    const currentUrl = page.url();
    if (currentUrl.includes("/feed") || currentUrl.includes("/in/")) {
      await logAction(userId, "linkedin", "\u2705 Already logged in to LinkedIn!", "completed", true);
      return {
        success: true,
        message: 'You are already logged in to LinkedIn! Click "Fetch Profile" to capture your profile.',
        isLoggedIn: true
      };
    }
    await logAction(userId, "linkedin", "\u2705 LinkedIn opened. Please login manually.", "completed", true);
    return {
      success: true,
      message: 'LinkedIn opened. Please login manually in the browser window, then click "Fetch Profile".',
      isLoggedIn: false
    };
  } catch (error) {
    await logAction(userId, "linkedin", `\u274C Error: ${error.message}`, "failed", false);
    return { success: false, message: error.message };
  }
}
async function expandAllLinkedInSections(page) {
  console.log("Expanding LinkedIn profile sections...");
  const collectedData = {
    experiences: [],
    educations: [],
    skills: [],
    licenses: [],
    languages: []
  };
  const currentUrl = page.url();
  const profileUrlMatch = currentUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
  const profileSlug = profileUrlMatch ? profileUrlMatch[1] : "me";
  const baseProfileUrl = `https://www.linkedin.com/in/${profileSlug}`;
  await page.evaluate(async () => {
    const scrollStep = 500;
    const scrollDelay = 300;
    const pageHeight = document.body.scrollHeight;
    for (let position = 0; position < pageHeight; position += scrollStep) {
      window.scrollTo(0, position);
      await new Promise((r) => setTimeout(r, scrollDelay));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1e3));
  await page.evaluate(() => {
    const clickTexts = ["see more", "show all", "mehr anzeigen", "alle anzeigen", "show more"];
    document.querySelectorAll("button, a").forEach((el) => {
      var _a, _b;
      const text = ((_a = el.textContent) == null ? void 0 : _a.toLowerCase()) || "";
      const ariaLabel = ((_b = el.getAttribute("aria-label")) == null ? void 0 : _b.toLowerCase()) || "";
      for (const clickText of clickTexts) {
        if (text.includes(clickText) || ariaLabel.includes(clickText)) {
          try {
            el.click();
          } catch (e) {
          }
        }
      }
    });
  });
  await new Promise((r) => setTimeout(r, 1e3));
  const detailPages = [
    { section: "experience", path: "details/experience" },
    { section: "education", path: "details/education" },
    { section: "skills", path: "details/skills" },
    { section: "certifications", path: "details/certifications" },
    { section: "languages", path: "details/languages" },
    { section: "courses", path: "details/courses" },
    { section: "projects", path: "details/projects" },
    { section: "honors", path: "details/honors" },
    { section: "volunteering", path: "details/volunteering-experiences" }
  ];
  for (const { section, path: path10 } of detailPages) {
    try {
      const detailUrl = `${baseProfileUrl}/${path10}/`;
      console.log(`Navigating to ${section} detail page: ${detailUrl}`);
      await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 3e4 });
      await new Promise((r) => setTimeout(r, 2e3));
      const pageUrl = page.url();
      if (!pageUrl.includes(path10)) {
        console.log(`${section} section not found, skipping...`);
        continue;
      }
      await page.evaluate(async () => {
        const scrollStep = 500;
        const scrollDelay = 300;
        let lastHeight = 0;
        let currentHeight = document.body.scrollHeight;
        while (currentHeight > lastHeight) {
          lastHeight = currentHeight;
          window.scrollTo(0, currentHeight);
          await new Promise((r) => setTimeout(r, scrollDelay));
          currentHeight = document.body.scrollHeight;
        }
        window.scrollTo(0, 0);
      });
      await new Promise((r) => setTimeout(r, 1e3));
      await page.evaluate(() => {
        document.querySelectorAll('button.inline-show-more-text__button, button[aria-label*="see more"], button[aria-label*="See more"]').forEach((btn) => {
          try {
            btn.click();
          } catch (e) {
          }
        });
      });
      await new Promise((r) => setTimeout(r, 500));
      if (section === "experience") {
        const experiences = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll(".pvs-list__paged-list-item, li.pvs-list__item--line-clamp, .artdeco-list__item").forEach((item) => {
            var _a, _b, _c;
            const titleEl = item.querySelector('.t-bold span[aria-hidden="true"], .mr1.t-bold span');
            const companyEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"], .t-14.t-normal');
            const datesEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"], .pvs-entity__caption-wrapper');
            const descEl = item.querySelector('.pvs-list__outer-container .t-14.t-normal.t-black span[aria-hidden="true"], .inline-show-more-text');
            const locationEl = item.querySelector('.t-black--light span[aria-hidden="true"]:last-child');
            const title = (_a = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _a.trim();
            if (title) {
              const companyText = (companyEl == null ? void 0 : companyEl.textContent) || "";
              const [company, ...locationParts] = companyText.split("\xB7").map((s) => s.trim());
              const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
              const dateMatch = datesText.match(/(\w+\.?\s*\d{4})\s*[-–]\s*(\w+\.?\s*\d{4}|Present|Heute|Aktuell)/i);
              items.push({
                title,
                company: company || "",
                location: locationParts.join(" ").trim() || ((_b = locationEl == null ? void 0 : locationEl.textContent) == null ? void 0 : _b.trim()) || "",
                startDate: (dateMatch == null ? void 0 : dateMatch[1]) || "",
                endDate: (dateMatch == null ? void 0 : dateMatch[2]) || "",
                description: ((_c = descEl == null ? void 0 : descEl.textContent) == null ? void 0 : _c.trim()) || ""
              });
            }
          });
          return items;
        });
        collectedData.experiences = experiences;
        console.log(`Found ${experiences.length} experiences`);
      } else if (section === "education") {
        const educations = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll(".pvs-list__paged-list-item, li.pvs-list__item--line-clamp, .artdeco-list__item").forEach((item) => {
            var _a;
            const schoolEl = item.querySelector('.t-bold span[aria-hidden="true"]');
            const degreeEl = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
            const datesEl = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
            const school = (_a = schoolEl == null ? void 0 : schoolEl.textContent) == null ? void 0 : _a.trim();
            if (school) {
              const degreeText = (degreeEl == null ? void 0 : degreeEl.textContent) || "";
              const [degree, field] = degreeText.split(",").map((s) => s.trim());
              const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
              const yearMatch = datesText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
              items.push({
                school,
                degree: degree || "",
                field: field || "",
                startYear: (yearMatch == null ? void 0 : yearMatch[1]) || "",
                endYear: (yearMatch == null ? void 0 : yearMatch[2]) || ""
              });
            }
          });
          return items;
        });
        collectedData.educations = educations;
        console.log(`Found ${educations.length} education entries`);
      } else if (section === "skills") {
        const skills = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('.t-bold span[aria-hidden="true"]').forEach((el) => {
            var _a;
            const skill = (_a = el.textContent) == null ? void 0 : _a.trim();
            if (skill && skill.length > 1 && skill.length < 100) {
              items.push(skill);
            }
          });
          return [...new Set(items)];
        });
        collectedData.skills = skills;
        console.log(`Found ${skills.length} skills`);
      } else if (section === "certifications") {
        const licenses = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('.t-bold span[aria-hidden="true"]').forEach((el) => {
            var _a;
            const cert = (_a = el.textContent) == null ? void 0 : _a.trim();
            if (cert && cert.length > 1 && cert.length < 200) {
              items.push(cert);
            }
          });
          return [...new Set(items)];
        });
        collectedData.licenses = licenses;
        console.log(`Found ${licenses.length} certifications/licenses`);
      } else if (section === "languages") {
        const languages = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('.t-bold span[aria-hidden="true"]').forEach((el) => {
            var _a;
            const lang = (_a = el.textContent) == null ? void 0 : _a.trim();
            if (lang && lang.length > 1 && lang.length < 50) {
              items.push(lang);
            }
          });
          return [...new Set(items)];
        });
        collectedData.languages = languages;
        console.log(`Found ${languages.length} languages`);
      }
    } catch (e) {
      console.log(`Error scraping ${section} section:`, e.message);
    }
  }
  try {
    await page.goto(baseProfileUrl, { waitUntil: "domcontentloaded", timeout: 3e4 });
    await new Promise((r) => setTimeout(r, 1e3));
  } catch (e) {
    console.log("Error navigating back to main profile");
  }
  console.log("Finished expanding and collecting all sections");
  return collectedData;
}
async function scrapeLinkedInProfile(userId, profileUrl) {
  let page = null;
  let browser = null;
  try {
    await logAction(userId, "linkedin", "\u{1F50D} Starting LinkedIn profile capture...", "in_progress");
    const browserResult = await getOrCreateBrowser();
    browser = browserResult.browser;
    page = browserResult.page;
    global.linkedInBrowser = browser;
    global.linkedInPage = page;
    page.setDefaultNavigationTimeout(9e4);
    page.setDefaultTimeout(3e4);
    const currentUrl = page.url();
    if (!currentUrl.includes("linkedin.com") || currentUrl.includes("/login") || currentUrl.includes("/checkpoint")) {
      try {
        await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 45e3 });
        await new Promise((r) => setTimeout(r, 2e3));
      } catch (navError) {
        console.log("Feed navigation timeout, checking if page loaded anyway...");
      }
      const loggedIn = await isLoggedIn(page);
      if (!loggedIn) {
        return {
          success: false,
          error: 'Not logged in to LinkedIn. Please click "Sign in to LinkedIn" first and complete the login process.'
        };
      }
    }
    const targetUrl = profileUrl || "https://www.linkedin.com/in/me/";
    console.log("Navigating to profile:", targetUrl);
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45e3 });
    } catch (navError) {
      console.log("Profile navigation timeout, checking if page loaded anyway...");
      const currentPageUrl = page.url();
      if (!currentPageUrl.includes("/in/")) {
        throw new Error("Failed to navigate to profile page");
      }
    }
    try {
      await Promise.race([
        page.waitForSelector(".pv-top-card", { timeout: 15e3 }),
        page.waitForSelector(".scaffold-layout__main", { timeout: 15e3 }),
        page.waitForSelector("h1.text-heading-xlarge", { timeout: 15e3 }),
        page.waitForSelector(".pv-text-details__left-panel", { timeout: 15e3 })
      ]);
    } catch (e) {
      console.log("Profile selector not found within timeout, continuing anyway...");
    }
    await new Promise((r) => setTimeout(r, 2e3 + Math.random() * 2e3));
    const basicInfo = await page.evaluate(() => {
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
      const summary = getText(".pv-about-section .pv-about__summary-text") || getText("#about ~ .display-flex .full-width") || getText('.pv-shared-text-with-see-more span[aria-hidden="true"]') || "";
      return { name, title, location, photo, summary };
    });
    console.log(`Basic info extracted: ${basicInfo.name}, ${basicInfo.title}`);
    await logAction(userId, "linkedin", `\u{1F4CB} Found profile: ${basicInfo.name}. Collecting all sections...`, "in_progress");
    const detailData = await expandAllLinkedInSections(page);
    const profileData = {
      ...basicInfo,
      experiences: detailData.experiences.length > 0 ? detailData.experiences : [],
      educations: detailData.educations.length > 0 ? detailData.educations : [],
      skills: detailData.skills.length > 0 ? detailData.skills : [],
      licenses: detailData.licenses.length > 0 ? detailData.licenses : [],
      languages: detailData.languages.length > 0 ? detailData.languages : []
    };
    if (profileData.experiences.length === 0 || profileData.educations.length === 0) {
      console.log("Detail pages incomplete, falling back to main page extraction...");
      const targetUrl2 = profileUrl || "https://www.linkedin.com/in/me/";
      await page.goto(targetUrl2, { waitUntil: "domcontentloaded", timeout: 3e4 });
      await new Promise((r) => setTimeout(r, 2e3));
      await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
          window.scrollBy(0, 500);
          await new Promise((r) => setTimeout(r, 300));
        }
        window.scrollTo(0, 0);
      });
      const fallbackData = await page.evaluate(() => {
        const experiences = [];
        document.querySelectorAll('#experience ~ .pvs-list__outer-container > ul > li, [data-field="experience_grouping"] li').forEach((li) => {
          var _a;
          const titleEl = li.querySelector('.t-bold span[aria-hidden="true"]');
          const companyEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]');
          const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
          const descEl = li.querySelector('.pvs-list__outer-container .t-14.t-normal.t-black span[aria-hidden="true"]');
          if (titleEl == null ? void 0 : titleEl.textContent) {
            const fullText = (companyEl == null ? void 0 : companyEl.textContent) || "";
            const [company, ...locationParts] = fullText.split("\xB7").map((s) => s.trim());
            const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
            const dateMatch = datesText.match(/(\w+\.?\s*\d{4})\s*[-–]\s*(\w+\.?\s*\d{4}|Present|Heute|Aktuell)/i);
            experiences.push({
              title: titleEl.textContent.trim(),
              company: company || "",
              location: locationParts.join(" ").trim(),
              startDate: (dateMatch == null ? void 0 : dateMatch[1]) || "",
              endDate: (dateMatch == null ? void 0 : dateMatch[2]) || "",
              description: ((_a = descEl == null ? void 0 : descEl.textContent) == null ? void 0 : _a.trim()) || ""
            });
          }
        });
        const educations = [];
        document.querySelectorAll('#education ~ .pvs-list__outer-container > ul > li, [data-field="education_grouping"] li').forEach((li) => {
          const schoolEl = li.querySelector('.t-bold span[aria-hidden="true"]');
          const degreeEl = li.querySelector('.t-14.t-normal span[aria-hidden="true"]');
          const datesEl = li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
          if (schoolEl == null ? void 0 : schoolEl.textContent) {
            const degreeText = (degreeEl == null ? void 0 : degreeEl.textContent) || "";
            const [degree, field] = degreeText.split(",").map((s) => s.trim());
            const datesText = (datesEl == null ? void 0 : datesEl.textContent) || "";
            const yearMatch = datesText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
            educations.push({
              school: schoolEl.textContent.trim(),
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
          if (skill && skill.length > 1 && !skills.includes(skill)) skills.push(skill);
        });
        const licenses = [];
        document.querySelectorAll('#licenses_and_certifications ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach((el) => {
          var _a;
          const license = (_a = el.textContent) == null ? void 0 : _a.trim();
          if (license && license.length > 1 && !licenses.includes(license)) licenses.push(license);
        });
        const languages = [];
        document.querySelectorAll('#languages ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]').forEach((el) => {
          var _a;
          const lang = (_a = el.textContent) == null ? void 0 : _a.trim();
          if (lang && lang.length > 1 && !languages.includes(lang)) languages.push(lang);
        });
        return { experiences, educations, skills, licenses, languages };
      });
      if (profileData.experiences.length === 0) profileData.experiences = fallbackData.experiences;
      if (profileData.educations.length === 0) profileData.educations = fallbackData.educations;
      if (profileData.skills.length === 0) profileData.skills = fallbackData.skills;
      if (profileData.licenses.length === 0) profileData.licenses = fallbackData.licenses;
      if (profileData.languages.length === 0) profileData.languages = fallbackData.languages;
    }
    console.log(`Profile data collected: ${profileData.experiences.length} experiences, ${profileData.educations.length} education, ${profileData.skills.length} skills, ${profileData.licenses.length} licenses, ${profileData.languages.length} languages`);
    await logAction(userId, "linkedin", `\u2705 Profile captured: ${profileData.name}`, "completed", true);
    return { success: true, data: profileData };
  } catch (error) {
    console.error("LinkedIn scrape error:", error);
    await logAction(userId, "linkedin", `\u274C Capture failed: ${error.message}`, "failed", false);
    return { success: false, error: error.message };
  }
}
async function enhanceProfileWithAI(userId, incompleteProfile, pageContent, callAI2, hunterModel) {
  var _a, _b, _c, _d, _e;
  const missing = [];
  if (!incompleteProfile.experiences || incompleteProfile.experiences.length === 0) missing.push("experiences");
  if (!incompleteProfile.educations || incompleteProfile.educations.length === 0) missing.push("educations");
  if (!incompleteProfile.skills || incompleteProfile.skills.length === 0) missing.push("skills");
  if (!incompleteProfile.licenses || incompleteProfile.licenses.length === 0) missing.push("certifications");
  if (!incompleteProfile.languages || incompleteProfile.languages.length === 0) missing.push("languages");
  if (!incompleteProfile.summary) missing.push("summary");
  if (missing.length === 0) {
    console.log("Profile is complete, no AI enhancement needed");
    return incompleteProfile;
  }
  console.log(`Profile incomplete, missing: ${missing.join(", ")}. Using AI to extract...`);
  await logAction(userId, "linkedin", `\u{1F916} Using Hunter AI to extract: ${missing.join(", ")}`, "in_progress");
  try {
    const prompt = `You are a LinkedIn profile data extractor. Extract the following information from this LinkedIn profile page content.

WHAT TO EXTRACT: ${missing.join(", ")}

PAGE CONTENT:
${pageContent.substring(0, 8e3)}

EXISTING DATA (DO NOT CHANGE):
Name: ${incompleteProfile.name}
Title: ${incompleteProfile.title}
Location: ${incompleteProfile.location}

Return ONLY a valid JSON object with the missing fields. Use these exact formats:

{
  ${missing.includes("experiences") ? '"experiences": [{"title": "Job Title", "company": "Company Name", "location": "City", "startDate": "Month Year", "endDate": "Month Year or Present", "description": "Brief description"}],' : ""}
  ${missing.includes("educations") ? '"educations": [{"school": "University Name", "degree": "Degree Type", "field": "Field of Study", "startYear": "2020", "endYear": "2024"}],' : ""}
  ${missing.includes("skills") ? '"skills": ["Skill 1", "Skill 2", "Skill 3"],' : ""}
  ${missing.includes("certifications") ? '"certifications": ["Cert 1", "Cert 2"],' : ""}
  ${missing.includes("languages") ? '"languages": ["Language 1", "Language 2"],' : ""}
  ${missing.includes("summary") ? '"summary": "Professional summary text",' : ""}
}

If you cannot find data for a field, use an empty array [] or empty string "".
IMPORTANT: Return ONLY valid JSON, no explanation.`;
    const response = await callAI2(hunterModel, prompt);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        const enhanced = {
          ...incompleteProfile,
          experiences: ((_a = extracted.experiences) == null ? void 0 : _a.length) > 0 ? extracted.experiences : incompleteProfile.experiences,
          educations: ((_b = extracted.educations) == null ? void 0 : _b.length) > 0 ? extracted.educations : incompleteProfile.educations,
          skills: ((_c = extracted.skills) == null ? void 0 : _c.length) > 0 ? extracted.skills : incompleteProfile.skills,
          licenses: ((_d = extracted.certifications) == null ? void 0 : _d.length) > 0 ? extracted.certifications : incompleteProfile.licenses,
          languages: ((_e = extracted.languages) == null ? void 0 : _e.length) > 0 ? extracted.languages : incompleteProfile.languages,
          summary: extracted.summary || incompleteProfile.summary
        };
        await logAction(userId, "linkedin", `\u2705 AI extracted additional profile data`, "completed", true);
        return enhanced;
      }
    } catch (parseError) {
      console.error("Failed to parse AI profile extraction:", parseError);
    }
  } catch (aiError) {
    console.error("AI profile enhancement failed:", aiError);
    await logAction(userId, "linkedin", `\u26A0\uFE0F AI enhancement failed: ${aiError.message}`, "failed", false);
  }
  return incompleteProfile;
}
async function scrapeLinkedInProfileWithAI(userId, profileUrl, callAI2, hunterModel) {
  const result = await scrapeLinkedInProfile(userId, profileUrl);
  if (!result.success || !result.data) {
    return result;
  }
  const profile = result.data;
  const isIncomplete = !profile.experiences || profile.experiences.length === 0 || (!profile.skills || profile.skills.length === 0) || (!profile.educations || profile.educations.length === 0);
  if (isIncomplete && hunterModel && callAI2) {
    console.log("Profile data incomplete, attempting AI enhancement...");
    let pageContent = "";
    try {
      if (sharedPage && !sharedPage.isClosed()) {
        pageContent = await sharedPage.evaluate(() => document.body.innerText);
      }
    } catch (e) {
      console.log("Could not get page content for AI enhancement");
    }
    if (pageContent && pageContent.length > 500) {
      const enhanced = await enhanceProfileWithAI(userId, profile, pageContent, callAI2, hunterModel);
      return { success: true, data: enhanced };
    }
  }
  return result;
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
  if (sharedBrowser && sharedBrowser.isConnected()) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
  global.linkedInBrowser = null;
  global.linkedInPage = null;
}
var import_puppeteer, import_path2, import_fs2, app2, getUserDataDir, sharedBrowser, sharedPage, isSearching;
var init_linkedin_scraper = __esm({
  "src/main/features/linkedin-scraper.ts"() {
    import_puppeteer = __toESM(require("puppeteer"), 1);
    init_database();
    import_path2 = __toESM(require("path"), 1);
    import_fs2 = __toESM(require("fs"), 1);
    try {
      app2 = require("electron").app;
    } catch (e) {
      app2 = global.electronApp;
    }
    getUserDataDir = () => {
      const browserDataDir = import_path2.default.join(app2.getPath("userData"), "linkedin_browser_data");
      if (!import_fs2.default.existsSync(browserDataDir)) {
        import_fs2.default.mkdirSync(browserDataDir, { recursive: true });
      }
      return browserDataDir;
    };
    sharedBrowser = null;
    sharedPage = null;
    isSearching = false;
  }
});

// src/main/scraper-service.ts
var scraper_service_exports = {};
__export(scraper_service_exports, {
  capturePageScreenshot: () => capturePageScreenshot,
  executeMouseAction: () => executeMouseAction,
  getCompanyInfo: () => getCompanyInfo,
  getFormCoordinates: () => getFormCoordinates,
  getJobPageContent: () => getJobPageContent,
  openLinkedIn: () => openLinkedIn,
  scrapeJobs: () => scrapeJobs,
  scrapeLinkedInJobsWithAI: () => scrapeLinkedInJobsWithAI
});
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
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const launchOptions = {
    headless: options.headless !== void 0 ? options.headless : false,
    executablePath,
    userDataDir: options.userDataDir || getUserDataDir2(),
    args: [...defaultArgs, "--disable-dev-shm-usage", ...options.args || []]
  };
  const browser = await import_puppeteer2.default.launch(launchOptions);
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
    if (url.includes("linkedin.com")) {
      try {
        console.log("Scraper: Attempting to expand LinkedIn job description...");
        const expanded = await page.evaluate(() => {
          const showMoreSelectors = [
            "button.show-more-less-html__button--more",
            'button[aria-label*="Show more"]',
            'button[data-tracking-control-name="public_jobs_show-more-html-btn"]',
            ".show-more-less-html__button--more",
            'button:has-text("Show more")',
            'button:has-text("See more")'
          ];
          for (const selector of showMoreSelectors) {
            try {
              const btn = document.querySelector(selector);
              if (btn && btn.offsetParent !== null) {
                btn.click();
                return true;
              }
            } catch (e) {
            }
          }
          return false;
        });
        if (expanded) {
          console.log("Scraper: \u2705 Expanded LinkedIn job description");
          await randomDelay(1e3, 2e3);
        } else {
          console.log('Scraper: No "Show more" button found (content may already be expanded)');
        }
      } catch (e) {
        console.log("Scraper: Could not expand content:", e);
      }
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
        // LinkedIn 2025 selectors
        ".jobs-description__content",
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        ".show-more-less-html__markup",
        ".description__text",
        "div.jobs-description",
        "article.jobs-description__container",
        // Generic job board selectors
        ".job-description",
        "#jobDescriptionText",
        '[data-testid="job-description"]',
        ".job-details",
        ".jobsearch-JobComponent-description",
        "#job-details",
        ".job-description-content",
        ".position-description"
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
    const safeContent = String(result.content || "");
    const safeStrategy = String(result.strategy || "Unknown");
    return { content: safeContent, strategyUsed: safeStrategy };
  } catch (error) {
    console.error("Scraper Error:", error.message);
    return { content: "", strategyUsed: "Failed: " + String(error.message || "Unknown error") };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
async function scrapeJobs(baseUrl, query, location, credentials, userId, callAI2) {
  let browser = null;
  const jobUrls = [];
  const MAX_PAGES = 5;
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
    } else if (baseUrl.includes("glassdoor.de")) {
      searchUrl = `https://www.glassdoor.de/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locKeyword=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("glassdoor")) {
      searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locKeyword=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("xing")) {
      searchUrl = `https://www.xing.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("stepstone")) {
      searchUrl = `https://www.stepstone.de/jobs/${encodeURIComponent(query)}/in-${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("arbeitsagentur.de")) {
      searchUrl = `https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&was=${encodeURIComponent(query)}&wo=${encodeURIComponent(location)}`;
    } else if (baseUrl.includes("monster.com") || baseUrl.includes("monster.de")) {
      const monsterDomain = baseUrl.includes("monster.de") ? "www.monster.de" : "www.monster.com";
      searchUrl = `https://${monsterDomain}/jobs/search?q=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;
    } else {
      if (baseUrl.includes("?")) {
        searchUrl = `${baseUrl}&q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
      } else {
        searchUrl = baseUrl;
      }
    }
    console.log(`Scraper: Navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 6e4 });
    if (callAI2 && userId) {
      await handleCookieRoadblock(page, userId, callAI2);
    }
    await randomDelay(2e3, 4e3);
    let currentPage = 1;
    let hasMorePages = true;
    while (hasMorePages && currentPage <= MAX_PAGES) {
      console.log(`Scraper: Processing page ${currentPage}...`);
      await page.evaluate(() => window.scrollBy(0, 400));
      await randomDelay(1e3, 2e3);
      await page.evaluate(() => window.scrollBy(0, 400));
      await randomDelay(1e3, 2e3);
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await randomDelay(2e3, 4e3);
      if (await isPageBlocked(page)) {
        console.log("Scraper: Search page blocked");
        if (userId) {
          await logAction(userId, "ai_hunter", "\u{1F6AB} Search page blocked by bot detection", "failed", false);
        }
        break;
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
          // Glassdoor (both .com and .de)
          "a.job-title",
          ".react-job-listing a",
          'a[data-test="job-link"]',
          ".JobCard_jobTitle__GLyJ1 a",
          // Xing
          'a[data-testid="job-posting-link"]',
          ".jobs-list a",
          // Stepstone
          'a[data-at="job-item-title"]',
          'article a[href*="/stellenangebote"]',
          ".job-element a",
          '[data-testid="job-item"] a',
          // Arbeitsagentur (Bundesagentur für Arbeit)
          'a[data-testid="ergebnisliste-job-link"]',
          ".ergebnisliste-item a",
          'a[href*="jobboerse.arbeitsagentur.de"]',
          '[data-automation-id="job-item"] a',
          ".result-list-item a",
          // Monster
          'a[data-testid="svx-job-title"]',
          "a.job-cardstyle__JobCardTitle",
          '.job-search-resultsstyle__JobSearchResultsContainer a[href*="/job-openings/"]',
          'a[href*="/job-openings/"]',
          ".card-content a",
          // Generic
          'a[href*="/job/"]',
          'a[href*="/jobs/"]',
          'a[href*="jobPosting"]',
          'a[href*="/stellenangebot"]',
          'a[href*="/stelle/"]'
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
      const newUrls = links.filter((url) => !jobUrls.includes(url));
      jobUrls.push(...newUrls);
      console.log(`Scraper: Found ${newUrls.length} new URLs on page ${currentPage} (total: ${jobUrls.length})`);
      hasMorePages = await clickNextPage(page);
      if (hasMorePages) {
        currentPage++;
        await randomDelay(3e3, 5e3);
      }
    }
    const uniqueLinks = [...new Set(jobUrls)].slice(0, 50);
    console.log(`Scraper: Total found ${uniqueLinks.length} job URLs across ${currentPage} pages`);
    return uniqueLinks;
  } catch (error) {
    console.error("Scraper Error:", error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  return jobUrls;
}
async function clickNextPage(page) {
  try {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(500, 1e3);
    const nextPageSelectors = [
      // Generic next/arrow buttons
      'button[aria-label*="next" i]',
      'button[aria-label*="n\xE4chste" i]',
      'a[aria-label*="next" i]',
      'a[aria-label*="n\xE4chste" i]',
      '[data-testid*="next"]',
      '[data-testid*="pagination-next"]',
      ".pagination-next",
      ".pager-next",
      "a.next",
      "button.next",
      // LinkedIn specific
      'button[aria-label="View next page"]',
      ".artdeco-pagination__button--next",
      // Indeed specific
      'a[data-testid="pagination-page-next"]',
      '[aria-label="Next Page"]',
      // Stepstone specific
      'a[data-at="pagination-next"]',
      '[data-testid="pagination-button-next"]',
      "a.pagination__next",
      // Generic patterns
      'nav[aria-label*="pagination" i] a:last-child',
      '.pagination a[rel="next"]',
      "ul.pagination li:last-child a",
      // Text-based (fallback)
      'a:has-text("Next")',
      'button:has-text("Next")',
      'a:has-text("N\xE4chste")',
      'button:has-text("N\xE4chste")',
      'a:has-text("Weiter")',
      'button:has-text("Weiter")'
    ];
    for (const selector of nextPageSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isDisabled = await page.evaluate((el) => {
            return el.hasAttribute("disabled") || el.classList.contains("disabled") || el.getAttribute("aria-disabled") === "true" || el.style.pointerEvents === "none";
          }, element);
          if (!isDisabled) {
            console.log(`Scraper: Found next page button with selector: ${selector}`);
            await element.click();
            return true;
          }
        }
      } catch (e) {
      }
    }
    const clicked = await page.evaluate(() => {
      var _a, _b;
      const nextTexts = ["next", "n\xE4chste", "weiter", "\u203A", "\xBB", "mehr anzeigen", "show more", "load more"];
      const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const el of elements) {
        const text = ((_a = el.textContent) == null ? void 0 : _a.toLowerCase().trim()) || "";
        const ariaLabel = ((_b = el.getAttribute("aria-label")) == null ? void 0 : _b.toLowerCase()) || "";
        if (nextTexts.some((nt) => text.includes(nt) || ariaLabel.includes(nt))) {
          if (!el.hasAttribute("disabled") && !el.classList.contains("disabled")) {
            el.click();
            return true;
          }
        }
      }
      return false;
    });
    if (clicked) {
      console.log("Scraper: Clicked next page via text fallback");
      return true;
    }
    console.log("Scraper: No more pages or next button not found");
    return false;
  } catch (e) {
    console.log("Scraper: Error finding next page:", e);
    return false;
  }
}
async function openLinkedIn(userId, url) {
  activeBrowser = await launchBrowser({ headless: false, args: ["--start-maximized"] });
  const page = await activeBrowser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return { success: true };
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
async function scrapeLinkedInJobsWithAI(query, location, userId, callAI2, hunterModel) {
  let browser = null;
  const jobUrls = [];
  try {
    console.log(`LinkedIn AI Scraper: Searching for "${query}" in "${location}"`);
    await logAction(userId, "ai_hunter", `\u{1F916} Using AI-assisted LinkedIn scraping for: ${query}`, "in_progress");
    const linkedInDataDir = import_path3.default.join(app3.getPath("userData"), "linkedin_browser_data");
    browser = await launchBrowser({
      headless: false,
      userDataDir: linkedInDataDir,
      args: ["--start-maximized"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    console.log(`LinkedIn AI Scraper: Navigating to ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45e3 });
    await randomDelay(3e3, 5e3);
    await handleCookieRoadblock(page, userId, callAI2);
    const pageContent = await page.evaluate(() => document.body.innerText);
    if (await isPageBlocked(page) || pageContent.includes("Sign in") || pageContent.includes("Join now")) {
      console.log("LinkedIn AI Scraper: Detected login wall or block");
      await logAction(userId, "ai_hunter", `\u26A0\uFE0F LinkedIn requires login. Please sign in manually.`, "in_progress");
      await randomDelay(5e3, 1e4);
      const newPageContent = await page.evaluate(() => document.body.innerText);
      if (newPageContent.includes("Sign in") || await isPageBlocked(page)) {
        await logAction(userId, "ai_hunter", `\u274C LinkedIn login required. Please configure LinkedIn credentials.`, "failed", false);
        return [];
      }
    }
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await randomDelay(1500, 2500);
    }
    const urls = await page.evaluate(() => {
      const links = [];
      const selectors = [
        "a.job-card-container__link",
        "a.base-card__full-link",
        '.jobs-search__results-list a[href*="/jobs/view/"]',
        'a[data-tracking-control-name*="job"]',
        'a[href*="/jobs/view/"]'
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const href = el.href;
          if (href && href.includes("/jobs/") && !links.includes(href)) {
            links.push(href);
          }
        });
      }
      return links;
    });
    if (urls.length > 0) {
      console.log(`LinkedIn AI Scraper: Found ${urls.length} job URLs`);
      jobUrls.push(...urls.slice(0, 25));
      await logAction(userId, "ai_hunter", `\u2705 Found ${urls.length} LinkedIn jobs`, "completed", true);
    } else {
      console.log("LinkedIn AI Scraper: Standard extraction failed, using AI...");
      if (hunterModel) {
        const pageText = await page.evaluate(() => {
          return document.body.innerText.substring(0, 5e3);
        });
        const aiPrompt = `Analyze this LinkedIn job search results page and extract any job posting URLs or job IDs you can find.
        
PAGE CONTENT:
${pageText}

If you find job URLs, return them as a JSON array. If you can see job IDs (like numbers in "jobs/view/123456"), construct the full URLs.
Return ONLY a JSON array of URLs: ["https://linkedin.com/jobs/view/123", ...]
If no jobs found, return: []`;
        try {
          const aiResponse = await callAI2(hunterModel, aiPrompt);
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiUrls = JSON.parse(jsonMatch[0]);
            if (Array.isArray(aiUrls) && aiUrls.length > 0) {
              jobUrls.push(...aiUrls.slice(0, 25));
              await logAction(userId, "ai_hunter", `\u2705 AI extracted ${aiUrls.length} LinkedIn jobs`, "completed", true);
            }
          }
        } catch (aiError) {
          console.error("AI extraction failed:", aiError);
        }
      }
      if (jobUrls.length === 0) {
        await logAction(userId, "ai_hunter", `\u274C Could not find LinkedIn jobs. Please try logging in manually.`, "failed", false);
      }
    }
    return jobUrls;
  } catch (error) {
    console.error("LinkedIn AI Scraper Error:", error.message);
    await logAction(userId, "ai_hunter", `\u274C LinkedIn scraping error: ${error.message}`, "failed", false);
    return [];
  } finally {
    if (browser) {
      setTimeout(() => {
        browser == null ? void 0 : browser.close().catch(() => {
        });
      }, 5e3);
    }
  }
}
var import_puppeteer2, import_path3, app3, activeBrowser, getUserDataDir2;
var init_scraper_service = __esm({
  "src/main/scraper-service.ts"() {
    import_puppeteer2 = __toESM(require("puppeteer"), 1);
    init_database();
    import_path3 = __toESM(require("path"), 1);
    try {
      app3 = require("electron").app;
    } catch (e) {
      app3 = global.electronApp;
    }
    activeBrowser = null;
    getUserDataDir2 = () => {
      return import_path3.default.join(app3.getPath("userData"), "browser_data");
    };
  }
});

// src/main/features/compatibility-service.ts
async function getProfileBySource(userId) {
  const models = await getAllQuery("SELECT * FROM ai_models");
  const auditor = models.find((m) => m.role === "Auditor" && m.status === "active");
  const source = (auditor == null ? void 0 : auditor.auditor_source) || "all";
  const profiles = await getAllQuery("SELECT * FROM user_profile");
  const linkedinProfile = profiles.find((p) => p.source === "linkedin");
  const manualProfile = profiles.find((p) => p.source === "manual");
  const baseProfile = profiles[0];
  const db = getDatabase();
  const documents = db.documents || [];
  const uploadedCvs = documents.filter((d) => d.doc_type === "uploaded_cv");
  let selectedProfile = baseProfile;
  let usedSource = "combined";
  switch (source) {
    case "linkedin":
      if (linkedinProfile) {
        selectedProfile = linkedinProfile;
        usedSource = "LinkedIn Profile";
      }
      break;
    case "manual":
      if (manualProfile) {
        selectedProfile = manualProfile;
        usedSource = "Manual Profile";
      }
      break;
    case "uploaded_cv":
      if (uploadedCvs.length > 0) {
        usedSource = "Uploaded CV: " + (uploadedCvs[0].file_name || "CV Document");
      }
      selectedProfile = baseProfile;
      break;
    case "all":
    default:
      usedSource = "All Sources (Combined)";
      break;
  }
  return { profile: selectedProfile, source: usedSource };
}
async function calculateCompatibility(userId, jobId) {
  const { profile, source } = await getProfileBySource(userId);
  const searchProfiles = await getAllQuery("SELECT * FROM search_profiles");
  const activeProfile = searchProfiles.find((p) => p.is_active === 1) || searchProfiles[0];
  let languageProficiencies = {};
  try {
    if (activeProfile == null ? void 0 : activeProfile.language_proficiencies) {
      languageProficiencies = JSON.parse(activeProfile.language_proficiencies);
    }
  } catch (e) {
  }
  const db = getDatabase();
  const learnedCriteria = (db.auditor_criteria || []).filter((c) => c.user_id === userId);
  const jobs = await getAllQuery("SELECT * FROM job_listings");
  const job = jobs.find((j) => j.id === jobId);
  if (!profile || !job) {
    return createEmptyResult();
  }
  const skillsScore = calculateSkillsMatch(profile, job);
  const experienceScore = calculateExperienceMatch(profile, job);
  const educationScore = calculateEducationMatch(profile, job);
  const locationScore = calculateLocationMatch(profile, job);
  const languageScore = calculateLanguageMatch(profile, job, languageProficiencies, learnedCriteria);
  const alreadyAnswered = learnedCriteria.map((c) => c.criteria);
  const existingQuestions = (db.auditor_questions || []).filter((q) => q.user_id === userId && q.job_id === jobId);
  const recalculatedSkillsScore = recalculateSkillsWithLearnedCriteria(
    skillsScore,
    learnedCriteria
  );
  skillsScore.score = recalculatedSkillsScore.score;
  skillsScore.matched = recalculatedSkillsScore.matched;
  skillsScore.missing = recalculatedSkillsScore.missing;
  if (skillsScore.missing.length > 0) {
    console.log(`Compatibility: Found ${skillsScore.missing.length} missing skills after checking learned criteria`);
    const skillsToAsk = skillsScore.missing.filter((skill) => {
      const criteriaKey = `tool_${skill.toLowerCase().replace(/\s+/g, "_")}`;
      return !alreadyAnswered.includes(criteriaKey) && !existingQuestions.some((q) => q.criteria === criteriaKey) && !learnedCriteria.some((c) => c.criteria === criteriaKey);
    }).slice(0, 5);
    const validSkillsToAsk = skillsToAsk.filter((s) => s && s.toLowerCase() !== "not specified" && s.toLowerCase() !== "n/a");
    if (validSkillsToAsk.length > 0) {
      console.log(`Compatibility: Generating ${skillsToAsk.length} questions BEFORE finalizing score...`);
      for (const skill of validSkillsToAsk) {
        const criteriaKey = `tool_${skill.toLowerCase().replace(/\s+/g, "_")}`;
        const questionText = `Do you have experience working with ${skill}? (Please confirm if this is part of your skillset)`;
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          await runQuery("INSERT INTO auditor_questions", {
            id: questionId,
            user_id: userId,
            job_id: jobId,
            question: questionText,
            criteria: criteriaKey,
            answered: false,
            timestamp: Date.now()
          });
          console.log(`Compatibility: Created question for skill "${skill}"`);
        } catch (e) {
          console.error(`Error creating question for ${skill}:`, e);
        }
      }
      const unansweredCount = skillsToAsk.length;
      const totalSkills = skillsScore.matched.length + skillsScore.missing.length;
      if (totalSkills > 0) {
        const assumedMatches = Math.ceil(unansweredCount * 0.5);
        const adjustedMatchCount = skillsScore.matched.length + assumedMatches;
        skillsScore.score = Math.round(adjustedMatchCount / totalSkills * 100);
        console.log(`Compatibility: Adjusted score from ${recalculatedSkillsScore.score} to ${skillsScore.score} (pending ${unansweredCount} questions)`);
      }
    }
  }
  const totalScore = Math.round(
    skillsScore.score * 0.35 + experienceScore * 0.3 + educationScore * 0.15 + locationScore * 0.1 + languageScore * 0.1
  );
  let level;
  if (totalScore >= 76) level = "gold";
  else if (totalScore >= 51) level = "green";
  else if (totalScore >= 26) level = "yellow";
  else level = "red";
  await runQuery("UPDATE job_listings", {
    id: jobId,
    compatibility_score: totalScore,
    compatibility_source: source,
    compatibility_matched_skills: JSON.stringify(skillsScore.matched),
    compatibility_missing_skills: JSON.stringify(skillsScore.missing),
    compatibility_breakdown: JSON.stringify({
      skills: skillsScore.score,
      experience: experienceScore,
      education: educationScore,
      location: locationScore,
      language: languageScore
    })
  });
  return {
    score: totalScore,
    level,
    matchedSkills: skillsScore.matched,
    missingSkills: skillsScore.missing,
    experienceMatch: experienceScore,
    educationMatch: educationScore,
    locationMatch: locationScore > 50,
    profileSource: source,
    breakdown: {
      skills: skillsScore.score,
      experience: experienceScore,
      education: educationScore,
      location: locationScore
    }
  };
}
function recalculateSkillsWithLearnedCriteria(originalScore, learnedCriteria) {
  const matched = [...originalScore.matched];
  const missing = [...originalScore.missing];
  for (let i = missing.length - 1; i >= 0; i--) {
    const skill = missing[i];
    const criteriaKey = `tool_${skill.toLowerCase().replace(/\s+/g, "_")}`;
    const userCriteria = learnedCriteria.find((c) => c.criteria === criteriaKey);
    if (userCriteria && userCriteria.userAnswer === "yes") {
      matched.push(skill);
      missing.splice(i, 1);
      console.log(`Compatibility: User confirmed they have "${skill}" - adding to matched`);
    }
  }
  const totalRequired = matched.length + missing.length;
  const newScore = totalRequired > 0 ? Math.round(matched.length / totalRequired * 100) : 60;
  return { score: newScore, matched, missing };
}
function calculateSkillsMatch(profile, job) {
  const userSkills = extractSkills(profile);
  const { hardSkills, softSkills } = extractJobSkillsWithType(job);
  const requiredSkills = hardSkills;
  if (requiredSkills.length === 0) {
    return { score: 60, matched: [], missing: [] };
  }
  const matched = [];
  const missing = [];
  for (const required of requiredSkills) {
    const found = userSkills.some(
      (skill) => skill.toLowerCase().includes(required.toLowerCase()) || required.toLowerCase().includes(skill.toLowerCase()) || areSimilarSkills(skill, required)
    );
    if (found) {
      matched.push(required);
    } else {
      missing.push(required);
    }
  }
  let score = requiredSkills.length > 0 ? Math.round(matched.length / requiredSkills.length * 100) : 60;
  const softSkillsMatched = softSkills.filter(
    (soft) => userSkills.some(
      (skill) => skill.toLowerCase().includes(soft.toLowerCase()) || soft.toLowerCase().includes(skill.toLowerCase())
    )
  );
  if (softSkills.length > 0 && softSkillsMatched.length > 0) {
    const softBonus = Math.round(softSkillsMatched.length / softSkills.length * 15);
    score = Math.min(100, score + softBonus);
  }
  return { score, matched, missing };
}
function extractSkills(profile) {
  const skills = [];
  if (profile.skills) {
    if (typeof profile.skills === "string") {
      skills.push(...profile.skills.split(",").map((s) => s.trim()));
    } else if (Array.isArray(profile.skills)) {
      skills.push(...profile.skills);
    }
  }
  if (profile.certifications) {
    if (typeof profile.certifications === "string") {
      skills.push(...profile.certifications.split(",").map((s) => s.trim()));
    } else if (Array.isArray(profile.certifications)) {
      skills.push(...profile.certifications);
    }
  }
  if (profile.summary) {
    const technicalTerms = extractTechnicalTerms(profile.summary);
    skills.push(...technicalTerms);
  }
  return [...new Set(skills.filter((s) => s.length > 1))];
}
function extractJobSkillsWithType(job) {
  const hardSkills = [];
  const softSkills = [];
  const softSkillPatterns = [
    // Communication & Interpersonal
    "communication",
    "kommunikation",
    "teamwork",
    "team player",
    "teamarbeit",
    "leadership",
    "f\xFChrung",
    "f\xFChrungsqualit\xE4ten",
    "interpersonal",
    "collaboration",
    "zusammenarbeit",
    "networking",
    "relationship building",
    "stakeholder management",
    "written communication",
    "verbal communication",
    "presentation skills",
    "public speaking",
    "active listening",
    "negotiation",
    "persuasion",
    // Problem Solving & Thinking
    "problem solving",
    "problem-solving",
    "probleml\xF6sung",
    "critical thinking",
    "analytical thinking",
    "analytical skills",
    "analytisch",
    "strategic thinking",
    "creative thinking",
    "creativity",
    "kreativit\xE4t",
    "innovation",
    "innovative",
    "decision making",
    "entscheidungsfindung",
    "judgment",
    "reasoning",
    // Work Habits & Attitude
    "time management",
    "zeitmanagement",
    "adaptability",
    "anpassungsf\xE4higkeit",
    "flexibility",
    "flexibilit\xE4t",
    "motivation",
    "self-motivated",
    "selbstmotiviert",
    "detail oriented",
    "detail-oriented",
    "detailorientiert",
    "attention to detail",
    "organizational",
    "organisiert",
    "multitasking",
    "prioritization",
    "work ethic",
    "strong work ethic",
    "arbeitsmoral",
    "positive attitude",
    "enthusiasm",
    "begeisterung",
    "passion",
    "leidenschaft",
    "dedication",
    "commitment",
    "engagement",
    "drive",
    "initiative",
    "eigeninitiative",
    "proactive",
    "proaktiv",
    "self starter",
    "self-starter",
    "selbstst\xE4ndig",
    // Personal Qualities
    "customer service",
    "kundenservice",
    "customer focus",
    "kundenorientierung",
    "conflict resolution",
    "konfliktl\xF6sung",
    "empathy",
    "empathie",
    "emotional intelligence",
    "emotionale intelligenz",
    "stress management",
    "punctuality",
    "p\xFCnktlichkeit",
    "reliability",
    "zuverl\xE4ssigkeit",
    "accountability",
    "verantwortungsbewusstsein",
    "patience",
    "geduld",
    "resilience",
    "resilienz",
    "open minded",
    "open-minded",
    "aufgeschlossen",
    "curious",
    "neugierig",
    "willingness to learn",
    "lernbereitschaft",
    "growth mindset",
    "can-do attitude",
    "positive mindset",
    // Generic buzzwords that should not block candidates
    "dynamic",
    "dynamisch",
    "energetic",
    "professional",
    "professionell",
    "fast learner",
    "quick learner",
    "schnelle auffassungsgabe",
    "independent",
    "selbst\xE4ndig",
    "team-oriented",
    "teamorientiert",
    "goal-oriented",
    "zielorientiert",
    "results-driven",
    "ergebnisorientiert",
    "hands-on",
    "hands on",
    "praktisch",
    "pragmatic",
    "structured",
    "strukturiert"
  ];
  const allSkills = [];
  if (job.required_skills) {
    if (typeof job.required_skills === "string") {
      allSkills.push(...job.required_skills.split(",").map((s) => s.trim()));
    } else if (Array.isArray(job.required_skills)) {
      allSkills.push(...job.required_skills);
    }
  }
  if (job.description) {
    const technicalTerms = extractTechnicalTerms(job.description);
    allSkills.push(...technicalTerms);
  }
  const uniqueSkills = [...new Set(allSkills.filter((s) => s.length > 1))];
  for (const skill of uniqueSkills) {
    const skillLower = skill.toLowerCase();
    const isSoftSkill = softSkillPatterns.some(
      (pattern) => skillLower.includes(pattern) || pattern.includes(skillLower)
    );
    if (isSoftSkill) {
      softSkills.push(skill);
    } else {
      hardSkills.push(skill);
    }
  }
  return {
    hardSkills: hardSkills.slice(0, 20),
    // Limit to top 20 hard skills
    softSkills: softSkills.slice(0, 10)
    // Limit to top 10 soft skills
  };
}
function extractTechnicalTerms(text) {
  const technicalPatterns = [
    // Programming languages
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|PHP|Swift|Kotlin|Scala)\b/gi,
    // Frameworks
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|Laravel|Rails)\b/gi,
    // Tools & Technologies
    /\b(AWS|Azure|GCP|Docker|Kubernetes|Git|Jenkins|CI\/CD|Terraform|Ansible)\b/gi,
    // Databases
    /\b(SQL|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Oracle|DynamoDB)\b/gi,
    // Methodologies (only technical ones - NOT soft skills)
    /\b(Agile|Scrum|Kanban|PMP|Six Sigma|Lean|DevOps|ITIL)\b/gi
    // DO NOT include soft skills like Leadership, Communication, etc.
    // Those are handled separately in extractJobSkillsWithType()
  ];
  const terms = [];
  for (const pattern of technicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms.push(...matches.map((m) => m.trim()));
    }
  }
  return [...new Set(terms)];
}
function areSimilarSkills(skill1, skill2) {
  const s1 = skill1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = skill2.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;
  const variations = {
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "python": ["py"],
    "kubernetes": ["k8s"],
    "postgresql": ["postgres", "psql"],
    "mongodb": ["mongo"],
    "nodejs": ["node", "expressjs"],
    "reactjs": ["react", "reactnative"],
    "projectmanagement": ["pm", "projectmanager"],
    "machinelearning": ["ml", "ai", "deeplearning"]
  };
  for (const [base, alts] of Object.entries(variations)) {
    if ((s1 === base || alts.includes(s1)) && (s2 === base || alts.includes(s2))) {
      return true;
    }
  }
  return false;
}
function calculateExperienceMatch(profile, job) {
  let userYears = 0;
  let longestRoleYears = 0;
  if (profile.experiences && Array.isArray(profile.experiences)) {
    for (const exp of profile.experiences) {
      if (exp.start_date && exp.end_date) {
        const start = new Date(exp.start_date);
        const end = exp.end_date === "Present" ? /* @__PURE__ */ new Date() : new Date(exp.end_date);
        const roleYears = (end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24 * 365);
        userYears += roleYears;
        longestRoleYears = Math.max(longestRoleYears, roleYears);
      }
    }
  }
  let requiredYears = 0;
  const description = (job.description || "").toLowerCase();
  const experienceLevel = (job.experience_level || "").toLowerCase();
  if (experienceLevel.includes("entry") || experienceLevel.includes("junior")) {
    requiredYears = 1;
  } else if (experienceLevel.includes("mid") || experienceLevel.includes("intermediate")) {
    requiredYears = 3;
  } else if (experienceLevel.includes("senior")) {
    requiredYears = 5;
  } else if (experienceLevel.includes("lead") || experienceLevel.includes("principal")) {
    requiredYears = 7;
  }
  const yearsMatch = description.match(/(\d+)\+?\s*years?\s*(of)?\s*(experience|exp)/i);
  if (yearsMatch) {
    requiredYears = Math.max(requiredYears, parseInt(yearsMatch[1]));
  }
  if (requiredYears === 0) return 70;
  const transitionBonus = longestRoleYears >= 5 ? 15 : longestRoleYears >= 3 ? 10 : 0;
  if (userYears >= requiredYears) {
    const exceedBonus = Math.min((userYears - requiredYears) * 5, 15);
    return Math.min(85 + exceedBonus, 100);
  } else {
    const ratio = userYears / requiredYears;
    const baseScore = Math.round(ratio * 70);
    return Math.min(baseScore + transitionBonus, 85);
  }
}
function calculateEducationMatch(profile, job) {
  const description = (job.description || "").toLowerCase();
  const userEducation = profile.education || [];
  const levels = {
    "high school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "phd": 5,
    "doctorate": 5
  };
  let requiredLevel = 0;
  if (description.includes("phd") || description.includes("doctorate")) requiredLevel = 5;
  else if (description.includes("master") || description.includes("mba") || description.includes("m.sc")) requiredLevel = 4;
  else if (description.includes("bachelor") || description.includes("b.sc") || description.includes("degree")) requiredLevel = 3;
  else if (description.includes("associate")) requiredLevel = 2;
  if (requiredLevel === 0) return 70;
  let userLevel = 0;
  if (Array.isArray(userEducation)) {
    for (const edu of userEducation) {
      const degree = (edu.degree || "").toLowerCase();
      for (const [key, value] of Object.entries(levels)) {
        if (degree.includes(key)) {
          userLevel = Math.max(userLevel, value);
        }
      }
    }
  }
  if (userLevel >= requiredLevel) {
    return 100;
  } else if (userLevel === requiredLevel - 1) {
    return 70;
  } else {
    return Math.max(30, userLevel * 15);
  }
}
function calculateLocationMatch(profile, job) {
  const userLocation = (profile.location || "").toLowerCase();
  const jobLocation = (job.location || "").toLowerCase();
  const jobType = (job.job_type || "").toLowerCase();
  if (jobType.includes("remote") || jobLocation.includes("remote")) {
    return 100;
  }
  if (!userLocation || !jobLocation) {
    return 50;
  }
  const userParts = userLocation.split(",").map((p) => p.trim());
  const jobParts = jobLocation.split(",").map((p) => p.trim());
  for (const userPart of userParts) {
    for (const jobPart of jobParts) {
      if (userPart.includes(jobPart) || jobPart.includes(userPart)) {
        return 100;
      }
    }
  }
  const userCountry = userParts[userParts.length - 1];
  const jobCountry = jobParts[jobParts.length - 1];
  if (userCountry === jobCountry) {
    return 70;
  }
  return 30;
}
function createEmptyResult() {
  return {
    score: 0,
    level: "red",
    matchedSkills: [],
    missingSkills: [],
    experienceMatch: 0,
    educationMatch: 0,
    locationMatch: false,
    breakdown: {
      skills: 0,
      experience: 0,
      education: 0,
      location: 0
    }
  };
}
function calculateLanguageMatch(profile, job, languageProficiencies, learnedCriteria) {
  var _a;
  const jobDescription = (job.description || "").toLowerCase();
  const jobLanguages = (job.languages || "").toLowerCase();
  const requiredLanguages = [];
  const commonLanguages = ["english", "german", "french", "spanish", "italian", "dutch", "portuguese", "chinese", "japanese", "korean", "russian", "arabic", "hindi", "polish", "swedish", "norwegian", "danish", "finnish", "czech", "hungarian", "turkish", "greek", "hebrew", "thai", "vietnamese", "indonesian", "malay"];
  for (const lang of commonLanguages) {
    if (jobDescription.includes(lang) || jobLanguages.includes(lang)) {
      requiredLanguages.push(lang);
    }
  }
  const hasNativeRequirement = jobDescription.includes("native speaker") || jobDescription.includes("mother tongue") || jobDescription.includes("fluent");
  if (requiredLanguages.length === 0) {
    return 80;
  }
  const userLanguages = profile.languages || [];
  const userLanguagesLower = (Array.isArray(userLanguages) ? userLanguages : []).map((l) => l.toLowerCase());
  const userProficienciesLower = {};
  for (const [lang, level] of Object.entries(languageProficiencies)) {
    userProficienciesLower[lang.toLowerCase()] = level;
  }
  const learnedLanguages = {};
  if (learnedCriteria) {
    for (const c of learnedCriteria) {
      const criteriaLower = c.criteria.toLowerCase();
      for (const lang of commonLanguages) {
        if (criteriaLower.includes(lang) || criteriaLower.includes("speak " + lang)) {
          learnedLanguages[lang] = c.userAnswer === "yes";
        }
      }
    }
  }
  let matchedCount = 0;
  for (const required of requiredLanguages) {
    if (learnedLanguages[required] === true) {
      matchedCount++;
      continue;
    }
    if (learnedLanguages[required] === false) {
      continue;
    }
    const hasLanguage = userLanguagesLower.some((l) => l.includes(required) || required.includes(l));
    const hasProficiency = Object.keys(userProficienciesLower).some(
      (l) => l.includes(required) || required.includes(l)
    );
    if (hasLanguage || hasProficiency) {
      matchedCount++;
      const profLevel = (_a = Object.entries(userProficienciesLower).find(
        ([l]) => l.includes(required) || required.includes(l)
      )) == null ? void 0 : _a[1];
      if (profLevel && ["C1", "C2"].includes(profLevel)) {
        matchedCount += 0.2;
      }
    }
  }
  const matchRatio = matchedCount / requiredLanguages.length;
  let score = Math.round(matchRatio * 100);
  if (hasNativeRequirement && matchRatio < 1) {
    score = Math.max(score - 10, 0);
  }
  return score;
}
async function calculateAllCompatibility(userId) {
  const jobs = await getAllQuery("SELECT * FROM job_listings");
  for (const job of jobs) {
    if (!job.compatibility_score || job.compatibility_score === 0) {
      await calculateCompatibility(userId, job.id);
    }
  }
}
async function getJobsByCompatibility(userId, minLevel) {
  const jobs = await getAllQuery("SELECT * FROM job_listings");
  const minScore = {
    "red": 0,
    "yellow": 26,
    "green": 51,
    "gold": 76
  }[minLevel];
  return jobs.filter((job) => (job.compatibility_score || 0) >= minScore);
}
var init_compatibility_service = __esm({
  "src/main/features/compatibility-service.ts"() {
    init_database();
  }
});

// src/main/features/Hunter-engine.ts
var Hunter_engine_exports = {};
__export(Hunter_engine_exports, {
  analyzeJobUrl: () => analyzeJobUrl,
  cancelHunterSearch: () => cancelHunterSearch,
  isGhostJob: () => isGhostJob,
  isHunterCancelled: () => isHunterCancelled,
  isSearching: () => isSearching2,
  reportGhostJobLocal: () => reportGhostJobLocal,
  setSearchingState: () => setSearchingState,
  startHunterSearch: () => startHunterSearch
});
function setSearchingState(state) {
  isSearching2 = state;
}
function cancelHunterSearch() {
  hunterCancelled = true;
  console.log("Hunter search cancellation requested");
}
function isHunterCancelled() {
  return hunterCancelled;
}
function translateLocationForWebsite(location, websiteUrl) {
  const locationLower = location.toLowerCase();
  const isGermanSite = websiteUrl.includes(".de") || websiteUrl.includes("arbeitsagentur") || websiteUrl.includes("stepstone.de") || websiteUrl.includes("xing.de");
  const isFrenchSite = websiteUrl.includes(".fr");
  const isSpanishSite = websiteUrl.includes(".es");
  const isItalianSite = websiteUrl.includes(".it");
  const countryTranslations = {
    "de": {
      // German
      "germany": "Deutschland",
      "berlin": "Berlin",
      "munich": "M\xFCnchen",
      "cologne": "K\xF6ln",
      "hamburg": "Hamburg",
      "frankfurt": "Frankfurt",
      "austria": "\xD6sterreich",
      "switzerland": "Schweiz",
      "europe": "Europa"
    },
    "fr": {
      // French
      "france": "France",
      "paris": "Paris",
      "germany": "Allemagne",
      "spain": "Espagne",
      "italy": "Italie",
      "europe": "Europe"
    },
    "es": {
      // Spanish
      "spain": "Espa\xF1a",
      "madrid": "Madrid",
      "barcelona": "Barcelona",
      "germany": "Alemania",
      "france": "Francia",
      "europe": "Europa"
    },
    "it": {
      // Italian
      "italy": "Italia",
      "rome": "Roma",
      "milan": "Milano",
      "germany": "Germania",
      "spain": "Spagna",
      "france": "Francia",
      "europe": "Europa"
    }
  };
  if (isGermanSite && countryTranslations["de"][locationLower]) {
    const translated = countryTranslations["de"][locationLower];
    console.log(`Hunter: Translating location "${location}" \u2192 "${translated}" for German site`);
    return translated;
  } else if (isFrenchSite && countryTranslations["fr"][locationLower]) {
    const translated = countryTranslations["fr"][locationLower];
    console.log(`Hunter: Translating location "${location}" \u2192 "${translated}" for French site`);
    return translated;
  } else if (isSpanishSite && countryTranslations["es"][locationLower]) {
    const translated = countryTranslations["es"][locationLower];
    console.log(`Hunter: Translating location "${location}" \u2192 "${translated}" for Spanish site`);
    return translated;
  } else if (isItalianSite && countryTranslations["it"][locationLower]) {
    const translated = countryTranslations["it"][locationLower];
    console.log(`Hunter: Translating location "${location}" \u2192 "${translated}" for Italian site`);
    return translated;
  }
  return location;
}
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
    console.log("Step 7: Calculating compatibility score...");
    try {
      const compatResult = await calculateCompatibility(userId, jobId);
      console.log(`Compatibility: ${compatResult.score}% (${compatResult.level})`);
      await logAction(userId, "ai_auditor", `\u{1F4CA} Match: ${compatResult.level.toUpperCase()} (${compatResult.score}%)`, "completed", true);
      await generateAuditorQuestions(userId, jobId, updateData, compatResult);
    } catch (compatError) {
      console.log("Compatibility calculation error:", compatError.message);
    }
    await logAction(userId, "ai_auditor", `\u2705 Extracted: ${jobTitle} at ${companyName}`, "completed", true);
    console.log(`\u2705 SUCCESS: ${jobTitle} at ${companyName}`);
  } catch (parseError) {
    console.log("\u274C Parse error:", parseError.message);
    await logAction(userId, "ai_auditor", `\u274C Parse failed`, "failed", false);
    const fallbackData = extractBasicInfo(pageData.content, url);
    if (fallbackData.jobTitle) {
      await runQuery("UPDATE job_listings", { id: jobId, ...fallbackData, status: "analyzed", date_imported: (/* @__PURE__ */ new Date()).toLocaleDateString() });
      console.log("\u2705 Saved with fallback:", fallbackData);
      try {
        await calculateCompatibility(userId, jobId);
      } catch (e) {
      }
    } else {
      await runQuery("UPDATE job_listings", { id: jobId, status: "manual_review" });
    }
  }
}
async function generateAuditorQuestions(userId, jobId, jobData, compatResult) {
  try {
    const db = getDatabase();
    const existingQuestions = db.auditor_questions || [];
    const learnedCriteria = (db.auditor_criteria || []).filter((c) => c.user_id === userId);
    const profiles = await getAllQuery("SELECT * FROM user_profile");
    const profile = profiles[0];
    const userLanguages = (profile == null ? void 0 : profile.languages) ? typeof profile.languages === "string" ? JSON.parse(profile.languages) : profile.languages : [];
    const userLanguagesLower = userLanguages.map((l) => l.toLowerCase());
    const userSkills = (profile == null ? void 0 : profile.skills) ? typeof profile.skills === "string" ? JSON.parse(profile.skills) : profile.skills : [];
    const userSkillsLower = userSkills.map((s) => s.toLowerCase());
    const userLicenses = (profile == null ? void 0 : profile.licenses) ? typeof profile.licenses === "string" ? JSON.parse(profile.licenses) : profile.licenses : [];
    const userLicensesLower = userLicenses.map((l) => l.toLowerCase());
    const searchProfiles = await getAllQuery("SELECT * FROM search_profiles");
    const activeProfile = searchProfiles.find((p) => p.is_active === 1) || searchProfiles[0];
    let languageProficiencies = [];
    try {
      if (activeProfile == null ? void 0 : activeProfile.language_proficiencies) {
        languageProficiencies = Object.keys(JSON.parse(activeProfile.language_proficiencies)).map((l) => l.toLowerCase());
      }
    } catch (e) {
    }
    const jobDesc = (jobData.description || "").toLowerCase();
    const languages = (jobData.languages || "").toLowerCase();
    const requiredSkills = (jobData.required_skills || "").toLowerCase();
    const questionsToAdd = [];
    const criteriaExists = (criteria) => {
      const criteriaLower = criteria.toLowerCase();
      return learnedCriteria.some((c) => c.criteria.toLowerCase() === criteriaLower) || existingQuestions.some(
        (q) => q.user_id === userId && q.criteria.toLowerCase() === criteriaLower && !q.answered
      );
    };
    const commonLanguages = ["english", "german", "french", "spanish", "italian", "dutch", "portuguese", "chinese", "japanese", "korean", "russian", "arabic", "turkish", "polish", "czech", "hungarian", "greek", "hebrew", "hindi", "vietnamese", "swedish", "norwegian", "danish", "finnish"];
    for (const lang of commonLanguages) {
      if ((jobDesc.includes(lang) || languages.includes(lang)) && !userLanguagesLower.some((l) => l.includes(lang)) && !languageProficiencies.some((l) => l.includes(lang))) {
        const criteria = `speak_${lang}`;
        if (!criteriaExists(criteria)) {
          const langCapitalized = lang.charAt(0).toUpperCase() + lang.slice(1);
          questionsToAdd.push({
            question: `Are you proficient in ${langCapitalized}? (Required for this position)`,
            criteria,
            category: "language"
          });
        }
      }
    }
    const certPatterns = [
      { pattern: /\b(pmp|project management professional)\b/i, name: "PMP certification" },
      { pattern: /\b(scrum master|csm|psm)\b/i, name: "Scrum Master certification" },
      { pattern: /\b(aws certified|aws certification)\b/i, name: "AWS certification" },
      { pattern: /\b(azure certified|microsoft certified)\b/i, name: "Azure/Microsoft certification" },
      { pattern: /\b(gcp certified|google cloud)\b/i, name: "Google Cloud certification" },
      { pattern: /\b(cissp|security+|comptia security)\b/i, name: "Security certification (CISSP/Security+)" },
      { pattern: /\b(cpa|certified public accountant)\b/i, name: "CPA certification" },
      { pattern: /\b(six sigma|lean)\b/i, name: "Six Sigma/Lean certification" },
      { pattern: /\b(itil)\b/i, name: "ITIL certification" },
      { pattern: /\b(prince2)\b/i, name: "PRINCE2 certification" },
      { pattern: /\b(cfa|chartered financial analyst)\b/i, name: "CFA certification" },
      { pattern: /\b(ccna|ccnp|cisco certified)\b/i, name: "Cisco certification (CCNA/CCNP)" },
      { pattern: /\b(oracle certified)\b/i, name: "Oracle certification" },
      { pattern: /\b(salesforce certified)\b/i, name: "Salesforce certification" },
      { pattern: /\b(kubernetes certified|cka|ckad)\b/i, name: "Kubernetes certification" }
    ];
    for (const { pattern, name } of certPatterns) {
      if (pattern.test(jobDesc)) {
        const hasIt = userLicensesLower.some((l) => pattern.test(l)) || userSkillsLower.some((s) => pattern.test(s));
        if (!hasIt) {
          const criteria = `cert_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          if (!criteriaExists(criteria)) {
            questionsToAdd.push({
              question: `Do you hold a valid ${name}? (This certification is mentioned in the job description)`,
              criteria,
              category: "certification"
            });
          }
        }
      }
    }
    const techPatterns = [
      { pattern: /\b(sap)\b/i, name: "SAP", question: "Do you have experience working with SAP?" },
      { pattern: /\b(salesforce)\b/i, name: "Salesforce", question: "Do you have experience with Salesforce?" },
      { pattern: /\b(jira|confluence)\b/i, name: "Jira/Confluence", question: "Are you experienced with Jira and Confluence?" },
      { pattern: /\b(tableau|power bi)\b/i, name: "BI Tools", question: "Do you have experience with Tableau or Power BI?" },
      { pattern: /\b(autocad|solidworks|catia)\b/i, name: "CAD Software", question: "Do you have experience with CAD software (AutoCAD, SolidWorks, etc.)?" },
      { pattern: /\b(matlab|simulink)\b/i, name: "MATLAB", question: "Do you have experience with MATLAB/Simulink?" },
      { pattern: /\b(blockchain|web3|smart contract)\b/i, name: "Blockchain", question: "Do you have experience with blockchain/Web3 development?" }
    ];
    for (const { pattern, name, question } of techPatterns) {
      if (pattern.test(jobDesc) || pattern.test(requiredSkills)) {
        const hasIt = userSkillsLower.some((s) => pattern.test(s));
        if (!hasIt) {
          const criteria = `tool_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          if (!criteriaExists(criteria)) {
            questionsToAdd.push({
              question,
              criteria,
              category: "tool"
            });
          }
        }
      }
    }
    const workAuthPatterns = [
      { pattern: /\b(work permit|arbeitserlaubnis|visa sponsorship)\b/i, criteria: "work_permit", question: "Do you have a valid work permit for this location?" },
      { pattern: /\b(eu citizen|eu passport|european union citizen)\b/i, criteria: "eu_citizen", question: "Are you an EU citizen?" },
      { pattern: /\b(security clearance)\b/i, criteria: "security_clearance", question: "Do you have or can you obtain security clearance?" },
      { pattern: /\b(driver.?s? license|führerschein)\b/i, criteria: "drivers_license", question: "Do you have a driver's license?" }
    ];
    for (const { pattern, criteria, question } of workAuthPatterns) {
      if (pattern.test(jobDesc)) {
        if (!criteriaExists(criteria)) {
          questionsToAdd.push({
            question,
            criteria,
            category: "work_authorization"
          });
        }
      }
    }
    const travelPatterns = [
      { pattern: /\b(travel required|willingness to travel|reisebereitschaft)\b/i, criteria: "willing_travel", question: "Are you willing to travel for work?" },
      { pattern: /\b(relocat|umzugsbereitschaft)\b/i, criteria: "willing_relocate", question: "Are you willing to relocate for this position?" },
      { pattern: /\b(on.?site|onsite only|no remote)\b/i, criteria: "onsite_ok", question: "Are you able to work on-site at the office location?" }
    ];
    for (const { pattern, criteria, question } of travelPatterns) {
      if (pattern.test(jobDesc)) {
        if (!criteriaExists(criteria)) {
          questionsToAdd.push({
            question,
            criteria,
            category: "work_preference"
          });
        }
      }
    }
    const questionsToInsert = questionsToAdd.slice(0, 5);
    for (const { question, criteria, category } of questionsToInsert) {
      if (!criteria || criteria.toLowerCase().includes("not_specified")) continue;
      const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await runQuery("INSERT INTO auditor_questions", {
        id: questionId,
        user_id: userId,
        job_id: jobId,
        question,
        criteria,
        category,
        answered: false,
        timestamp: Date.now()
      });
      console.log(`Generated Auditor question (${category}): ${question}`);
    }
    if (questionsToInsert.length > 0) {
      console.log(`Generated ${questionsToInsert.length} Auditor questions for job ${jobId}`);
    }
  } catch (e) {
    console.log("Error generating Auditor questions:", e.message);
  }
}
async function isGhostJob(jobData, userId) {
  console.log(`GJN: Checking reputation for ${jobData.company_name}...`);
  if (jobData.posted_date && jobData.posted_date !== "N/A") {
    try {
      const posted = new Date(jobData.posted_date);
      const now = /* @__PURE__ */ new Date();
      const diffDays = (now.getTime() - posted.getTime()) / (1e3 * 60 * 60 * 24);
      if (diffDays > 30) {
        return { isGhost: true, reason: "Job posted more than 30 days ago." };
      }
    } catch (e) {
    }
  }
  const db = getDatabase();
  const flaggedCompanies = (db.company_monitoring || []).filter((c) => c.status === "flagged").map((c) => c.name.toLowerCase());
  if (flaggedCompanies.includes(jobData.company_name.toLowerCase())) {
    return { isGhost: true, reason: "Company is flagged in your monitoring list." };
  }
  const ghostKeywords = ["evergreen", "pipeline", "future opportunities", "not a specific opening", "general application"];
  const desc = (jobData.description || "").toLowerCase();
  if (ghostKeywords.some((k) => desc.includes(k))) {
    return { isGhost: true, reason: "Description matches 'Evergreen/Pipeline' patterns." };
  }
  return { isGhost: false, reason: "" };
}
async function reportGhostJobLocal(jobId, userId, reason) {
  console.log(`GJN: Flagging job ${jobId} as Ghost. Reason: ${reason}`);
  await runQuery("UPDATE job_listings", { id: jobId, status: "ghost_job_detected", ghost_reason: reason });
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
  hunterCancelled = false;
  isSearching2 = true;
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
      isSearching2 = false;
      return { success: false, error: errorMsg };
    }
    if (profiles.length === 0) {
      const errorMsg = "No active search profiles. Go to Search Profiles and create one.";
      console.log("\u274C", errorMsg);
      await logAction(userId, "ai_hunter", `\u274C ${errorMsg}`, "failed", false);
      isSearching2 = false;
      return { success: false, error: errorMsg };
    }
    if (websites.length === 0) {
      const errorMsg = "No active job websites. Go to Job Websites and add one.";
      console.log("\u274C", errorMsg);
      await logAction(userId, "ai_hunter", `\u274C ${errorMsg}`, "failed", false);
      isSearching2 = false;
      return { success: false, error: errorMsg };
    }
    let totalJobsFound = 0;
    for (const profile of profiles) {
      if (hunterCancelled) {
        console.log("Hunter search cancelled by user");
        await logAction(userId, "ai_hunter", `\u23F9\uFE0F Search cancelled. Found ${totalJobsFound} jobs before stopping.`, "completed", true);
        isSearching2 = false;
        return { success: true, jobsFound: totalJobsFound, cancelled: true };
      }
      const jobTitles = (profile.job_titles || profile.job_title || "").split(",").map((t) => t.trim()).filter(Boolean);
      if (jobTitles.length === 0) {
        console.log("No job titles found in profile, skipping");
        continue;
      }
      console.log(`
Profile: ${jobTitles.join(", ")} in ${profile.location}`);
      for (const jobTitle of jobTitles) {
        if (hunterCancelled) break;
        console.log(`
Searching for job title: "${jobTitle}"`);
        await logAction(userId, "ai_hunter", `\u{1F50D} Searching for: ${jobTitle}`, "in_progress");
        for (const website of websites) {
          if (hunterCancelled) {
            console.log("Hunter search cancelled by user");
            await logAction(userId, "ai_hunter", `\u23F9\uFE0F Search cancelled. Found ${totalJobsFound} jobs before stopping.`, "completed", true);
            isSearching2 = false;
            return { success: true, jobsFound: totalJobsFound, cancelled: true };
          }
          console.log(`Website: ${website.website_name} (${website.website_url})`);
          await logAction(userId, "ai_hunter", `\u{1F310} Searching ${website.website_name} for "${jobTitle}"...`, "in_progress");
          const query = jobTitle;
          console.log(`Search query: "${query}"`);
          const translatedLocation = translateLocationForWebsite(profile.location || "", website.website_url);
          let jobUrls = [];
          const ScraperService = (init_scraper_service(), __toCommonJS(scraper_service_exports));
          if (website.website_url.includes("linkedin.com")) {
            jobUrls = await scrapeJobs(
              website.website_url,
              query,
              translatedLocation,
              { email: website.email, password: website.password },
              userId,
              callAI2
            );
            if (jobUrls.length === 0 && hunter) {
              console.log("Standard LinkedIn scraping failed, trying AI-assisted approach...");
              await logAction(userId, "ai_hunter", `\u{1F916} Trying AI-assisted LinkedIn scraping...`, "in_progress");
              jobUrls = await ScraperService.scrapeLinkedInJobsWithAI(
                query,
                translatedLocation,
                userId,
                callAI2,
                hunter
              );
            }
          } else {
            jobUrls = await scrapeJobs(
              website.website_url,
              query,
              translatedLocation,
              { email: website.email, password: website.password },
              userId,
              callAI2
            );
          }
          console.log(`Found ${jobUrls.length} URLs`);
          await logAction(userId, "ai_hunter", `\u{1F4E5} Found ${jobUrls.length} jobs on ${website.website_name}`, "completed", true);
          for (const url of jobUrls) {
            if (hunterCancelled) {
              console.log("Hunter search cancelled by user");
              await logAction(userId, "ai_hunter", `\u23F9\uFE0F Search cancelled. Found ${totalJobsFound} jobs before stopping.`, "completed", true);
              return { success: true, jobsFound: totalJobsFound, cancelled: true };
            }
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
    }
    await logAction(userId, "ai_hunter", `\u2705 Done! Processed ${totalJobsFound} jobs.`, "completed", true);
    console.log(`
========== HUNT COMPLETE: ${totalJobsFound} jobs ==========
`);
    isSearching2 = false;
    return { success: true, jobsFound: totalJobsFound };
  } catch (error) {
    console.error("Hunt error:", error);
    await logAction(userId, "ai_hunter", `\u274C Error: ${error.message}`, "failed", false);
    isSearching2 = false;
    return { success: false, error: error.message };
  } finally {
    isSearching2 = false;
  }
}
var hunterCancelled, isSearching2;
var init_Hunter_engine = __esm({
  "src/main/features/Hunter-engine.ts"() {
    init_database();
    init_scraper_service();
    init_compatibility_service();
    hunterCancelled = false;
    isSearching2 = false;
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
    await logAction(userId, "pdf", `\u{1F4C4} Converting to PDF: ${path4.basename(htmlPath)}`, "in_progress");
    if (!fs3.existsSync(htmlPath)) {
      return { success: false, error: "HTML file not found" };
    }
    const htmlContent = fs3.readFileSync(htmlPath, "utf-8");
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
    browser = await import_puppeteer3.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
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
    await logAction(userId, "pdf", `\u2705 PDF created: ${path4.basename(pdfPath)}`, "completed", true);
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
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
    browser = await import_puppeteer3.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const pdfPath = path4.join(getDocsDir(), `${fileName}.pdf`);
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
var import_puppeteer3, fs3, path4, app4, getDocsDir;
var init_pdf_export = __esm({
  "src/main/features/pdf-export.ts"() {
    import_puppeteer3 = __toESM(require("puppeteer"), 1);
    fs3 = __toESM(require("fs"), 1);
    path4 = __toESM(require("path"), 1);
    init_database();
    try {
      app4 = require("electron").app;
    } catch (e) {
      app4 = global.electronApp;
    }
    getDocsDir = () => {
      const docsPath = path4.join(app4.getPath("userData"), "generated_docs");
      if (!fs3.existsSync(docsPath)) {
        fs3.mkdirSync(docsPath, { recursive: true });
      }
      return docsPath;
    };
  }
});

// src/main/features/doc-generator.ts
var doc_generator_exports = {};
__export(doc_generator_exports, {
  generateSingleDocument: () => generateSingleDocument,
  generateTailoredDocs: () => generateTailoredDocs
});
async function getProfileByThinkerSource(userId, thinker) {
  const source = (thinker == null ? void 0 : thinker.thinker_source) || "all";
  const db = getDatabase();
  const profiles = db.user_profile || [];
  const linkedinProfile = profiles.find((p) => p.source === "linkedin");
  const manualProfile = profiles.find((p) => p.source === "manual");
  const baseProfile = profiles[0];
  const documents = db.documents || [];
  const uploadedCvs = documents.filter((d) => d.doc_type === "uploaded_cv");
  let selectedProfile = baseProfile;
  switch (source) {
    case "linkedin":
      if (linkedinProfile) {
        selectedProfile = linkedinProfile;
      }
      break;
    case "manual":
      if (manualProfile) {
        selectedProfile = manualProfile;
      }
      break;
    case "uploaded_cv":
      if (uploadedCvs.length > 0) {
        selectedProfile = baseProfile;
      }
      break;
    case "all":
    default:
      selectedProfile = baseProfile;
      break;
  }
  return selectedProfile;
}
function cleanAIOutput(content) {
  let cleaned = content || "";
  cleaned = cleaned.replace(/^\s*\{\s*"(coverLetter|motivationLetter|cv|letter|portfolio|proposal)"\s*:\s*"/i, "");
  cleaned = cleaned.replace(/"\s*\}\s*$/i, "");
  cleaned = cleaned.replace(/```[a-z]*\n?/gi, "");
  cleaned = cleaned.replace(/```/g, "");
  cleaned = cleaned.replace(/^Here is (the|your|a) (motivation letter|cover letter|CV|resume|portfolio|proposal)[:\s]*/i, "");
  cleaned = cleaned.replace(/^(Below is|I've created|I have written)[^.]*\.\s*/i, "");
  cleaned = cleaned.replace(/—/g, "-");
  cleaned = cleaned.replace(/–/g, "-");
  cleaned = cleaned.replace(/\\n/g, "\n");
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/^\s*[\[{]/, "");
  cleaned = cleaned.replace(/[\]}]\s*$/, "");
  cleaned = cleaned.trim();
  return cleaned;
}
function stripLetterGreetingAndClosing(text, isGerman) {
  let out = (text || "").trim();
  const greetingPatterns = isGerman ? [
    /^\s*(sehr\s+geehrte[rn]?|liebe[rn]?|hallo)\b[^\n]*\n+/i,
    /^\s*\b(guten\s+tag|guten\s+morgen|guten\s+abend)\b[^\n]*\n+/i
  ] : [
    /^\s*dear\b[^\n]*\n+/i,
    /^\s*to\s+the\s+hiring\s+manager\b[^\n]*\n+/i,
    /^\s*hello\b[^\n]*\n+/i
  ];
  for (const re of greetingPatterns) {
    out = out.replace(re, "").trim();
  }
  const closingPatterns = isGerman ? [
    /\n\s*(mit\s+freundlichen\s+gr\u00fc\u00dfen|freundliche\s+gr\u00fc\u00dfe|beste\s+gr\u00fc\u00dfe|hochachtungsvoll)[^\n]*$/i
  ] : [
    /\n\s*(kind\s+regards|best\s+regards|sincerely|yours\s+sincerely|yours\s+faithfully)[^\n]*$/i
  ];
  for (const re of closingPatterns) {
    out = out.replace(re, "").trim();
  }
  out = out.replace(/\n\s*[A-Z][A-Za-z\-\s]{2,}\s*$/i, "").trim();
  return out;
}
function detectJobLanguage(job) {
  const raw = `${(job == null ? void 0 : job.job_title) || ""} ${(job == null ? void 0 : job.required_skills) || ""} ${(job == null ? void 0 : job.description) || ""}`.trim();
  const jobText = raw.toLowerCase();
  const lang3 = (0, import_franc_min.franc)(raw || "");
  const iso6393ToLanguageName = {
    deu: "GERMAN",
    eng: "ENGLISH",
    fra: "FRENCH",
    spa: "SPANISH",
    ita: "ITALIAN",
    nld: "DUTCH",
    por: "PORTUGUESE",
    rus: "RUSSIAN",
    ukr: "UKRAINIAN",
    pol: "POLISH",
    tur: "TURKISH",
    ara: "ARABIC",
    hin: "HINDI",
    zho: "CHINESE",
    jpn: "JAPANESE",
    kor: "KOREAN"
  };
  let targetLanguage = iso6393ToLanguageName[lang3] || "ENGLISH";
  const germanSignals = [
    "kenntnisse",
    "erfahrung",
    "aufgaben",
    "profil",
    "wir bieten",
    "bewerbung",
    "anschreiben",
    "lebenslauf",
    "m/w/d",
    "ihr profil",
    "ihre aufgaben",
    "anforderungen",
    "qualifikation",
    "teamf\xE4higkeit",
    "selbst\xE4ndig",
    "unbefristet",
    "vollzeit",
    "teilzeit",
    "standort",
    "deutsch",
    "entwickler",
    "ingenieur",
    "abschluss"
  ];
  if (lang3 === "und" && germanSignals.some((k) => jobText.includes(k))) {
    targetLanguage = "GERMAN";
  }
  const isGerman = targetLanguage === "GERMAN";
  return { isGerman, targetLanguage, lang3 };
}
function getJobDateFolder(job, isGerman) {
  const raw = (job == null ? void 0 : job.date_imported) || (job == null ? void 0 : job.dateImported) || (job == null ? void 0 : job.date_scraped) || (job == null ? void 0 : job.dateScraped);
  let d;
  if (raw) {
    const parsed = new Date(raw);
    d = isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
  } else {
    d = /* @__PURE__ */ new Date();
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function normalizeProfileArrays(profile) {
  const parseField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  };
  return {
    ...profile,
    experiences: parseField(profile.experiences),
    educations: parseField(profile.educations),
    skills: parseField(profile.skills),
    licenses: parseField(profile.licenses),
    languages: parseField(profile.languages)
  };
}
function tokenize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z\u00c0-\u017F0-9\+\#\.\-\s]/g, " ").split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
}
function computeRelevanceScore(itemText, jobTokens) {
  const tokens = tokenize(itemText);
  let score = 0;
  for (const t of tokens) {
    if (jobTokens.has(t)) score += 3;
  }
  const lower = String(itemText || "").toLowerCase();
  for (const jt of Array.from(jobTokens)) {
    if (jt.length >= 4 && lower.includes(jt)) score += 1;
  }
  return score;
}
function filterProfileForJob(userProfile, job) {
  const jobText = `${(job == null ? void 0 : job.job_title) || ""} ${(job == null ? void 0 : job.required_skills) || ""} ${(job == null ? void 0 : job.description) || ""}`;
  const jobTokens = new Set(tokenize(jobText));
  const skillsRaw = Array.isArray(userProfile == null ? void 0 : userProfile.skills) ? userProfile.skills : [];
  const certsRaw = Array.isArray(userProfile == null ? void 0 : userProfile.licenses) ? userProfile.licenses : [];
  const skillStrings = skillsRaw.map((s) => {
    if (typeof s === "string") return s;
    return (s == null ? void 0 : s.name) || (s == null ? void 0 : s.title) || JSON.stringify(s);
    function ensureTargetLanguageOrRetry2(args) {
      return (async () => {
        const { docKey, content, lang3, targetLanguage, callAI: callAI2, thinker, originalPrompt } = args;
        const detected = (0, import_franc_min.franc)(String(content || ""));
        const acceptable = () => {
          if (!content || String(content).trim().length < 40) return true;
          if (lang3 === "und") return true;
          if (detected === "und") return true;
          return detected === lang3;
        };
        if (acceptable()) return content;
        const fixPrompt = `${originalPrompt}

CRITICAL FIX:
- The previous output language detection was '${detected}' but the job description language is '${lang3}' which corresponds to ${targetLanguage}.
- REWRITE the document so that it is 100% in ${targetLanguage}. Do NOT include any other language.
- Return ONLY the rewritten content.`;
        const retryRaw = await callAI2(thinker, fixPrompt);
        if (!retryRaw || String(retryRaw).startsWith("Error:")) return content;
        const cleaned = cleanAIOutput(retryRaw);
        const retryDetected = (0, import_franc_min.franc)(String(cleaned || ""));
        if (retryDetected !== "und" && lang3 !== "und" && retryDetected !== lang3) {
          return cleaned;
        }
        return cleaned;
      })();
    }
  });
  const certStrings = certsRaw.map((c) => {
    if (typeof c === "string") return c;
    return (c == null ? void 0 : c.name) || (c == null ? void 0 : c.title) || (c == null ? void 0 : c.issuer) || JSON.stringify(c);
  });
  const scoredSkills = skillStrings.map((s) => ({ s, score: computeRelevanceScore(s, jobTokens) })).sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));
  const scoredCerts = certStrings.map((s) => ({ s, score: computeRelevanceScore(s, jobTokens) })).sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));
  const relevantSkills = scoredSkills.filter((x) => x.score > 0).slice(0, 7).map((x) => x.s);
  const relevantCerts = scoredCerts.filter((x) => x.score > 0).slice(0, 5).map((x) => x.s);
  const finalSkills = relevantSkills.length > 0 ? relevantSkills : skillStrings.slice(0, 5);
  const finalCerts = relevantCerts.length > 0 ? relevantCerts : certStrings.slice(0, 3);
  const filteredProfile = {
    ...userProfile,
    skills: finalSkills,
    licenses: finalCerts
  };
  return { profile: filteredProfile, relevantSkills: finalSkills, relevantCerts: finalCerts };
}
function generateDocumentHTML(content, docType, userProfile, job, isGerman, targetLanguage) {
  const title = `${docType} - ${(userProfile == null ? void 0 : userProfile.name) || "Applicant"} - ${(job == null ? void 0 : job.company_name) || "Company"}`;
  const isLetter = docType.toLowerCase().includes("letter");
  const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString(isGerman ? "de-DE" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const lang = (targetLanguage || (isGerman ? "GERMAN" : "ENGLISH")).toUpperCase();
  const salutationMap = {
    GERMAN: "Sehr geehrte Damen und Herren,",
    ENGLISH: "Dear Hiring Manager,",
    FRENCH: "Madame, Monsieur,",
    SPANISH: "Estimado equipo de selecci\xF3n,",
    ITALIAN: "Gentile responsabile delle assunzioni,",
    DUTCH: "Geachte heer/mevrouw,",
    PORTUGUESE: "Prezado(a) respons\xE1vel pela contrata\xE7\xE3o,",
    POLISH: "Szanowni Pa\u0144stwo,",
    TURKISH: "Say\u0131n Yetkili,",
    RUSSIAN: "\u0423\u0432\u0430\u0436\u0430\u0435\u043C\u044B\u0435 \u0433\u043E\u0441\u043F\u043E\u0434\u0430,",
    UKRAINIAN: "\u0428\u0430\u043D\u043E\u0432\u043D\u0456 \u043F\u0430\u043D\u0456 \u0442\u0430 \u043F\u0430\u043D\u043E\u0432\u0435,",
    ARABIC: "\u0627\u0644\u0633\u0627\u062F\u0629/\u0627\u0644\u0633\u064A\u062F\u0627\u062A \u0627\u0644\u0645\u062D\u062A\u0631\u0645\u0648\u0646\u060C",
    HINDI: "\u092E\u093E\u0928\u0928\u0940\u092F \u091A\u092F\u0928 \u0938\u092E\u093F\u0924\u093F,",
    CHINESE: "\u5C0A\u656C\u7684\u62DB\u8058\u7ECF\u7406\uFF1A",
    JAPANESE: "\u63A1\u7528\u3054\u62C5\u5F53\u8005\u69D8",
    KOREAN: "\uCC44\uC6A9 \uB2F4\uB2F9\uC790\uB2D8\uAED8"
  };
  const closingMap = {
    GERMAN: "Mit freundlichen Gr\xFC\xDFen",
    ENGLISH: "Kind regards,",
    FRENCH: "Cordialement,",
    SPANISH: "Atentamente,",
    ITALIAN: "Cordiali saluti,",
    DUTCH: "Met vriendelijke groet,",
    PORTUGUESE: "Atenciosamente,",
    POLISH: "Z powa\u017Caniem,",
    TURKISH: "Sayg\u0131lar\u0131mla,",
    RUSSIAN: "\u0421 \u0443\u0432\u0430\u0436\u0435\u043D\u0438\u0435\u043C,",
    UKRAINIAN: "\u0417 \u043F\u043E\u0432\u0430\u0433\u043E\u044E,",
    ARABIC: "\u0645\u0639 \u062E\u0627\u0644\u0635 \u0627\u0644\u062A\u062D\u064A\u0629\u060C",
    HINDI: "\u0938\u093E\u0926\u0930,",
    CHINESE: "\u6B64\u81F4\n\u656C\u793C",
    JAPANESE: "\u656C\u5177",
    KOREAN: "\uAC10\uC0AC\uD569\uB2C8\uB2E4."
  };
  const salutation = salutationMap[lang] || salutationMap.ENGLISH;
  const closing = closingMap[lang] || closingMap.ENGLISH;
  let cleanContent = content;
  if (isLetter) {
    cleanContent = stripLetterGreetingAndClosing(cleanContent, isGerman);
  }
  return `<!DOCTYPE html>
<html lang="${isGerman ? "de" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 80px;
      background: #fff;
    }
    
    .letterhead {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }
    
    .applicant-info {
      text-align: left;
    }
    
    .applicant-name {
      font-size: 24px;
      font-weight: 700;
      color: #0077b5;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .applicant-contact {
      font-size: 13px;
      color: #666;
    }
    
    .applicant-contact p { margin: 1px 0; }
    
    .date-section {
      text-align: right;
      font-size: 14px;
      color: #444;
      margin-bottom: 30px;
    }
    
    .recipient-info {
      margin-bottom: 35px;
      font-size: 14px;
      color: #222;
      line-height: 1.5;
    }
    
    .recipient-info p { margin: 2px 0; }
    
    .salutation {
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 15px;
    }
    
    .content {
      font-size: 15px;
      text-align: justify;
      white-space: pre-wrap;
      margin-bottom: 40px;
    }
    
    .signature {
      margin-top: 40px;
    }
    
    .closing {
      margin-bottom: 30px;
      font-size: 15px;
    }
    
    .signature-name {
      font-weight: 700;
      font-size: 16px;
      color: #0077b5;
    }

    @media print {
      body { padding: 40px; }
      .letterhead { margin-bottom: 30px; }
    }
  </style>
</head>
<body>
  ${isLetter ? `
  <div class="letterhead">
    <div class="applicant-info">
      <div class="applicant-name">${(userProfile == null ? void 0 : userProfile.name) || "Your Name"}</div>
      <div class="applicant-contact">
        ${(userProfile == null ? void 0 : userProfile.email) ? `<p>${userProfile.email}</p>` : ""}
        ${(userProfile == null ? void 0 : userProfile.phone) ? `<p>${userProfile.phone}</p>` : ""}
        ${(userProfile == null ? void 0 : userProfile.location) ? `<p>${userProfile.location}</p>` : ""}
      </div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #999;">
      ${isGerman ? docType.toLowerCase().includes("motivation") ? "MOTIVATIONSSCHREIBEN" : docType.toLowerCase().includes("cover") ? "ANSCHREIBEN" : docType.toLowerCase().includes("portfolio") ? "PORTFOLIO" : docType.toUpperCase() : docType.toUpperCase()}
    </div>
  </div>
  
  <div class="date-section">${currentDate}</div>
  
  <div class="recipient-info">
    <p><strong>To: Hiring Manager</strong></p>
    <p>${(job == null ? void 0 : job.company_name) || "Company Name"}</p>
    ${(job == null ? void 0 : job.location) ? `<p>${job.location}</p>` : ""}
  </div>
  
  <div class="salutation">${salutation}</div>
  ` : `
  <div class="header" style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0077b5;">
    <div style="font-size: 32px; font-weight: 700; color: #0077b5; margin-bottom: 5px;">${(userProfile == null ? void 0 : userProfile.name) || "Your Name"}</div>
    <div style="font-size: 18px; color: #555; margin-bottom: 15px;">${(userProfile == null ? void 0 : userProfile.title) || "Professional Title"}</div>
    <div style="font-size: 14px; color: #666; display: flex; gap: 20px;">
      ${(userProfile == null ? void 0 : userProfile.email) ? `<span>\u{1F4E7} ${userProfile.email}</span>` : ""}
      ${(userProfile == null ? void 0 : userProfile.phone) ? `<span>\u{1F4F1} ${userProfile.phone}</span>` : ""}
      ${(userProfile == null ? void 0 : userProfile.location) ? `<span>\u{1F4CD} ${userProfile.location}</span>` : ""}
    </div>
  </div>
  `}
  
  <div class="content">${cleanContent.replace(/\n/g, "<br>")}</div>
  
  ${isLetter ? `
  <div class="signature">
    <div class="closing">${closing}</div>
    <div class="signature-name">${(userProfile == null ? void 0 : userProfile.name) || "Your Name"}</div>
  </div>
  ` : ""}
</body>
</html>`;
}
function generateCVHTML(content, userProfile, job, isGerman) {
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
            <span class="item-title">${exp.title || exp.job_title || exp}</span>
            ${exp.company || exp.company_name ? `<span class="item-company"> at ${exp.company || exp.company_name}</span>` : ""}
          </div>
          <span class="item-date">${exp.startDate || exp.start_date || ""} - ${exp.endDate || exp.end_date || "Present"}</span>
        </div>
        ${exp.location || exp.city ? `<div style="color: #666; font-size: 13px;">${exp.location || exp.city}</div>` : ""}
        ${exp.description || exp.summary ? `<div class="item-description">${exp.description || exp.summary}</div>` : ""}
      </div>
    `).join("");
  }
  let educationsHTML = "";
  if (Array.isArray(educations)) {
    educationsHTML = educations.map((edu) => `
      <div class="education-item">
        <div class="item-header">
          <div>
            <span class="item-title">${edu.degree || edu.qualification || edu}</span>
            ${edu.field || edu.major ? `<span class="item-company"> in ${edu.field || edu.major}</span>` : ""}
          </div>
          <span class="item-date">${edu.startYear || edu.start_year || edu.startDate || ""} - ${edu.endYear || edu.end_year || edu.endDate || ""}</span>
        </div>
        ${edu.school || edu.university || edu.institution ? `<div style="color: #666; font-size: 13px;">${edu.school || edu.university || edu.institution}</div>` : ""}
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
<html lang="${isGerman ? "de" : "en"}">
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
          <div class="section-title">${isGerman ? "Beruflicher Werdegang" : "Professional Summary"}</div>
          <div class="summary">${userProfile.summary}</div>
        </div>
      ` : ""}
      
      ${experiencesHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? "Berufserfahrung" : "Work Experience"}</div>
          ${experiencesHTML}
        </div>
      ` : ""}
      
      ${educationsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? "Ausbildung" : "Education"}</div>
          ${educationsHTML}
        </div>
      ` : ""}
    </div>
    
    <div class="right-column">
      ${skillsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? "Kenntnisse" : "Skills"}</div>
          ${skillsHTML}
        </div>
      ` : ""}
      
      ${certsHTML ? `
        <div class="section">
          <div class="section-title">${isGerman ? "Zertifizierungen" : "Certifications"}</div>
          ${certsHTML}
        </div>
      ` : ""}
      
      ${((_a = userProfile == null ? void 0 : userProfile.languages) == null ? void 0 : _a.length) > 0 ? `
        <div class="section">
          <div class="section-title">${isGerman ? "Sprachen" : "Languages"}</div>
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
function saveDocumentFile(content, jobId, docType, format = "html", companyName, position, dateFolder) {
  const docsDir = companyName && position ? getOrganizedDocsDir(companyName, position, dateFolder || "Unknown_Date") : getDocsDir2();
  const timestamp = Date.now();
  const fileName = `${docType}_job${jobId}_${timestamp}.${format}`;
  const filePath = path5.join(docsDir, fileName);
  console.log(`Saving document to: ${filePath}`);
  fs4.writeFileSync(filePath, content, "utf-8");
  console.log(`Document saved: ${filePath}`);
  return filePath;
}
async function generateTailoredDocs(job, userId, thinker, auditor, options, callAI2) {
  const db = getDatabase();
  const { isGerman, targetLanguage, lang3 } = detectJobLanguage(job);
  const dateFolder = getJobDateFolder(job, isGerman);
  let userProfile = await getProfileByThinkerSource(userId, thinker);
  if (!userProfile) {
    await logAction(userId, "ai_thinker", "\u274C No user profile found. Please create your profile first.", "failed", false);
    return;
  }
  userProfile = normalizeProfileArrays(userProfile);
  const filtered = filterProfileForJob(userProfile, job);
  const filteredProfile = filtered.profile;
  const motivationLetterWordLimit = (thinker == null ? void 0 : thinker.motivation_letter_word_limit) || "450";
  const coverLetterWordLimit = (thinker == null ? void 0 : thinker.cover_letter_word_limit) || "280";
  const cvPageLimit = (thinker == null ? void 0 : thinker.cv_page_limit) || "2";
  let companyResearch = "";
  try {
    await logAction(userId, "ai_thinker", `\u{1F50D} Researching ${job.company_name} mission and history...`, "in_progress");
    companyResearch = await getCompanyInfo(job.company_name, userId, callAI2);
  } catch (e) {
    console.error("Research failed:", e);
    companyResearch = "Research unavailable.";
  }
  for (const type of DOC_TYPES) {
    if (!(options == null ? void 0 : options[type.optionKey])) continue;
    try {
      await logAction(userId, "ai_thinker", `\u270D\uFE0F Generating tailored ${type.label} for ${job.company_name}`, "in_progress");
      await runQuery("UPDATE job_listings", {
        id: String(job.id),
        [`${type.key}_status`]: "generating",
        [`${type.key}_rejection_reason`]: null
      });
      const thinkerPrompt = buildThinkerPrompt({
        docKey: type.key,
        docLabel: type.label,
        userProfile: filteredProfile,
        job,
        companyResearch,
        feedback: "",
        constraints: {
          motivationLetterWordLimit,
          coverLetterWordLimit,
          cvPageLimit,
          targetLanguage,
          isGerman
        }
      });
      const rawContent = await callAI2(thinker, thinkerPrompt);
      if (!rawContent || String(rawContent).startsWith("Error:")) {
        throw new Error(rawContent || "AI returned empty content");
      }
      let content = cleanAIOutput(rawContent);
      content = await ensureTargetLanguageOrRetry({
        docKey: type.key,
        content,
        lang3,
        targetLanguage,
        callAI: callAI2,
        thinker,
        originalPrompt: thinkerPrompt
      });
      if (type.key === "motivation_letter" || type.key === "cover_letter") {
        content = stripLetterGreetingAndClosing(content, isGerman);
      }
      await logAction(userId, "ai_thinker", `\u2705 ${type.label} generated successfully`, "completed", true);
      const htmlContent = type.key === "cv" ? generateCVHTML(content, filteredProfile, job, isGerman) : generateDocumentHTML(content, type.label, filteredProfile, job, isGerman, targetLanguage);
      const htmlPath = saveDocumentFile(
        htmlContent,
        job.id,
        type.key,
        "html",
        job.company_name,
        job.job_title,
        dateFolder
      );
      const docId = Date.now() + Math.floor(Math.random() * 1e3);
      await runQuery("INSERT INTO documents", {
        id: docId,
        job_id: String(job.id),
        user_id: userId,
        document_type: type.key,
        content,
        file_path: htmlPath,
        version: 1,
        status: "final",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      await runQuery("UPDATE job_listings", {
        id: String(job.id),
        [`${type.key}_status`]: "auditor_done",
        [`${type.key}_path`]: htmlPath,
        [`${type.key}_rejection_reason`]: null
      });
      await logAction(userId, "ai_thinker", `\u{1F4C4} ${type.label} saved (HTML): ${htmlPath}`, "completed", true);
      try {
        const { convertHtmlToPdf: convertHtmlToPdf2 } = await Promise.resolve().then(() => (init_pdf_export(), pdf_export_exports));
        const pdfResult = await convertHtmlToPdf2(htmlPath, userId);
        if (pdfResult.success && pdfResult.pdfPath) {
          await runQuery("UPDATE job_listings", {
            id: String(job.id),
            [`${type.key}_pdf_path`]: pdfResult.pdfPath
          });
          await runQuery("UPDATE documents", {
            id: docId,
            file_path: pdfResult.pdfPath
          });
          await logAction(userId, "pdf", `\u2705 PDF created: ${path5.basename(pdfResult.pdfPath)}`, "completed", true);
        }
      } catch (pdfErr) {
        console.error("Auto-PDF conversion failed:", pdfErr);
      }
    } catch (e) {
      console.error(`Error generating ${type.key}:`, e);
      await runQuery("UPDATE job_listings", {
        id: String(job.id),
        [`${type.key}_status`]: "failed"
      });
      await logAction(userId, "ai_thinker", `\u274C Error: ${e.message}`, "failed", false);
    }
  }
}
function buildThinkerPrompt(args) {
  const {
    docKey,
    docLabel,
    userProfile,
    job,
    companyResearch,
    feedback,
    constraints
  } = args;
  const motivationWordLimit = constraints.motivationLetterWordLimit || "450";
  const coverWordLimit = constraints.coverLetterWordLimit || "280";
  const cvPageLimit = constraints.cvPageLimit || "2";
  const targetLanguage = constraints.targetLanguage;
  const isGerman = constraints.isGerman;
  const languageHardRule = `ABSOLUTE LANGUAGE RULE: Output MUST be 100% in ${targetLanguage}. Do NOT mix languages. Do NOT include any words, headings, salutations, or closings in any other language. If you output ANY other language, the document is INVALID.`;
  const baseContext = `
${languageHardRule}

PAGE LIMIT: ${cvPageLimit} A4 pages maximum (applies to ALL documents).

USER PROFILE (FILTERED FOR RELEVANCE - DO NOT ADD OTHER SKILLS/CERTS):
Name: ${(userProfile == null ? void 0 : userProfile.name) || "N/A"}
Title: ${(userProfile == null ? void 0 : userProfile.title) || "N/A"}
Location: ${(userProfile == null ? void 0 : userProfile.location) || "N/A"}
Email: ${(userProfile == null ? void 0 : userProfile.email) || "N/A"}
Phone: ${(userProfile == null ? void 0 : userProfile.phone) || "N/A"}
Summary: ${(userProfile == null ? void 0 : userProfile.summary) || "N/A"}
Experiences: ${JSON.stringify((userProfile == null ? void 0 : userProfile.experiences) || [])}
Skills (ONLY these 5-7): ${JSON.stringify((userProfile == null ? void 0 : userProfile.skills) || [])}
Education: ${JSON.stringify((userProfile == null ? void 0 : userProfile.educations) || [])}
Certifications (ONLY these 3-5): ${JSON.stringify((userProfile == null ? void 0 : userProfile.licenses) || [])}
Languages: ${JSON.stringify((userProfile == null ? void 0 : userProfile.languages) || [])}

JOB DETAILS:
Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || "N/A"}
Type: ${job.job_type || "N/A"}
Description: ${job.description || "N/A"}
Required Skills: ${job.required_skills || "N/A"}

COMPANY RESEARCH:
${companyResearch || "No additional company research available. Focus on what can be inferred from the job description."}

${feedback ? `PREVIOUS FEEDBACK FROM AUDITOR: ${feedback}
Please fix these issues in the new version.` : ""}
`;
  const prompts = {
    cv: `You are a professional CV/Resume writer. Create a tailored CV for this job application.

${languageHardRule}

CRITICAL LANGUAGE REQUIREMENT: You MUST write the entire CV in ${targetLanguage}. This includes all section headings, job descriptions, and summaries.

${baseContext}

RELEVANCE RULE:
- Include ONLY skills and certifications that are DIRECTLY RELEVANT to this specific job.
- If a certification or skill has no connection to the job requirements, OMIT IT.
- Quality over quantity. A focused CV is better than a long list of irrelevant items.

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT fabricate or hallucinate any information - use ONLY data from the provided profile
2. DO NOT invent job titles, companies, dates, or achievements not in the profile
3. DO NOT include any JSON formatting or markdown code blocks
4. DO NOT add meta-commentary like "Here is your CV"

NOTE: CV generation is NOT subject to word limits.

PAGE LIMIT REQUIREMENT:
- Keep the CV within ${cvPageLimit} A4 pages.
- If you must shorten, keep only the most relevant experiences and the TOP 5-7 skills and TOP 3-5 certifications (already provided above).

REQUIREMENTS:
1. Tailor the CV specifically to the job requirements.
2. RELEVANCE FILTER: Your profile contains many skills and certifications. You MUST ONLY include those that are DIRECTLY RELEVANT to this specific position. If a skill or certification is not mentioned or implied as useful in the job description, DO NOT include it. A concise, relevant CV is mandatory. DO NOT list more than 5-7 key skills and 3-5 relevant certifications.
3. Highlight relevant experiences and skills that match the job description - but ONLY from the provided profile.
3. Use action verbs and quantify achievements where the data exists in the profile
4. Keep it ATS-friendly (no tables, columns, graphics)
5. Include contact information at the top (from the profile)
6. LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.
7. Structure: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications, Languages

ATS OPTIMIZATION:
- IMPORTANT: Include relevant KEYWORDS from the job description in your CV where they genuinely apply
- If the job mentions specific tools, technologies, or skills that relate to your experience, use those exact terms
- Mirror the language and terminology used in the job posting where appropriate
- If there are skill gaps, don't fabricate - instead, emphasize transferable skills and related experience

STRUCTURE:
- CONTACT: Name, Title, Email, Phone, Location (from profile)
- PROFESSIONAL SUMMARY: 3-4 sentences summarizing experience relevant to this role. If there's a skill gap, briefly mention eagerness to apply existing skills to new challenges.
- WORK EXPERIENCE: List jobs from profile with title, company, dates, and bullet points
- EDUCATION: List degrees from profile
- SKILLS: List skills from profile, prioritizing those matching job requirements
- CERTIFICATIONS: List certifications from profile
- LANGUAGES: List languages from profile

OUTPUT FORMAT: Return ONLY the CV content in clean text format. Use clear section headings.`,
    motivation_letter: `You are an expert Motivation Letter writer. Create a compelling, HUMAN-SOUNDING motivation letter.

${baseContext}

WORD LIMIT: ${motivationWordLimit} words (this is configurable by the user)

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT start with "Here is the motivation letter:" or any similar meta-text
2. DO NOT include JSON formatting like { "motivationLetter": ... }
3. DO NOT mention "I could not find..." or "Research was unavailable"
4. DO NOT use long em-dashes (\u2014), use regular dashes (-) only
5. DO NOT use clich\xE9s: "I am thrilled", "passionate professional", "fast-paced world"
6. DO NOT start sentences with "I have..." or "I am..." repeatedly
7. DO NOT fabricate or hallucinate information - use ONLY data from the provided profile
8. DO NOT invent company facts not mentioned in the research - if unsure, focus on what's in the job posting
9. Output ONLY the letter BODY (main paragraphs). DO NOT include a date, recipient address, salutation (like "Dear...") or ANY closing/sign-off (like "Kind regards"). The system template will provide those automatically.
10. If you include any greeting or closing, it will be treated as an error.

HANDLING SKILL GAPS (IMPORTANT):
- If the candidate's profile doesn't perfectly match all job requirements, DO NOT reject or avoid the task
- Instead, express genuine enthusiasm to learn and adapt to the role's requirements
- Highlight transferable skills that relate to the missing requirements
- Show willingness to grow: phrases like "I am eager to expand my expertise in..." or "I look forward to developing my skills in..."
- Frame any gaps as growth opportunities, not weaknesses

STRUCTURE (follow exactly):
1. OPENING (1 paragraph): State who you are, what position, and ONE compelling reason why this company
2. COMPANY CONNECTION (1 paragraph): Reference something specific about the company - their products, services, recent news, or values. If research is limited, focus on what's clear from the job posting
3. YOUR VALUE (2 paragraphs):
   - First: Your most relevant experience with SPECIFIC metrics/achievements FROM YOUR ACTUAL PROFILE
   - Second: How your skills directly solve their needs OR how your transferable skills and eagerness to learn make you a strong candidate
4. WHY THIS ROLE (1 paragraph): Personal motivation - career goals, growth opportunity, alignment.
5. CLOSING (1 paragraph): Thank them, express enthusiasm for an interview

IMPORTANT: Do NOT include a greeting/salutation or any closing/sign-off.

MUST INCLUDE:
- At least 2 specific achievements with numbers/metrics FROM THE PROVIDED PROFILE
- At least 1 specific reference to the company (product, service, or value)
- Smooth transitions between paragraphs
- Professional but warm tone
- Proper sign-off with full name
- If skill gaps exist: Express enthusiasm to learn and adapt

Length: Approximately ${motivationWordLimit} words. This is a formal document.
LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.

Return ONLY the motivation letter BODY (paragraphs). Start directly with the first paragraph and end with the final paragraph. No greeting, no sign-off, no date, no address.`,
    cover_letter: `You are an expert Cover Letter writer. Create a concise, professional cover letter.

${baseContext}

WORD LIMIT: ${coverWordLimit} words (this is configurable by the user)

CRITICAL RULES - VIOLATIONS WILL CAUSE REJECTION:
1. DO NOT include any JSON formatting like { "coverLetter": ... }
2. DO NOT start with meta-text like "Here is the cover letter:"
3. DO NOT use long em-dashes (\u2014), use regular dashes (-) only
4. DO NOT fabricate or hallucinate information not provided in the profile
5. Output ONLY the letter body content. DO NOT include a salutation (like "Dear...") or closing (like "Kind regards"). The system will provide these automatically.

HANDLING SKILL GAPS:
- If there are gaps between the job requirements and the candidate's profile, highlight transferable skills
- Express genuine enthusiasm to learn and adapt
- Frame gaps as growth opportunities: "I am eager to develop my expertise in..."

REQUIREMENTS:
1. Be concise (approximately ${coverWordLimit} words)
2. Address the hiring manager professionally
3. Highlight 2-3 most relevant qualifications with specific examples FROM THE PROVIDED PROFILE ONLY
4. Show enthusiasm for the specific role AND for learning/growing
5. Include a clear call to action
6. No clich\xE9s or AI-sounding phrases
7. LANGUAGE: You MUST write the entire document in the SAME LANGUAGE as the job description provided above. If the job is in German, write in German. If in English, write in English.
8. Do NOT include any greeting/salutation or any closing/sign-off. The system template adds those.

STRUCTURE:
- Opening paragraph: state the position and express interest (1-2 sentences)
- Middle (2 paragraphs): your relevant qualifications and why you're a great fit
- Closing paragraph: thank them, suggest next steps

Return ONLY the cover letter BODY (paragraphs). No greeting, no sign-off.`,
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
async function generateSingleDocument(jobId, userId, docType, thinker, auditor, callAI2) {
  var _a, _b, _c, _d;
  const db = getDatabase();
  const job = (_a = db.job_listings) == null ? void 0 : _a.find((j) => String(j.id) === String(jobId));
  const userProfile = ((_b = db.user_profile) == null ? void 0 : _b.find((p) => p.id === userId)) || ((_c = db.user_profile) == null ? void 0 : _c[0]);
  if (!job) return { success: false, error: "Job not found" };
  if (!userProfile) return { success: false, error: "User profile not found" };
  const { isGerman, targetLanguage, lang3 } = detectJobLanguage(job);
  void targetLanguage;
  void isGerman;
  const options = {};
  const typeConfig = DOC_TYPES.find((t) => t.key === docType);
  if (typeConfig) {
    options[typeConfig.optionKey] = true;
  } else {
    return { success: false, error: `Unknown document type: ${docType}` };
  }
  await generateTailoredDocs(job, userId, thinker, auditor, options, callAI2);
  const updatedJob = (_d = db.job_listings) == null ? void 0 : _d.find((j) => String(j.id) === String(jobId));
  const filePath = (updatedJob == null ? void 0 : updatedJob[`${docType}_pdf_path`]) || (updatedJob == null ? void 0 : updatedJob[`${docType}_path`]);
  if (filePath) {
    return { success: true, filePath };
  }
  return { success: false, error: "Document generation failed" };
}
var import_franc_min, fs4, path5, app5, getBaseDocsDir, getOrganizedDocsDir, getDocsDir2, DOC_TYPES;
var init_doc_generator = __esm({
  "src/main/features/doc-generator.ts"() {
    init_database();
    init_scraper_service();
    import_franc_min = require("franc-min");
    fs4 = __toESM(require("fs"), 1);
    path5 = __toESM(require("path"), 1);
    try {
      app5 = require("electron").app;
    } catch (e) {
      app5 = global.electronApp;
    }
    getBaseDocsDir = () => {
      try {
        const db = getDatabase();
        const settings = (db.settings || [])[0] || {};
        const configuredRoot = settings.storage_path || settings.storagePath;
        const root = configuredRoot && String(configuredRoot).trim().length > 0 ? String(configuredRoot).trim() : path5.join(app5.getPath("userData"), "generated_docs");
        if (!fs4.existsSync(root)) {
          fs4.mkdirSync(root, { recursive: true });
        }
        return root;
      } catch {
        const fallback = path5.join(app5.getPath("userData"), "generated_docs");
        if (!fs4.existsSync(fallback)) fs4.mkdirSync(fallback, { recursive: true });
        return fallback;
      }
    };
    getOrganizedDocsDir = (companyName, position, dateFolder) => {
      const sanitize = (str) => String(str || "").replace(/[<>:"/\\|?*]/g, "_").trim().substring(0, 50);
      const company = sanitize(companyName || "Unknown_Company");
      const pos = sanitize(position || "Unknown_Position");
      const date = sanitize(dateFolder || "Unknown_Date");
      const docsPath = path5.join(getBaseDocsDir(), company, pos, date);
      if (!fs4.existsSync(docsPath)) {
        fs4.mkdirSync(docsPath, { recursive: true });
      }
      return docsPath;
    };
    getDocsDir2 = () => getBaseDocsDir();
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

// src/main/features/application-submitter.ts
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
    const browser = await import_puppeteer4.default.launch({
      headless: false,
      userDataDir: import_path4.default.join(import_electron3.app.getPath("userData"), "browser_data"),
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
        const fs7 = require("fs");
        const tempPath = import_path4.default.join(import_electron3.app.getPath("temp"), `tailored_cv_${jobId}.txt`);
        fs7.writeFileSync(tempPath, tailoredDoc.content);
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
var import_puppeteer4, import_path4, import_electron3;
var init_application_submitter = __esm({
  "src/main/features/application-submitter.ts"() {
    init_database();
    init_scraper_service();
    import_puppeteer4 = __toESM(require("puppeteer"), 1);
    import_path4 = __toESM(require("path"), 1);
    import_electron3 = require("electron");
  }
});

// src/main/ai-service.ts
var ai_service_exports = {};
__export(ai_service_exports, {
  analyzeJobUrl: () => analyzeJobUrl2,
  callAI: () => callAI,
  processAllPendingDocuments: () => processAllPendingDocuments,
  processApplication: () => processApplication,
  processDocumentWithLibrarian: () => processDocumentWithLibrarian,
  startHunterSearch: () => startHunterSearch2,
  startHuntingScheduler: () => startHuntingScheduler2,
  submitApplication: () => submitApplication2
});
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
async function submitApplication2(jobId, userId) {
  const models = await getAllQuery("SELECT * FROM ai_models");
  const observer = models.find((m) => m.role === "Observer" && m.status === "active") || models.find((m) => m.role === "Hunter" && m.status === "active");
  return await submitApplication(jobId, userId, observer, callAI);
}
async function processDocumentWithLibrarian(docId, userId) {
  try {
    const docs = await getAllQuery("SELECT * FROM documents");
    const doc = docs.find((d) => d.id === docId);
    if (!doc) {
      return { success: false, error: "Document not found" };
    }
    const models = await getAllQuery("SELECT * FROM ai_models");
    const librarian = models.find((m) => m.role === "Librarian" && m.status === "active");
    if (!librarian) {
      await runQuery("UPDATE documents", { id: docId, ai_status: "failed: No Librarian AI configured" });
      return { success: false, error: "No Librarian AI model configured. Add one in Settings > AI Team." };
    }
    await runQuery("UPDATE documents", { id: docId, ai_status: "reading" });
    let prompt = "";
    const fileType = doc.file_type || "";
    const fileName = doc.file_name || "document";
    const userFriendlyPrompt = `You are a document analysis assistant helping a job seeker organize their application materials.

IMPORTANT: Respond in a friendly, conversational way - NOT in JSON, code, or technical format.
Write as if you're a helpful career advisor talking to the user.

Document: "${fileName}"

Analyze this document and provide:
1. A brief description of what this document is (1 sentence)
2. How it will be used in job applications (1-2 sentences)
3. A "ready status" - is this document suitable for applications?

Format your response like this:
\u{1F4C4} [Document Type]: [Brief description]
\u2728 Use in Applications: [How the app will use this]
${fileName.toLowerCase().includes("cv") || fileName.toLowerCase().includes("resume") ? "\u2705 Ready to use for applications!" : "\u2705 Saved and ready!"}

Keep it short and encouraging - max 3-4 lines total.`;
    if (fileType.includes("image")) {
      prompt = userFriendlyPrompt + `

This is an image file - likely a certificate, diploma, or credential photo.`;
      await runQuery("UPDATE documents", { id: docId, ai_status: "analyzing" });
      const summary = await callAI(librarian, prompt, doc.content);
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      await runQuery("UPDATE documents", {
        id: docId,
        ai_status: "verified",
        ai_summary: cleanedSummary
      });
    } else if (fileType.includes("pdf")) {
      prompt = userFriendlyPrompt + `

This is a PDF document.`;
      await runQuery("UPDATE documents", { id: docId, ai_status: "analyzing" });
      const summary = await callAI(librarian, prompt);
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      await runQuery("UPDATE documents", {
        id: docId,
        ai_status: "verified",
        ai_summary: cleanedSummary
      });
    } else {
      prompt = userFriendlyPrompt;
      await runQuery("UPDATE documents", { id: docId, ai_status: "analyzing" });
      const summary = await callAI(librarian, prompt);
      const cleanedSummary = cleanLibrarianResponse(summary, fileName);
      await runQuery("UPDATE documents", {
        id: docId,
        ai_status: "verified",
        ai_summary: cleanedSummary
      });
    }
    await logAction(userId, "librarian", `\u{1F4DA} Analyzed document: ${fileName}`, "completed", true);
    return { success: true };
  } catch (error) {
    console.error("Librarian processing error:", error);
    await runQuery("UPDATE documents", { id: docId, ai_status: `failed: ${error.message}` });
    return { success: false, error: error.message };
  }
}
function cleanLibrarianResponse(response, fileName) {
  var _a;
  let cleaned = response;
  cleaned = cleaned.replace(/```json[\s\S]*?```/gi, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/gi, "");
  cleaned = cleaned.replace(/\{[\s\S]*?"document_type"[\s\S]*?\}/gi, "");
  cleaned = cleaned.replace(/\{[\s\S]*?"type"[\s\S]*?\}/gi, "");
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n");
  cleaned = cleaned.trim();
  if (!cleaned || cleaned.length < 20 || cleaned.includes('"document_type"') || cleaned.includes("```")) {
    const ext = ((_a = fileName.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
    const name = fileName.replace(/\.[^.]+$/, "");
    if (ext === "pdf") {
      if (name.toLowerCase().includes("cv") || name.toLowerCase().includes("resume")) {
        cleaned = `\u{1F4C4} CV/Resume: Your main CV document.
\u2728 Will be tailored for each job application.
\u2705 Ready to use!`;
      } else if (name.toLowerCase().includes("cert") || name.toLowerCase().includes("diploma") || name.toLowerCase().includes("belt")) {
        cleaned = `\u{1F4DC} Certificate/Credential: "${name}" certification.
\u2728 Can be referenced to highlight your qualifications.
\u2705 Saved and ready!`;
      } else if (name.toLowerCase().includes("cover") || name.toLowerCase().includes("letter")) {
        cleaned = `\u2709\uFE0F Cover Letter: Your cover letter template.
\u2728 Will be customized for applications.
\u2705 Ready to use!`;
      } else {
        cleaned = `\u{1F4C4} Document: "${name}"
\u2728 Saved to your document library.
\u2705 Ready for applications!`;
      }
    } else if (["jpg", "jpeg", "png", "gif"].includes(ext)) {
      cleaned = `\u{1F5BC}\uFE0F Image: "${name}" credential/certificate.
\u2728 Visual proof of your qualification.
\u2705 Saved and verified!`;
    } else {
      cleaned = `\u{1F4C4} Document: "${name}"
\u2728 Added to your application materials.
\u2705 Ready!`;
    }
  }
  return cleaned;
}
async function processAllPendingDocuments(userId) {
  try {
    const docs = await getAllQuery("SELECT * FROM documents");
    const pending = docs.filter((d) => !d.ai_status || d.ai_status === "pending");
    for (const doc of pending) {
      await processDocumentWithLibrarian(doc.id, userId);
    }
  } catch (error) {
    console.error("Failed to process pending documents:", error);
  }
}
var import_axios, huntingInterval;
var init_ai_service = __esm({
  "src/main/ai-service.ts"() {
    init_database();
    import_axios = __toESM(require("axios"), 1);
    init_Hunter_engine();
    init_doc_generator();
    init_scheduler();
    init_application_submitter();
    huntingInterval = null;
  }
});

// src/main/features/smart-applicant.ts
var smart_applicant_exports = {};
__export(smart_applicant_exports, {
  cancelApplication: () => cancelApplication,
  continueApplicationWithAnswers: () => continueApplicationWithAnswers,
  deleteQuestion: () => deleteQuestion,
  getAllQuestions: () => getAllQuestions,
  submitApplication: () => submitApplication3,
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
async function submitApplication3(jobId, userId, observerModel, callAI2) {
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
    return await submitApplication3(jobId, userId, observer, global.callAI);
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
    if (!docPath || !fs5.existsSync(docPath)) {
      const pdfPath = docPath == null ? void 0 : docPath.replace(".html", ".pdf");
      if (pdfPath && fs5.existsSync(pdfPath)) {
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
var import_puppeteer5, import_path5, fs5, app8, getUserDataDir3, activeApplications;
var init_smart_applicant = __esm({
  "src/main/features/smart-applicant.ts"() {
    init_database();
    import_puppeteer5 = __toESM(require("puppeteer"), 1);
    import_path5 = __toESM(require("path"), 1);
    fs5 = __toESM(require("fs"), 1);
    init_secretary_service();
    try {
      app8 = require("electron").app;
    } catch (e) {
      app8 = global.electronApp;
    }
    getUserDataDir3 = () => import_path5.default.join(app8.getPath("userData"), "browser_data");
    activeApplications = /* @__PURE__ */ new Map();
  }
});

// electron-main.ts
var import_electron14 = require("electron");
var import_path7 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require("electron-is-dev"), 1);
init_database();

// src/main/ipc/index.ts
var import_electron13 = require("electron");

// src/main/ipc/settings-handlers.ts
var import_electron2 = require("electron");
init_database();
function registerSettingsHandlers() {
  const channels = ["settings:get", "settings:update"];
  import_electron2.ipcMain.handle("settings:get", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM settings");
      return { success: true, data: data[0] || null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron2.ipcMain.handle("settings:update", async (_, data) => {
    try {
      await runQuery("UPDATE settings", data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/user-handlers.ts
var import_electron4 = require("electron");
init_database();
var app7;
try {
  app7 = require("electron").app;
} catch (e) {
  app7 = global.electronApp;
}
function registerUserHandlers() {
  const channels = [
    "user:get-profile",
    "user:update-profile",
    "user:open-linkedin",
    "user:capture-linkedin",
    "user:save-linkedin-profile",
    "user:open-linkedin-login"
  ];
  import_electron4.ipcMain.handle("user:get-profile", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM user_profile");
      return { success: true, data: data[0] || null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron4.ipcMain.handle("user:update-profile", async (_, data) => {
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
  import_electron4.ipcMain.handle("user:open-linkedin", async (_, url) => {
    try {
      const linkedinUrl = url || "https://www.linkedin.com/in/";
      await import_electron4.shell.openExternal(linkedinUrl);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron4.ipcMain.handle("user:open-linkedin-login", async (_, data) => {
    try {
      const LinkedInScraper = (init_linkedin_scraper(), __toCommonJS(linkedin_scraper_exports));
      const userId = (data == null ? void 0 : data.userId) || 1;
      const result = await LinkedInScraper.openLinkedInForLogin(userId);
      return result;
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron4.ipcMain.handle("user:capture-linkedin", async (_, data) => {
    try {
      const LinkedInScraper = (init_linkedin_scraper(), __toCommonJS(linkedin_scraper_exports));
      const { getAllQuery: getAllQuery3 } = (init_database(), __toCommonJS(database_exports));
      const aiService = (init_ai_service(), __toCommonJS(ai_service_exports));
      const { userId, profileUrl, useAI } = data || {};
      let hunterModel = null;
      if (useAI !== false) {
        try {
          const models = await getAllQuery3("SELECT * FROM ai_models");
          hunterModel = models.find((m) => m.role === "Hunter" && m.status === "active");
        } catch (e) {
          console.log("Could not load Hunter model for AI enhancement");
        }
      }
      if (!profileUrl && !(data == null ? void 0 : data.profileUrl)) {
        if (hunterModel) {
          return await LinkedInScraper.scrapeLinkedInProfileWithAI(
            userId || 1,
            null,
            aiService.callAI,
            hunterModel
          );
        }
        return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, null);
      }
      if (hunterModel) {
        return await LinkedInScraper.scrapeLinkedInProfileWithAI(
          userId || 1,
          profileUrl,
          aiService.callAI,
          hunterModel
        );
      }
      return await LinkedInScraper.scrapeLinkedInProfile(userId || 1, profileUrl);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron4.ipcMain.handle("user:save-linkedin-profile", async (_, data) => {
    try {
      const LinkedInScraper = (init_linkedin_scraper(), __toCommonJS(linkedin_scraper_exports));
      return await LinkedInScraper.saveLinkedInProfile(data.userId, data.profileData);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/profiles-handlers.ts
var import_electron5 = require("electron");
init_database();
function registerProfilesHandlers() {
  const channels = ["profiles:get-all", "profiles:save", "profiles:update", "profiles:delete"];
  import_electron5.ipcMain.handle("profiles:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM search_profiles");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron5.ipcMain.handle("profiles:save", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO search_profiles", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron5.ipcMain.handle("profiles:update", async (_, data) => {
    try {
      await runQuery("UPDATE search_profiles", data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron5.ipcMain.handle("profiles:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM search_profiles", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/jobs-handlers.ts
var import_electron6 = require("electron");
init_database();
init_ai_service();
function registerJobsHandlers() {
  const channels = [
    "jobs:get-all",
    "jobs:delete",
    "jobs:add-manual",
    "jobs:update-doc-confirmation",
    "jobs:archive",
    "jobs:clear-old"
  ];
  import_electron6.ipcMain.handle("jobs:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM job_listings");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("jobs:delete", async (_, id) => {
    try {
      const deleteId = typeof id === "object" ? id.id : id;
      await runQuery("DELETE FROM job_listings", { id: deleteId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("jobs:add-manual", async (_, data) => {
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
  import_electron6.ipcMain.handle("jobs:update-doc-confirmation", async (_, data) => {
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
  import_electron6.ipcMain.handle("jobs:archive", async (_, data) => {
    try {
      await runQuery("UPDATE job_listings", {
        id: data.jobId,
        archived: data.archived
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron6.ipcMain.handle("jobs:clear-old", async (_, data) => {
    try {
      const { daysOld = 14 } = data || {};
      const db = getDatabase();
      const jobs = db.job_listings || [];
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      let archivedCount = 0;
      for (const job of jobs) {
        if (job.archived === 1 || job.status === "applied") continue;
        let shouldArchive = false;
        if (job.deadline) {
          const deadline = new Date(job.deadline);
          if (deadline < /* @__PURE__ */ new Date()) shouldArchive = true;
        }
        if (job.posted_date) {
          const postedDate = new Date(job.posted_date);
          if (postedDate < cutoffDate) shouldArchive = true;
        }
        if (job.date_imported) {
          const importedDate = new Date(job.date_imported);
          if (importedDate < cutoffDate) shouldArchive = true;
        }
        if (shouldArchive) {
          await runQuery("UPDATE job_listings", { id: job.id, archived: 1 });
          archivedCount++;
        }
      }
      return { success: true, archivedCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/ai-handlers.ts
var import_electron7 = require("electron");
init_database();
init_ai_service();
var import_axios2 = __toESM(require("axios"), 1);
function registerAIHandlers() {
  const channels = [
    "hunter:start-search",
    "hunter:cancel-search",
    "ai:process-application",
    "ai:generate-tailored-docs",
    "ai:fetch-models",
    "ai:test-model",
    "ai:generate-interview-prep",
    "ai:ask-custom-question",
    "ai:ask-about-cv",
    "ai:smart-apply",
    "ai:continue-application",
    "ai:cancel-application",
    "auditor:get-pending-questions",
    "auditor:get-learned-criteria",
    "auditor:save-criteria",
    "auditor:delete-criteria",
    "auditor:update-criteria",
    "auditor:add-question",
    "auditor:get-answered-questions"
  ];
  import_electron7.ipcMain.handle("ai:test-model", async (_, data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    try {
      const { modelName, apiKey, apiEndpoint } = data;
      console.log("\n===== AI MODEL TEST =====");
      console.log("Model Name:", modelName);
      console.log("API Key:", apiKey ? `${apiKey.substring(0, 20)}...` : "MISSING");
      console.log("Custom Endpoint:", apiEndpoint || "none");
      if (!apiKey || apiKey.trim() === "") {
        console.log("ERROR: No API key provided");
        return { success: false, message: "No API key provided" };
      }
      const trimmedKey = apiKey.trim();
      let endpoint = "";
      let provider = "openai";
      if (apiEndpoint && (apiEndpoint.includes("localhost") || apiEndpoint.includes("127.0.0.1"))) {
        endpoint = apiEndpoint;
        provider = "local";
      } else if (trimmedKey.startsWith("sk-or-")) {
        endpoint = "https://openrouter.ai/api/v1/chat/completions";
        provider = "openrouter";
      } else if (trimmedKey.startsWith("sk-ant-")) {
        endpoint = "https://api.anthropic.com/v1/messages";
        provider = "anthropic";
      } else if (trimmedKey.startsWith("tgp_v1_")) {
        endpoint = "https://api.together.xyz/v1/chat/completions";
        provider = "together";
      } else if (trimmedKey.startsWith("AIza")) {
        endpoint = "https://generativelanguage.googleapis.com/v1beta/models";
        provider = "google";
      } else if (trimmedKey.startsWith("sk-proj-") || trimmedKey.startsWith("sk-")) {
        endpoint = "https://api.openai.com/v1/chat/completions";
        provider = "openai";
      } else {
        endpoint = "https://api.openai.com/v1/chat/completions";
        provider = "openai";
      }
      console.log("Detected Provider:", provider);
      console.log("Using Endpoint:", endpoint);
      let testModelName = modelName;
      if (provider === "openai" && (!modelName || modelName === "")) {
        testModelName = "gpt-3.5-turbo";
      }
      console.log("Test Model Name:", testModelName);
      const testPrompt = "Say OK";
      let response;
      if (provider === "anthropic") {
        console.log("Making Anthropic API call...");
        response = await import_axios2.default.post(endpoint, {
          model: testModelName || "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [{ role: "user", content: testPrompt }]
        }, {
          headers: {
            "x-api-key": trimmedKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          timeout: 3e4
        });
      } else if (provider === "google") {
        console.log("Making Google AI call...");
        const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${testModelName || "gemini-pro"}:generateContent?key=${trimmedKey}`;
        response = await import_axios2.default.post(googleEndpoint, {
          contents: [{ parts: [{ text: testPrompt }] }]
        }, {
          headers: { "Content-Type": "application/json" },
          timeout: 3e4
        });
      } else if (provider === "openrouter") {
        console.log("Making OpenRouter API call...");
        response = await import_axios2.default.post(endpoint, {
          model: testModelName || "openai/gpt-3.5-turbo",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
          temperature: 0
        }, {
          headers: {
            "Authorization": `Bearer ${trimmedKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://job-automation-app.local",
            "X-Title": "Job Automation App"
          },
          timeout: 3e4
        });
      } else {
        console.log("Making OpenAI-compatible API call...");
        console.log("Request body:", JSON.stringify({
          model: testModelName || "gpt-3.5-turbo",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10
        }));
        response = await import_axios2.default.post(endpoint, {
          model: testModelName || "gpt-3.5-turbo",
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
          temperature: 0
        }, {
          headers: {
            "Authorization": `Bearer ${trimmedKey}`,
            "Content-Type": "application/json"
          },
          timeout: 3e4
        });
      }
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data).substring(0, 200));
      if (response.data) {
        let hasContent = false;
        let responseText = "";
        if (provider === "google") {
          responseText = ((_e = (_d = (_c = (_b = (_a = response.data.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) == null ? void 0 : _d[0]) == null ? void 0 : _e.text) || "";
          hasContent = !!responseText;
        } else if (provider === "anthropic") {
          responseText = ((_g = (_f = response.data.content) == null ? void 0 : _f[0]) == null ? void 0 : _g.text) || "";
          hasContent = !!responseText;
        } else {
          responseText = ((_j = (_i = (_h = response.data.choices) == null ? void 0 : _h[0]) == null ? void 0 : _i.message) == null ? void 0 : _j.content) || "";
          hasContent = !!responseText;
        }
        console.log("Response text:", responseText);
        console.log("Has content:", hasContent);
        console.log("===== TEST PASSED =====\n");
        return { success: true, message: `\u2713 Model responding correctly` };
      } else {
        console.log("===== TEST FAILED: No response data =====\n");
        return { success: false, message: "No response from model" };
      }
    } catch (e) {
      console.log("\n===== AI MODEL TEST ERROR =====");
      console.log("Error type:", e.constructor.name);
      console.log("Error message:", e.message);
      console.log("Response status:", (_k = e.response) == null ? void 0 : _k.status);
      console.log("Response data:", JSON.stringify(((_l = e.response) == null ? void 0 : _l.data) || {}).substring(0, 500));
      console.log("================================\n");
      let errorMsg = "Unknown error";
      if ((_o = (_n = (_m = e.response) == null ? void 0 : _m.data) == null ? void 0 : _n.error) == null ? void 0 : _o.message) {
        errorMsg = e.response.data.error.message;
      } else if ((_q = (_p = e.response) == null ? void 0 : _p.data) == null ? void 0 : _q.message) {
        errorMsg = e.response.data.message;
      } else if ((_s = (_r = e.response) == null ? void 0 : _r.data) == null ? void 0 : _s.error) {
        errorMsg = typeof e.response.data.error === "string" ? e.response.data.error : JSON.stringify(e.response.data.error);
      } else if (((_t = e.response) == null ? void 0 : _t.status) === 401) {
        errorMsg = "Invalid API key - check that your key is correct and active";
      } else if (((_u = e.response) == null ? void 0 : _u.status) === 403) {
        errorMsg = "Access forbidden - your API key may not have permission for this model";
      } else if (((_v = e.response) == null ? void 0 : _v.status) === 404) {
        errorMsg = "Model not found - check the model name is correct";
      } else if (((_w = e.response) == null ? void 0 : _w.status) === 429) {
        errorMsg = "Rate limited or quota exceeded - check your API plan";
      } else if (((_x = e.response) == null ? void 0 : _x.status) === 500 || ((_y = e.response) == null ? void 0 : _y.status) === 502 || ((_z = e.response) == null ? void 0 : _z.status) === 503) {
        errorMsg = "API server error - try again later";
      } else if (e.code === "ECONNREFUSED") {
        errorMsg = "Connection refused - check endpoint URL";
      } else if (e.code === "ETIMEDOUT" || e.code === "ECONNABORTED") {
        errorMsg = "Connection timeout - server not responding";
      } else if (e.code === "ENOTFOUND") {
        errorMsg = "Server not found - check your internet connection";
      } else if (e.message) {
        errorMsg = e.message;
      }
      return { success: false, message: errorMsg };
    }
  });
  import_electron7.ipcMain.handle("hunter:start-search", async (_, userId) => {
    try {
      const result = await startHunterSearch2(userId);
      return result;
    } catch (e) {
      console.error("Hunter search error:", e);
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("hunter:cancel-search", async () => {
    try {
      const HunterEngine = (init_Hunter_engine(), __toCommonJS(Hunter_engine_exports));
      HunterEngine.cancelHunterSearch();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("ai:process-application", async (_, jobId, userId) => {
    try {
      return await processApplication(jobId, userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("ai:generate-tailored-docs", async (_, data) => {
    var _a;
    try {
      const { jobId, userId, docOptions } = data;
      const db = getDatabase();
      const job = (_a = db.job_listings) == null ? void 0 : _a.find((j) => String(j.id) === String(jobId));
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
  import_electron7.ipcMain.handle("ai:fetch-models", async (_, apiKey, role) => {
    var _a;
    try {
      let provider = "openrouter";
      if (apiKey.startsWith("sk-") && apiKey.length > 50) {
        provider = "openai";
      } else if (apiKey.startsWith("sk-ant-")) {
        provider = "anthropic";
      }
      let models = [];
      let recommendations = { Speed: [], Cost: [], Quality: [] };
      if (provider === "openai") {
        const response = await import_axios2.default.get("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` },
          timeout: 1e4
        });
        models = response.data.data.filter((m) => m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("o3")).map((m) => m.id).sort();
        if (role === "Hunter" || role === "Observer") {
          recommendations = {
            Speed: [{ id: "gpt-4o-mini", desc: "Fast & cheap" }],
            Cost: [{ id: "gpt-3.5-turbo", desc: "Most affordable" }],
            Quality: [{ id: "gpt-4o", desc: "Best quality" }]
          };
        } else if (role === "Thinker" || role === "HR AI") {
          recommendations = {
            Speed: [{ id: "gpt-4o-mini", desc: "Quick drafts" }],
            Cost: [{ id: "gpt-4o-mini", desc: "Budget friendly" }],
            Quality: [{ id: "gpt-4o", desc: "Best writing" }, { id: "o1-preview", desc: "Deep reasoning" }]
          };
        } else if (role === "Auditor") {
          recommendations = {
            Speed: [{ id: "gpt-4o-mini", desc: "Quick checks" }],
            Cost: [{ id: "gpt-3.5-turbo", desc: "Cost efficient" }],
            Quality: [{ id: "gpt-4o", desc: "Thorough review" }]
          };
        }
      } else if (provider === "anthropic") {
        models = ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-5-sonnet-20241022"];
        recommendations = {
          Speed: [{ id: "claude-3-haiku-20240307", desc: "Fastest Claude" }],
          Cost: [{ id: "claude-3-haiku-20240307", desc: "Most affordable" }],
          Quality: [{ id: "claude-3-5-sonnet-20241022", desc: "Best quality" }, { id: "claude-3-opus-20240229", desc: "Most capable" }]
        };
      } else {
        try {
          const response = await import_axios2.default.get("https://openrouter.ai/api/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` },
            timeout: 1e4
          });
          models = ((_a = response.data.data) == null ? void 0 : _a.map((m) => m.id).slice(0, 50)) || [];
          recommendations = {
            Speed: [
              { id: "mistralai/mistral-7b-instruct", desc: "Very fast" },
              { id: "meta-llama/llama-3-8b-instruct", desc: "Quick & capable" }
            ],
            Cost: [
              { id: "mistralai/mistral-7b-instruct", desc: "Free tier" },
              { id: "google/gemma-7b-it", desc: "Very cheap" }
            ],
            Quality: [
              { id: "anthropic/claude-3-opus", desc: "Top quality" },
              { id: "openai/gpt-4-turbo", desc: "Excellent" },
              { id: "meta-llama/llama-3-70b-instruct", desc: "Great open source" }
            ]
          };
        } catch {
          models = [
            "openai/gpt-4-turbo",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "anthropic/claude-3-opus",
            "anthropic/claude-3-sonnet",
            "anthropic/claude-3-haiku",
            "meta-llama/llama-3-70b-instruct",
            "meta-llama/llama-3-8b-instruct",
            "mistralai/mixtral-8x7b-instruct",
            "google/gemini-pro"
          ];
        }
      }
      return { success: true, data: models, recommendations };
    } catch (e) {
      console.error("Fetch models error:", e.message);
      return { success: false, error: e.message, data: [], recommendations: { Speed: [], Cost: [], Quality: [] } };
    }
  });
  import_electron7.ipcMain.handle("ai:ask-custom-question", async (_, data) => {
    var _a, _b;
    try {
      const { question, jobUrl, userId } = data;
      const models = await getAllQuery("SELECT * FROM ai_models");
      const hrAI = models.find((m) => m.role === "HR AI" && m.status === "active") || models.find((m) => m.role === "Thinker" && m.status === "active");
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      const profiles = await getAllQuery("SELECT * FROM user_profile");
      const userProfile = profiles[0];
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j) => j.url === jobUrl);
      let jobContext = "";
      if (job) {
        jobContext = `
Job Title: ${job.job_title || "Unknown"}
Company: ${job.company_name || "Unknown"}
Requirements: ${job.required_skills || "Not specified"}
Description: ${((_a = job.description) == null ? void 0 : _a.substring(0, 500)) || "Not available"}`;
      } else if (jobUrl) {
        jobContext = `Job URL: ${jobUrl} (Details not yet analyzed)`;
      }
      let userContext = "";
      if (userProfile) {
        userContext = `
Name: ${userProfile.name || "Not provided"}
Title: ${userProfile.title || "Not provided"}
Skills: ${userProfile.skills || "Not provided"}
Experience: ${userProfile.summary || "Not provided"}`;
      }
      const prompt = `You are an expert HR interviewer and career coach. A job seeker has a question about interviewing.

${jobContext ? `JOB CONTEXT:
${jobContext}` : ""}

${userContext ? `CANDIDATE PROFILE:
${userContext}` : ""}

USER'S QUESTION: "${question}"

Provide:
1. A suggested answer (personalized if profile available)
2. Tips for delivery

Respond in this format:
ANSWER:
[Your suggested answer here]

TIPS:
[Bullet points with tips]`;
      const response = await callAI(hrAI, prompt);
      let answer = "";
      let tips = "";
      if (response.includes("ANSWER:")) {
        const parts = response.split("TIPS:");
        answer = parts[0].replace("ANSWER:", "").trim();
        tips = ((_b = parts[1]) == null ? void 0 : _b.trim()) || "";
      } else {
        answer = response;
      }
      return { success: true, answer, tips };
    } catch (e) {
      console.error("Custom question error:", e);
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("ai:generate-interview-prep", async (_, data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
      const { jobUrl, userId, generateMore } = data;
      console.log("\n=== INTERVIEW PREP DEBUG ===");
      console.log("Job URL:", jobUrl);
      console.log("Generate More:", generateMore);
      if (!jobUrl || !jobUrl.trim()) {
        return { success: false, error: "Please enter a job URL first" };
      }
      const models = await getAllQuery("SELECT * FROM ai_models");
      const hrAI = models.find((m) => m.role === "HR AI" && m.status === "active") || models.find((m) => m.role === "Thinker" && m.status === "active");
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      console.log("Using AI Model:", hrAI.model_name);
      const profiles = await getAllQuery("SELECT * FROM user_profile");
      const userProfile = profiles[0];
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j) => j.url === jobUrl);
      let jobDescription = "";
      let jobInfo = null;
      let importantApps = [];
      if (job) {
        console.log("Job found in database:", job.job_title);
        jobDescription = `
Job Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || "Not specified"}
Required Skills: ${job.required_skills || "Not specified"}
Experience Level: ${job.experience_level || "Not specified"}
Job Type: ${job.job_type || "Not specified"}
Description: ${job.description || "Not available"}`;
        jobInfo = {
          title: job.job_title,
          company: job.company_name,
          location: job.location
        };
        if (job.required_skills) {
          importantApps = job.required_skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
        }
      } else if (jobUrl && jobUrl.startsWith("http")) {
        console.log("Job not in database, attempting to scrape...");
        try {
          const ScraperService = (init_scraper_service(), __toCommonJS(scraper_service_exports));
          const pageData = await ScraperService.getJobPageContent(jobUrl, userId, callAI);
          console.log("Scraper result:", pageData == null ? void 0 : pageData.strategyUsed, "Content length:", ((_a = pageData == null ? void 0 : pageData.content) == null ? void 0 : _a.length) || 0);
          if (pageData && pageData.content && pageData.content.length > 100) {
            const cleanContent = String(pageData.content || "").substring(0, 3e3);
            jobDescription = `Job posting content from ${jobUrl}:
${cleanContent}`;
            const titleMatch = cleanContent.match(/(?:job\s*title|position)[:\s]*([^\n]+)/i);
            const companyMatch = cleanContent.match(/(?:company|employer)[:\s]*([^\n]+)/i);
            const locationMatch = cleanContent.match(/(?:location|located)[:\s]*([^\n]+)/i);
            let parsedTitle = (_b = titleMatch == null ? void 0 : titleMatch[1]) == null ? void 0 : _b.trim();
            let parsedCompany = (_c = companyMatch == null ? void 0 : companyMatch[1]) == null ? void 0 : _c.trim();
            let parsedLocation = (_d = locationMatch == null ? void 0 : locationMatch[1]) == null ? void 0 : _d.trim();
            const strategyUsed = String(pageData.strategyUsed || "");
            if (strategyUsed.includes("JSON-LD") && cleanContent.startsWith("{")) {
              try {
                const jsonData = JSON.parse(cleanContent);
                parsedTitle = jsonData.title || jsonData.jobTitle || jsonData.name || parsedTitle;
                parsedCompany = ((_e = jsonData.hiringOrganization) == null ? void 0 : _e.name) || jsonData.companyName || parsedCompany;
                parsedLocation = ((_g = (_f = jsonData.jobLocation) == null ? void 0 : _f.address) == null ? void 0 : _g.addressLocality) || ((_h = jsonData.jobLocation) == null ? void 0 : _h.name) || jsonData.location || parsedLocation;
                if (jsonData.skills || jsonData.requiredSkills) {
                  const skills = jsonData.skills || jsonData.requiredSkills;
                  importantApps = (typeof skills === "string" ? skills.split(",") : skills).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
                }
              } catch (parseError) {
                console.log("Could not parse JSON-LD data:", parseError);
              }
            }
            jobInfo = {
              title: String(parsedTitle || "Position from URL"),
              company: String(parsedCompany || "Company"),
              location: String(parsedLocation || "See job posting")
            };
          } else {
            console.error("Scraping returned insufficient content");
            return { success: false, error: "Could not fetch job details from the URL. Please add the job to your Job Search first, or check if the URL is correct." };
          }
        } catch (e) {
          console.error("Failed to scrape job URL:", e);
          return { success: false, error: `Could not access job URL: ${e.message}. Please add the job to your Job Search first.` };
        }
      } else {
        return { success: false, error: "Invalid job URL. Please enter a valid URL starting with http:// or https://" };
      }
      if (!jobDescription || jobDescription.length < 50) {
        return { success: false, error: "Could not extract enough information from the job posting. Please add the job to your Job Search first." };
      }
      let userContext = "";
      if (userProfile) {
        userContext = `
Candidate Background:
- Name: ${userProfile.name || "Job Seeker"}
- Current Title: ${userProfile.title || "Professional"}
- Skills: ${userProfile.skills || "Various"}
- Experience Summary: ${userProfile.summary || "Experienced professional"}`;
      }
      const prompt = `You are an expert HR interviewer preparing a candidate for a job interview.

${jobDescription}

${userContext}

Generate ${generateMore ? "5 MORE different" : "10"} interview questions across these categories:
- get_to_know: Personal background and career goals
- psychological: Behavioral and situational questions
- aptitude: Problem-solving and analytical skills
- culture: Values alignment and team dynamics
- position_specific: Technical skills and role requirements

For each question provide:
1. The category (one of: get_to_know, psychological, aptitude, culture, position_specific)
2. The interview question
3. A suggested answer tailored to this candidate and job
4. Difficulty level (easy, medium, hard)
5. Tips for answering

Respond ONLY with a valid JSON array in this exact format:
[
  {
    "id": "q1",
    "category": "get_to_know",
    "question": "Tell me about yourself",
    "suggestedAnswer": "...",
    "difficulty": "easy",
    "tips": "..."
  }
]`;
      console.log("Calling AI with prompt length:", prompt.length);
      const response = await callAI(hrAI, prompt);
      console.log("AI response length:", (response == null ? void 0 : response.length) || 0);
      let questions = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
          console.log("Parsed", questions.length, "questions");
        } else {
          console.error("No JSON array found in AI response");
        }
      } catch (e) {
        console.error("Failed to parse interview questions:", e);
        questions = [{
          id: "q1",
          category: "get_to_know",
          question: "Tell me about yourself and your background.",
          suggestedAnswer: "I am a professional with experience in...",
          difficulty: "easy",
          tips: "Keep your answer focused and relevant to the position."
        }];
      }
      if (questions.length === 0) {
        return { success: false, error: "AI did not generate any questions. Please try again." };
      }
      return {
        success: true,
        questions: questions.map((q) => ({
          id: String(q.id || `q_${Date.now()}`),
          category: String(q.category || "general"),
          question: String(q.question || ""),
          suggestedAnswer: String(q.suggestedAnswer || ""),
          difficulty: String(q.difficulty || "medium"),
          tips: String(q.tips || "")
        })),
        jobInfo: jobInfo ? {
          title: String(jobInfo.title || ""),
          company: String(jobInfo.company || ""),
          location: String(jobInfo.location || "")
        } : null,
        importantApps: importantApps.map((a) => String(a))
      };
    } catch (e) {
      console.error("Interview prep error:", e);
      return { success: false, error: String(e.message || "Unknown error occurred") };
    }
  });
  import_electron7.ipcMain.handle("ai:smart-apply", async (_, data) => {
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
  import_electron7.ipcMain.handle("ai:continue-application", async (_, data) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.continueApplicationWithAnswers(data.jobId, data.userId, data.answers);
    } catch (e) {
      return { success: false, status: "failed", error: e.message };
    }
  });
  import_electron7.ipcMain.handle("ai:cancel-application", async (_, jobId) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      await SmartApplicant.cancelApplication(jobId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("ai:ask-about-cv", async (_, data) => {
    var _a, _b;
    try {
      const jobUrl = String((data == null ? void 0 : data.jobUrl) || "");
      const userId = Number(data == null ? void 0 : data.userId) || 1;
      const difficultyLevel = Number(data == null ? void 0 : data.difficultyLevel) || 5;
      console.log("\n\u{1F525} === INTERVIEW INSIDER DEBUG ===");
      console.log("Job URL:", jobUrl);
      console.log("Difficulty:", difficultyLevel);
      const models = await getAllQuery("SELECT * FROM ai_models");
      const hrAI = models.find((m) => m.role === "HR AI" && m.status === "active") || models.find((m) => m.role === "Thinker" && m.status === "active");
      if (!hrAI) {
        return { success: false, error: 'No HR AI model configured. Please add an AI model with role "HR AI" in Settings > AI Models.' };
      }
      console.log("HR AI Model:", hrAI.model_name);
      const profiles = await getAllQuery("SELECT * FROM user_profile");
      const userProfile = profiles[0];
      if (!userProfile) {
        return { success: false, error: "No profile found. Please set up your LinkedIn Profile or Manual Profile in Settings first." };
      }
      console.log("User Profile Found:", userProfile.name);
      let jobContext = "";
      let jobTitle = "";
      let jobCompany = "";
      let jobRequirements = "";
      const db = getDatabase();
      const jobs = db.job_listings || [];
      let job = jobs.find((j) => j.url === jobUrl);
      if (job) {
        console.log("\u2705 Job found in database:", job.job_title);
        jobTitle = String(job.job_title || "Unknown Position");
        jobCompany = String(job.company_name || "Unknown Company");
        jobRequirements = String(job.required_skills || job.description || "").substring(0, 2e3);
        jobContext = `JOB TITLE: ${jobTitle}
COMPANY: ${jobCompany}
REQUIRED SKILLS/QUALIFICATIONS: ${jobRequirements}
EXPERIENCE LEVEL: ${job.experience_level || "Not specified"}`;
      } else if (jobUrl && jobUrl.startsWith("http")) {
        console.log("\u26A0\uFE0F Job not in database, scraping from URL...");
        try {
          const ScraperService = (init_scraper_service(), __toCommonJS(scraper_service_exports));
          const pageData = await ScraperService.getJobPageContent(jobUrl, userId, callAI);
          console.log("Scraper result:", pageData.strategyUsed, "Length:", ((_a = pageData.content) == null ? void 0 : _a.length) || 0);
          if (pageData && pageData.content && pageData.content.length > 200) {
            const cleanContent = String(pageData.content).substring(0, 3e3);
            jobContext = `JOB POSTING (scraped from ${jobUrl}):
${cleanContent}`;
            console.log("\u2705 Scraped job content successfully");
          } else {
            console.error("\u274C Scraping failed or content too short:", (_b = pageData.content) == null ? void 0 : _b.length);
            return {
              success: false,
              error: "Could not fetch job details from URL. The page may require login or the URL is invalid. Please add the job to your Job Search first."
            };
          }
        } catch (scrapeError) {
          console.error("\u274C Scraping error:", scrapeError.message);
          return {
            success: false,
            error: `Failed to fetch job details: ${scrapeError.message}. Please add the job to your Job Search first.`
          };
        }
      } else {
        console.error("\u274C No valid job URL provided");
        return {
          success: false,
          error: "No job URL provided. Please enter a job URL or select a job from your Job Search list."
        };
      }
      if (!jobContext || jobContext.length < 100) {
        console.error("\u274C Job context too short or empty:", jobContext.length);
        return {
          success: false,
          error: "Could not extract enough information from the job posting. Please ensure the URL is correct and the page is accessible."
        };
      }
      console.log("\u2705 Job context length:", jobContext.length);
      console.log("First 200 chars of job context:", jobContext.substring(0, 200));
      let cvContext = `CANDIDATE NAME: ${userProfile.name || "Not provided"}
CURRENT TITLE: ${userProfile.title || "Not provided"}
LOCATION: ${userProfile.location || "Not provided"}
PROFESSIONAL SUMMARY: ${userProfile.summary || "Not provided"}`;
      try {
        const experiences = Array.isArray(userProfile.experiences) ? userProfile.experiences : JSON.parse(userProfile.experiences || "[]");
        if (experiences.length > 0) {
          cvContext += "\n\nWORK EXPERIENCE:";
          experiences.slice(0, 5).forEach((exp, i) => {
            cvContext += `
${i + 1}. ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})`;
            if (exp.description) cvContext += `: ${exp.description.substring(0, 200)}`;
          });
        }
      } catch (e) {
        console.log("Could not parse experiences:", e);
      }
      try {
        const skills = Array.isArray(userProfile.skills) ? userProfile.skills : JSON.parse(userProfile.skills || "[]");
        if (skills.length > 0) {
          cvContext += `

SKILLS: ${skills.join(", ")}`;
        }
      } catch (e) {
        console.log("Could not parse skills:", e);
      }
      console.log("\u2705 CV context length:", cvContext.length);
      let difficultyInstruction = "";
      if (difficultyLevel <= 3) {
        difficultyInstruction = "Ask EASY questions focused on motivation and basic fit.";
      } else if (difficultyLevel <= 6) {
        difficultyInstruction = "Ask MEDIUM difficulty questions with scenario-based examples.";
      } else if (difficultyLevel <= 8) {
        difficultyInstruction = "Ask HARD questions that probe gaps and challenge assumptions.";
      } else {
        difficultyInstruction = "Ask EXTREME difficulty questions - stress-test the candidate.";
      }
      const prompt = `You are an expert HR interviewer. Your ONLY job is to compare the CANDIDATE'S CV against THIS SPECIFIC JOB'S REQUIREMENTS.

${difficultyInstruction}

\u{1F3AF} === THE SPECIFIC JOB REQUIREMENTS ===
${jobContext}

\u{1F4C4} === THE CANDIDATE'S CV ===
${cvContext}

\u{1F50D} === YOUR TASK ===
Generate exactly 5 interview questions that DIRECTLY address the GAP between what THIS JOB NEEDS and what the CANDIDATE'S CV SHOWS.

**CRITICAL RULES:**
1. **EVERY question MUST mention BOTH the job requirement AND the candidate's background**
2. **FOCUS on mismatches**: If job needs X but CV shows Y, ask about it
3. **NO GENERIC questions**: Do NOT ask "tell me about yourself" or "why this role?"
4. **BE SPECIFIC**: Use actual skills/requirements from the job description
5. **FORMAT**: "This job requires [SPECIFIC REQUIREMENT FROM JOB]. Your CV shows [WHAT CV HAS]. How would you..."

**EXAMPLE OF GOOD QUESTION:**
"This job requires 3+ years of Python experience. Your CV shows primarily Java development. How would you handle the transition to Python-heavy work, and what Python projects have you worked on?"

**EXAMPLE OF BAD QUESTION (DO NOT DO THIS):**
"Tell me about your experience with programming."

Respond ONLY with a valid JSON array:
[
  {
    "question": "This job requires [X from job]. Your CV shows [Y from CV]. How would you...",
    "answer": "A comprehensive suggested answer. IMPORTANT: Include a specific, imaginary example of a situation from the candidate's past (based on their CV) that they can use to prove this skill. Make it sound natural and professional.",
    "difficulty": "easy|medium|hard"
  }
]`;
      console.log("\u{1F680} Calling AI with prompt length:", prompt.length);
      const response = await callAI(hrAI, prompt);
      console.log("\u2705 AI Response received, length:", (response == null ? void 0 : response.length) || 0);
      let questions = [];
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.map((q) => ({
            question: String(q.question || ""),
            answer: String(q.answer || ""),
            difficulty: String(q.difficulty || "medium")
          }));
          console.log("\u2705 Parsed", questions.length, "questions");
        } else {
          console.error("\u274C No JSON array found in response");
        }
      } catch (parseError) {
        console.error("\u274C Failed to parse questions:", parseError);
        return {
          success: false,
          error: "AI response could not be parsed. Please try again."
        };
      }
      const validQuestions = questions.filter((q) => {
        const isGeneric = q.question.toLowerCase().includes("tell me about yourself") || q.question.toLowerCase().includes("why this role") || q.question.length < 50;
        return !isGeneric;
      });
      if (validQuestions.length === 0) {
        console.error("\u274C All questions were too generic");
        return {
          success: false,
          error: "AI generated generic questions. Please ensure the job URL is valid and try again."
        };
      }
      console.log("\u2705 Returning", validQuestions.length, "valid questions");
      return {
        success: true,
        questions: validQuestions
      };
    } catch (e) {
      console.error("\u274C Interview Insider error:", e);
      return { success: false, error: String(e.message || "Unknown error occurred") };
    }
  });
  import_electron7.ipcMain.handle("auditor:get-pending-questions", async (_, data) => {
    try {
      const { userId } = data;
      const db = getDatabase();
      const questions = db.auditor_questions || [];
      const pending = questions.filter((q) => q.user_id === userId && !q.answered);
      return { success: true, questions: pending };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:get-answered-questions", async (_, data) => {
    try {
      const { userId } = data;
      const db = getDatabase();
      const questions = db.auditor_questions || [];
      const answered = questions.filter((q) => q.user_id === userId && q.answered);
      const criteria = db.auditor_criteria || [];
      const questionsWithAnswers = answered.map((q) => {
        const crit = criteria.find((c) => c.criteria === q.criteria && c.user_id === userId);
        return {
          question: q,
          answer: crit ? crit.user_answer || crit.userAnswer : "yes"
        };
      });
      return { success: true, answered: questionsWithAnswers };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:get-learned-criteria", async (_, data) => {
    try {
      const { userId } = data;
      const db = getDatabase();
      const criteria = db.auditor_criteria || [];
      const userCriteria = criteria.filter((c) => c.user_id === userId);
      return { success: true, criteria: userCriteria.map((c) => ({ ...c, userAnswer: c.user_answer || c.userAnswer })) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:save-criteria", async (_, data) => {
    try {
      const { userId, questionId, jobId, criteria, answer } = data;
      const criteriaId = `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await runQuery("INSERT INTO auditor_criteria", {
        id: criteriaId,
        user_id: userId,
        criteria,
        userAnswer: answer,
        job_id: jobId,
        timestamp: Date.now()
      });
      if (questionId) {
        await runQuery("UPDATE auditor_questions", { id: questionId, answered: true });
      }
      return { success: true, criteriaId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:delete-criteria", async (_, data) => {
    try {
      const { criteriaId } = data;
      await runQuery("DELETE FROM auditor_criteria", { id: criteriaId });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:update-criteria", async (_, data) => {
    var _a;
    try {
      const { criteriaId, newAnswer } = data;
      const db = getDatabase();
      const criteria = (_a = db.auditor_criteria) == null ? void 0 : _a.find((c) => c.id === criteriaId);
      if (!criteria) {
        return { success: false, error: "Criteria not found" };
      }
      await runQuery("UPDATE auditor_criteria", {
        id: criteriaId,
        userAnswer: newAnswer
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron7.ipcMain.handle("auditor:add-question", async (_, data) => {
    try {
      const { userId, jobId, question, criteria } = data;
      const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await runQuery("INSERT INTO auditor_questions", {
        id: questionId,
        user_id: userId,
        job_id: jobId,
        question,
        criteria,
        answered: false,
        timestamp: Date.now()
      });
      return { success: true, questionId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/docs-handlers.ts
var import_electron8 = require("electron");
init_database();
init_ai_service();
function registerDocsHandlers() {
  const channels = [
    "docs:get-all",
    "docs:save",
    "docs:delete",
    "docs:open-file",
    "docs:convert-to-pdf",
    "docs:convert-all-pdf",
    "docs:reprocess"
  ];
  import_electron8.ipcMain.handle("docs:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM documents");
      return { success: true, data: data || [] };
    } catch (e) {
      return { success: false, error: e.message, data: [] };
    }
  });
  import_electron8.ipcMain.handle("docs:save", async (_, data) => {
    try {
      const docData = {
        ...data,
        ai_status: "pending",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const result = await runQuery("INSERT INTO documents", [docData]);
      if (result == null ? void 0 : result.id) {
        setTimeout(() => {
          processDocumentWithLibrarian(result.id, data.userId || 1).catch(
            (e) => console.error("Background document processing failed:", e)
          );
        }, 100);
      }
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("docs:reprocess", async (_, docId, userId) => {
    try {
      return await processDocumentWithLibrarian(docId, userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("docs:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM documents", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("docs:open-file", async (_, filePath) => {
    try {
      await import_electron8.shell.openPath(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("docs:convert-to-pdf", async (_, data) => {
    try {
      const PdfExport = (init_pdf_export(), __toCommonJS(pdf_export_exports));
      return await PdfExport.convertHtmlToPdf(data.htmlPath, data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron8.ipcMain.handle("docs:convert-all-pdf", async (_, data) => {
    try {
      const PdfExport = (init_pdf_export(), __toCommonJS(pdf_export_exports));
      return await PdfExport.convertAllJobDocsToPdf(data.jobId, data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/websites-handlers.ts
var import_electron9 = require("electron");
init_database();
function registerWebsitesHandlers() {
  const channels = ["websites:get-all", "websites:add", "websites:delete", "websites:toggle-active"];
  import_electron9.ipcMain.handle("websites:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM job_websites");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron9.ipcMain.handle("websites:add", async (_, data) => {
    try {
      const result = await runQuery("INSERT INTO job_websites", [data]);
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron9.ipcMain.handle("websites:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM job_websites", { id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron9.ipcMain.handle("websites:toggle-active", async (_, data) => {
    try {
      await runQuery("UPDATE job_websites", { id: data.id, is_active: data.isActive });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/ai-models-handlers.ts
var import_electron10 = require("electron");
init_database();
var import_fs3 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);
var app9;
try {
  app9 = require("electron").app;
} catch (e) {
  app9 = global.electronApp;
}
function registerAIModelsHandlers() {
  const channels = ["ai-models:get-all", "ai-models:add", "ai-models:update", "ai-models:delete"];
  import_electron10.ipcMain.handle("ai-models:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM ai_models");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("ai-models:add", async (_, data) => {
    try {
      const dbData2 = {
        model_name: data.modelName,
        api_key: data.apiKey,
        role: data.role,
        writing_style: data.writingStyle,
        word_limit: data.wordLimit,
        strictness: data.strictness,
        functional_prompt: data.functionalPrompt,
        cv_style_persona: data.cvStylePersona,
        reference_cv_id: data.referenceCvId,
        cv_style_code: data.cvStyleCode,
        auditor_source: data.auditorSource,
        thinker_source: data.thinkerSource,
        motivation_letter_word_limit: data.motivationLetterWordLimit,
        cover_letter_word_limit: data.coverLetterWordLimit,
        cv_page_limit: data.cvPageLimit,
        status: "active",
        user_id: data.userId || 1
      };
      const result = await runQuery("INSERT INTO ai_models", [dbData2]);
      saveDbToFile();
      return { success: true, id: result.id };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("ai-models:update", async (_, data) => {
    try {
      const dbData2 = { id: data.id };
      if (data.modelName !== void 0) dbData2.model_name = data.modelName;
      if (data.model_name !== void 0) dbData2.model_name = data.model_name;
      if (data.apiKey !== void 0) dbData2.api_key = data.apiKey;
      if (data.api_key !== void 0) dbData2.api_key = data.api_key;
      if (data.role !== void 0) dbData2.role = data.role;
      if (data.writingStyle !== void 0) dbData2.writing_style = data.writingStyle;
      if (data.writing_style !== void 0) dbData2.writing_style = data.writing_style;
      if (data.wordLimit !== void 0) dbData2.word_limit = data.wordLimit;
      if (data.word_limit !== void 0) dbData2.word_limit = data.word_limit;
      if (data.strictness !== void 0) dbData2.strictness = data.strictness;
      if (data.functionalPrompt !== void 0) dbData2.functional_prompt = data.functionalPrompt;
      if (data.functional_prompt !== void 0) dbData2.functional_prompt = data.functional_prompt;
      if (data.cvStylePersona !== void 0) dbData2.cv_style_persona = data.cvStylePersona;
      if (data.cv_style_persona !== void 0) dbData2.cv_style_persona = data.cv_style_persona;
      if (data.referenceCvId !== void 0) dbData2.reference_cv_id = data.referenceCvId;
      if (data.reference_cv_id !== void 0) dbData2.reference_cv_id = data.reference_cv_id;
      if (data.cvStyleCode !== void 0) dbData2.cv_style_code = data.cvStyleCode;
      if (data.cv_style_code !== void 0) dbData2.cv_style_code = data.cv_style_code;
      if (data.auditorSource !== void 0) dbData2.auditor_source = data.auditorSource;
      if (data.auditor_source !== void 0) dbData2.auditor_source = data.auditor_source;
      if (data.thinkerSource !== void 0) dbData2.thinker_source = data.thinkerSource;
      if (data.thinker_source !== void 0) dbData2.thinker_source = data.thinker_source;
      if (data.motivationLetterWordLimit !== void 0) dbData2.motivation_letter_word_limit = data.motivationLetterWordLimit;
      if (data.motivation_letter_word_limit !== void 0) dbData2.motivation_letter_word_limit = data.motivation_letter_word_limit;
      if (data.coverLetterWordLimit !== void 0) dbData2.cover_letter_word_limit = data.coverLetterWordLimit;
      if (data.cover_letter_word_limit !== void 0) dbData2.cover_letter_word_limit = data.cover_letter_word_limit;
      if (data.cvPageLimit !== void 0) dbData2.cv_page_limit = data.cvPageLimit;
      if (data.cv_page_limit !== void 0) dbData2.cv_page_limit = data.cv_page_limit;
      if (data.status !== void 0) dbData2.status = data.status;
      if (data.last_test_status !== void 0) dbData2.last_test_status = data.last_test_status;
      if (data.last_test_message !== void 0) dbData2.last_test_message = data.last_test_message;
      if (data.last_tested !== void 0) dbData2.last_tested = data.last_tested;
      await runQuery("UPDATE ai_models", [dbData2]);
      saveDbToFile();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron10.ipcMain.handle("ai-models:delete", async (_, id) => {
    try {
      await runQuery("DELETE FROM ai_models", { id });
      saveDbToFile();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}
function saveDbToFile() {
  try {
    const db = getDatabase();
    const dataDir = import_path6.default.join(app9.getPath("userData"), "data");
    if (!import_fs3.default.existsSync(dataDir)) {
      import_fs3.default.mkdirSync(dataDir, { recursive: true });
    }
    import_fs3.default.writeFileSync(import_path6.default.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Failed to save db to file:", e);
  }
}

// src/main/ipc/system-handlers.ts
var import_electron11 = require("electron");
init_database();
function registerSystemHandlers() {
  const channels = [
    "logs:get-recent-actions",
    "apps:get-all",
    "scheduler:toggle",
    "scheduler:get-status",
    "hunter:get-status",
    "qa:get-all",
    "qa:update",
    "qa:delete"
  ];
  import_electron11.ipcMain.handle("logs:get-recent-actions", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM action_logs");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("apps:get-all", async () => {
    try {
      const data = await getAllQuery("SELECT * FROM applications");
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("scheduler:toggle", async (_, data) => {
    try {
      const enabled = typeof data === "object" ? data.active : data;
      const { setSchedulerEnabled: setSchedulerEnabled2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
      setSchedulerEnabled2(enabled);
      await runQuery("UPDATE settings", { job_hunting_active: enabled ? 1 : 0 });
      console.log(`Scheduler toggled: ${enabled ? "ENABLED" : "DISABLED"}`);
      return { success: true, enabled };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("scheduler:get-status", async () => {
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
  import_electron11.ipcMain.handle("hunter:get-status", async () => {
    try {
      const HunterEngine = (init_Hunter_engine(), __toCommonJS(Hunter_engine_exports));
      return {
        success: true,
        isSearching: HunterEngine.isSearching || false
      };
    } catch (e) {
      return { success: false, error: e.message, isSearching: false };
    }
  });
  import_electron11.ipcMain.handle("qa:get-all", async () => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      const data = await SmartApplicant.getAllQuestions();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("qa:update", async (_, data) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.updateQuestionAnswer(data.questionId, data.answer);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron11.ipcMain.handle("qa:delete", async (_, questionId) => {
    try {
      const SmartApplicant = (init_smart_applicant(), __toCommonJS(smart_applicant_exports));
      return await SmartApplicant.deleteQuestion(questionId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/services-handlers.ts
var import_electron12 = require("electron");

// src/main/features/email-service.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
init_database();
function createTransporter(config) {
  return import_nodemailer.default.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    // true for 465, false for other ports
    auth: {
      user: config.email_user,
      pass: config.email_password
    },
    tls: {
      rejectUnauthorized: false
      // Allow self-signed certs
    }
  });
}
async function getEmailConfig() {
  const configs = await getAllQuery("SELECT * FROM email_config");
  const config = configs[0];
  if (!config || !config.email_user || !config.email_password) {
    return null;
  }
  return {
    smtp_host: config.smtp_host || "smtp.gmail.com",
    smtp_port: config.smtp_port || 587,
    smtp_secure: config.smtp_secure || false,
    email_user: config.email_user,
    email_password: config.email_password,
    from_name: config.from_name || "Job Application Bot"
  };
}
async function sendEmail(options, userId) {
  try {
    const config = await getEmailConfig();
    if (!config) {
      return { success: false, error: "Email configuration not found. Please configure SMTP settings." };
    }
    const transporter = createTransporter(config);
    await transporter.verify();
    const mailOptions = {
      from: `"${config.from_name}" <${config.email_user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    const info = await transporter.sendMail(mailOptions);
    if (userId) {
      await logAction(userId, "email_service", `\u2709\uFE0F Email sent to ${options.to}: ${options.subject}`, "completed", true);
    }
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    if (userId) {
      await logAction(userId, "email_service", `\u274C Failed to send email: ${error.message}`, "failed", false);
    }
    return { success: false, error: error.message };
  }
}
async function sendNotification(userId, type, details) {
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    const userSettings = settings[0];
    if (!(userSettings == null ? void 0 : userSettings.secretary_settings)) {
      console.log("Secretary settings not configured");
      return false;
    }
    const secretarySettings = typeof userSettings.secretary_settings === "string" ? JSON.parse(userSettings.secretary_settings) : userSettings.secretary_settings;
    if (!secretarySettings.enabled) return false;
    const notifyEmail = secretarySettings.notifyUserEmail;
    if (!notifyEmail) return false;
    if (type === "response" && !secretarySettings.notifyOnResponse) return false;
    if (type === "follow_up" && !secretarySettings.notifyOnFollowUp) return false;
    if (type === "verification" && !secretarySettings.notifyOnVerification) return false;
    let subject = "";
    let html = "";
    switch (type) {
      case "response":
        subject = `\u{1F4EC} Company Response: ${details.company || "Unknown"}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">New Response Received</h2>
            <p>You've received a response from <strong>${details.company}</strong> regarding your application for <strong>${details.position}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Subject:</strong> ${details.subject}</p>
              <p style="margin: 10px 0 0;"><strong>Preview:</strong> ${details.snippet}</p>
            </div>
            <p>Log in to your Job Application tool to view the full message.</p>
          </div>
        `;
        break;
      case "follow_up":
        subject = `\u{1F4E4} Follow-up Sent: ${details.company || "Unknown"}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Follow-up Email Sent</h2>
            <p>A follow-up email has been automatically sent to <strong>${details.company}</strong> for the <strong>${details.position}</strong> position.</p>
            <p style="color: #666;">This follow-up was sent ${details.daysAfter || 2} days after your initial application.</p>
          </div>
        `;
        break;
      case "verification":
        subject = `\u26A0\uFE0F Action Required: Verification Needed`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">Verification Required</h2>
            <p>Your application to <strong>${details.company}</strong> requires manual verification.</p>
            <p><strong>Reason:</strong> ${details.reason || "CAPTCHA or security check detected"}</p>
            <p>Please log in to complete the application manually.</p>
          </div>
        `;
        break;
    }
    const result = await sendEmail({ to: notifyEmail, subject, html }, userId);
    return result.success;
  } catch (error) {
    console.error("Notification error:", error);
    return false;
  }
}
async function testEmailConfig(userId, testEmail) {
  try {
    const config = await getEmailConfig();
    if (!config) {
      return { success: false, error: "Email configuration not found" };
    }
    const result = await sendEmail({
      to: testEmail,
      subject: "\u2705 Job Application Tool - Email Test Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">Email Configuration Test</h2>
          <p>Congratulations! Your email settings are configured correctly.</p>
          <p>You will now receive notifications about:</p>
          <ul>
            <li>Company responses to your applications</li>
            <li>Follow-up emails sent automatically</li>
            <li>Verification requests requiring your attention</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated test email from your Job Application Automation tool.
          </p>
        </div>
      `
    }, userId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// src/main/ipc/services-handlers.ts
init_compatibility_service();

// src/main/features/secretary-auth.ts
init_database();
var crypto = __toESM(require("crypto"), 1);
var sessions = /* @__PURE__ */ new Map();
var SESSION_DURATION_MS = 8 * 60 * 60 * 1e3;
function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}
function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}
async function setupSecretaryPin(userId, pin) {
  try {
    if (!/^\d{4,8}$/.test(pin)) {
      return { success: false, error: "PIN must be 4-8 digits" };
    }
    const hashedPin = hashPin(pin);
    const settings = await getAllQuery("SELECT * FROM settings");
    if (settings.length > 0) {
      await runQuery("UPDATE settings", {
        id: settings[0].id,
        secretary_pin: hashedPin,
        secretary_pin_set: 1
      });
    } else {
      await runQuery("INSERT INTO settings", {
        user_id: userId,
        secretary_pin: hashedPin,
        secretary_pin_set: 1
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function verifySecretaryPin(userId, pin) {
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    const userSettings = settings.find((s) => s.user_id === userId) || settings[0];
    if (!(userSettings == null ? void 0 : userSettings.secretary_pin)) {
      return { success: false, error: "Secretary PIN not set. Please set up PIN first." };
    }
    const hashedPin = hashPin(pin);
    if (hashedPin !== userSettings.secretary_pin) {
      return { success: false, error: "Invalid PIN" };
    }
    const sessionId = generateSessionId();
    const now = /* @__PURE__ */ new Date();
    sessions.set(sessionId, {
      sessionId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      userId
    });
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function invalidateSession(sessionId) {
  sessions.delete(sessionId);
}
async function changeSecretaryPin(userId, currentPin, newPin) {
  try {
    const verifyResult = await verifySecretaryPin(userId, currentPin);
    if (!verifyResult.success) {
      return { success: false, error: "Current PIN is incorrect" };
    }
    if (verifyResult.sessionId) {
      invalidateSession(verifyResult.sessionId);
    }
    return await setupSecretaryPin(userId, newPin);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function isSecretaryPinSet(userId) {
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    const userSettings = settings.find((s) => s.user_id === userId) || settings[0];
    return !!((userSettings == null ? void 0 : userSettings.secretary_pin) && (userSettings == null ? void 0 : userSettings.secretary_pin_set) === 1);
  } catch {
    return false;
  }
}
async function resetSecretaryPin(userId) {
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    if (settings.length > 0) {
      await runQuery("UPDATE settings", {
        id: settings[0].id,
        secretary_pin: null,
        secretary_pin_set: 0
      });
    }
    sessions.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function getSecretaryAccessSettings(userId) {
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    const userSettings = settings.find((s) => s.user_id === userId) || settings[0];
    return {
      pinSet: !!(userSettings == null ? void 0 : userSettings.secretary_pin_set),
      secretaryEnabled: (userSettings == null ? void 0 : userSettings.secretary_enabled) === 1,
      allowedActions: (userSettings == null ? void 0 : userSettings.secretary_allowed_actions) || ["view_applications", "send_followups"],
      lastAccess: (userSettings == null ? void 0 : userSettings.secretary_last_access) || null
    };
  } catch {
    return {
      pinSet: false,
      secretaryEnabled: false,
      allowedActions: [],
      lastAccess: null
    };
  }
}
async function updateSecretaryPermissions(userId, permissions) {
  var _a;
  try {
    const settings = await getAllQuery("SELECT * FROM settings");
    const updateData = { id: ((_a = settings[0]) == null ? void 0 : _a.id) || 1 };
    if (permissions.enabled !== void 0) {
      updateData.secretary_enabled = permissions.enabled ? 1 : 0;
    }
    if (permissions.allowedActions) {
      updateData.secretary_allowed_actions = JSON.stringify(permissions.allowedActions);
    }
    if (settings.length > 0) {
      await runQuery("UPDATE settings", updateData);
    } else {
      await runQuery("INSERT INTO settings", {
        user_id: userId,
        ...updateData
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// src/main/ipc/services-handlers.ts
var import_imap2 = __toESM(require("imap"), 1);
var import_googleapis = require("googleapis");
function registerServicesHandlers() {
  const channels = [
    // Email Service
    "email:test-config",
    "email:send",
    "email:send-notification",
    "email:test-inbox",
    "email:fetch-inbox",
    "email:oauth-start",
    "email:oauth-callback",
    "email:oauth-test",
    // Compatibility Score
    "compatibility:calculate",
    "compatibility:calculate-all",
    "compatibility:get-by-level",
    // Secretary Authentication
    "secretary:setup-pin",
    "secretary:verify-pin",
    "secretary:change-pin",
    "secretary:reset-pin",
    "secretary:is-pin-set",
    "secretary:get-settings",
    "secretary:update-permissions"
  ];
  import_electron12.ipcMain.handle("email:test-config", async (_, data) => {
    try {
      return await testEmailConfig(data.userId, data.testEmail);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("email:send", async (_, data) => {
    try {
      return await sendEmail(data.options, data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("email:send-notification", async (_, data) => {
    try {
      const result = await sendNotification(data.userId, data.type, data.details);
      return { success: result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("email:test-inbox", async (_, data) => {
    try {
      const { email, password, provider } = data;
      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }
      let imapConfig = {
        user: email,
        password,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      if (provider === "gmail" || email.includes("@gmail.com")) {
        imapConfig.host = "imap.gmail.com";
        imapConfig.port = 993;
      } else if (provider === "outlook" || email.includes("@outlook") || email.includes("@hotmail") || email.includes("@live")) {
        imapConfig.host = "outlook.office365.com";
        imapConfig.port = 993;
      } else if (provider === "yahoo" || email.includes("@yahoo")) {
        imapConfig.host = "imap.mail.yahoo.com";
        imapConfig.port = 993;
      } else if (provider === "icloud" || email.includes("@icloud")) {
        imapConfig.host = "imap.mail.me.com";
        imapConfig.port = 993;
      } else {
        imapConfig.host = "imap.gmail.com";
        imapConfig.port = 993;
      }
      console.log("Testing IMAP connection to:", imapConfig.host);
      return new Promise((resolve) => {
        const imap = new import_imap2.default(imapConfig);
        imap.once("ready", () => {
          console.log("IMAP connection successful");
          imap.end();
          resolve({ success: true, message: "Connection successful! Inbox accessible." });
        });
        imap.once("error", (err) => {
          console.error("IMAP connection error:", err.message);
          let errorMsg = err.message;
          if (err.message.includes("Invalid credentials") || err.message.includes("AUTHENTICATIONFAILED")) {
            errorMsg = "Invalid credentials. For Gmail, use an App Password (not your regular password).";
          } else if (err.message.includes("ECONNREFUSED")) {
            errorMsg = "Connection refused. Check your internet connection.";
          }
          resolve({ success: false, error: errorMsg });
        });
        imap.connect();
        setTimeout(() => {
          try {
            imap.end();
          } catch (e) {
          }
          resolve({ success: false, error: "Connection timeout - server not responding" });
        }, 15e3);
      });
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("email:fetch-inbox", async (_, data) => {
    try {
      const { email, password, provider, maxMessages } = data;
      if (!email || !password) {
        return { success: false, error: "Email and password are required", messages: [] };
      }
      let imapConfig = {
        user: email,
        password,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      if (provider === "gmail" || email.includes("@gmail.com")) {
        imapConfig.host = "imap.gmail.com";
        imapConfig.port = 993;
      } else if (provider === "outlook" || email.includes("@outlook") || email.includes("@hotmail") || email.includes("@live")) {
        imapConfig.host = "outlook.office365.com";
        imapConfig.port = 993;
      } else if (provider === "yahoo" || email.includes("@yahoo")) {
        imapConfig.host = "imap.mail.yahoo.com";
        imapConfig.port = 993;
      } else if (provider === "icloud" || email.includes("@icloud")) {
        imapConfig.host = "imap.mail.me.com";
        imapConfig.port = 993;
      } else {
        imapConfig.host = "imap.gmail.com";
        imapConfig.port = 993;
      }
      console.log("Fetching emails from:", imapConfig.host);
      return new Promise((resolve) => {
        const imap = new import_imap2.default(imapConfig);
        const messages = [];
        const limit = maxMessages || 5;
        imap.once("ready", () => {
          imap.openBox("INBOX", true, (err, box) => {
            if (err) {
              imap.end();
              resolve({ success: false, error: "Failed to open inbox: " + err.message, messages: [] });
              return;
            }
            const totalMessages = box.messages.total;
            if (totalMessages === 0) {
              imap.end();
              resolve({ success: true, messages: [], totalCount: 0 });
              return;
            }
            const fetchFrom = Math.max(1, totalMessages - limit + 1);
            const fetchRange = `${fetchFrom}:${totalMessages}`;
            const fetch = imap.seq.fetch(fetchRange, {
              bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
              struct: true
            });
            fetch.on("message", (msg, seqno) => {
              const messageData = { seqno };
              msg.on("body", (stream, info) => {
                let buffer = "";
                stream.on("data", (chunk) => buffer += chunk.toString("utf8"));
                stream.on("end", () => {
                  var _a, _b, _c, _d;
                  if (info.which.includes("HEADER")) {
                    const parsed = import_imap2.default.parseHeader(buffer);
                    messageData.from = ((_a = parsed.from) == null ? void 0 : _a[0]) || "Unknown";
                    messageData.to = ((_b = parsed.to) == null ? void 0 : _b[0]) || "";
                    messageData.subject = ((_c = parsed.subject) == null ? void 0 : _c[0]) || "(No Subject)";
                    messageData.date = ((_d = parsed.date) == null ? void 0 : _d[0]) || "";
                  } else {
                    messageData.preview = buffer.substring(0, 200).replace(/\r?\n/g, " ").trim();
                  }
                });
              });
              msg.once("end", () => {
                messages.push(messageData);
              });
            });
            fetch.once("error", (err2) => {
              console.error("Fetch error:", err2);
            });
            fetch.once("end", () => {
              imap.end();
              messages.sort((a, b) => b.seqno - a.seqno);
              resolve({
                success: true,
                messages: messages.slice(0, limit),
                totalCount: totalMessages
              });
            });
          });
        });
        imap.once("error", (err) => {
          console.error("IMAP error:", err.message);
          resolve({ success: false, error: err.message, messages: [] });
        });
        imap.connect();
        setTimeout(() => {
          try {
            imap.end();
          } catch (e) {
          }
          if (messages.length === 0) {
            resolve({ success: false, error: "Connection timeout", messages: [] });
          }
        }, 3e4);
      });
    } catch (e) {
      return { success: false, error: e.message, messages: [] };
    }
  });
  const oauthClients = /* @__PURE__ */ new Map();
  const LOOPBACK_REDIRECT_URI = "http://127.0.0.1";
  let authServerInstance = null;
  import_electron12.ipcMain.handle("email:oauth-start", async (_, data) => {
    try {
      const { clientId, clientSecret, email } = data;
      if (!clientId || !clientSecret) {
        return { success: false, error: "Client ID and Client Secret are required" };
      }
      console.log("Starting OAuth flow for:", email);
      const http = require("http");
      const url = require("url");
      const findAvailablePort = () => {
        return new Promise((resolve, reject) => {
          const server = http.createServer();
          server.listen(0, "127.0.0.1", () => {
            const port2 = server.address().port;
            server.close(() => resolve(port2));
          });
          server.on("error", reject);
        });
      };
      const port = await findAvailablePort();
      const redirectUri = `${LOOPBACK_REDIRECT_URI}:${port}`;
      console.log("Using redirect URI:", redirectUri);
      const oauth2Client = new import_googleapis.google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
      oauthClients.set(email || "default", { client: oauth2Client, redirectUri });
      const authCodePromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          if (authServerInstance) {
            authServerInstance.close();
            authServerInstance = null;
          }
          reject(new Error("OAuth timeout - no response received within 5 minutes"));
        }, 3e5);
        authServerInstance = http.createServer(async (req, res) => {
          try {
            const queryParams = url.parse(req.url, true).query;
            if (queryParams.code) {
              clearTimeout(timeoutId);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Authorization Successful</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           display: flex; justify-content: center; align-items: center; height: 100vh; 
                           margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { background: white; padding: 40px; border-radius: 16px; text-align: center; 
                                 box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; }
                    h1 { color: #4CAF50; margin-bottom: 10px; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>\u2713 Authorization Successful!</h1>
                    <p>You can close this window and return to the app.</p>
                    <p style="font-size: 12px; color: #888; margin-top: 20px;">This window will close automatically...</p>
                  </div>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
                </html>
              `);
              authServerInstance.close();
              authServerInstance = null;
              resolve(queryParams.code);
            } else if (queryParams.error) {
              clearTimeout(timeoutId);
              res.writeHead(400, { "Content-Type": "text/html" });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Authorization Failed</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1 style="color: #f44336;">Authorization Failed</h1>
                  <p>Error: ${queryParams.error}</p>
                  <p>Please close this window and try again.</p>
                </body>
                </html>
              `);
              authServerInstance.close();
              authServerInstance = null;
              reject(new Error(queryParams.error));
            }
          } catch (err) {
            console.error("Error handling OAuth callback:", err);
          }
        });
        authServerInstance.listen(port, "127.0.0.1", () => {
          console.log(`OAuth callback server listening on port ${port}`);
        });
      });
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://mail.google.com/"
        ],
        prompt: "consent"
      });
      console.log("OAuth URL generated:", authUrl);
      await import_electron12.shell.openExternal(authUrl);
      try {
        const code = await authCodePromise;
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log("OAuth tokens received:", {
          access_token: tokens.access_token ? "present" : "missing",
          refresh_token: tokens.refresh_token ? "present" : "missing",
          expiry_date: tokens.expiry_date
        });
        const db = (init_database(), __toCommonJS(database_exports)).getDatabase();
        if (db.settings.length === 0) {
          db.settings.push({ id: 1 });
        }
        db.settings[0].oauth_access_token = tokens.access_token;
        db.settings[0].oauth_refresh_token = tokens.refresh_token;
        db.settings[0].oauth_expiry = tokens.expiry_date;
        db.settings[0].email_connected = 1;
        db.settings[0].oauth_client_id = clientId;
        db.settings[0].oauth_client_secret = clientSecret;
        const fs7 = require("fs");
        const path10 = require("path");
        const { app: app11 } = require("electron");
        const dataDir = path10.join(app11.getPath("userData"), "data");
        fs7.writeFileSync(path10.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
        return {
          success: true,
          message: "OAuth connected successfully! Your email is now linked.",
          hasRefreshToken: !!tokens.refresh_token
        };
      } catch (authError) {
        console.error("OAuth flow error:", authError);
        return { success: false, error: authError.message };
      }
    } catch (e) {
      console.error("OAuth start error:", e);
      if (authServerInstance) {
        authServerInstance.close();
        authServerInstance = null;
      }
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("email:oauth-callback", async (_, data) => {
    try {
      const { clientId, clientSecret, code, email } = data;
      if (!code) {
        return { success: false, error: "Authorization code is required" };
      }
      console.log("Processing OAuth callback for:", email);
      let oauthData = oauthClients.get(email || "default");
      let oauth2Client;
      let redirectUri = "http://127.0.0.1";
      if (oauthData) {
        oauth2Client = oauthData.client;
        redirectUri = oauthData.redirectUri || redirectUri;
      } else {
        oauth2Client = new import_googleapis.google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
        );
      }
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      console.log("OAuth tokens received:", {
        access_token: tokens.access_token ? "present" : "missing",
        refresh_token: tokens.refresh_token ? "present" : "missing",
        expiry_date: tokens.expiry_date
      });
      const db = (init_database(), __toCommonJS(database_exports)).getDatabase();
      if (db.settings.length === 0) {
        db.settings.push({ id: 1 });
      }
      db.settings[0].oauth_access_token = tokens.access_token;
      db.settings[0].oauth_refresh_token = tokens.refresh_token;
      db.settings[0].oauth_expiry = tokens.expiry_date;
      db.settings[0].email_connected = 1;
      db.settings[0].oauth_client_id = clientId;
      db.settings[0].oauth_client_secret = clientSecret;
      const fs7 = require("fs");
      const path10 = require("path");
      const { app: app11 } = require("electron");
      const dataDir = path10.join(app11.getPath("userData"), "data");
      fs7.writeFileSync(path10.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
      return {
        success: true,
        message: "OAuth connected successfully! Your email is now linked.",
        hasRefreshToken: !!tokens.refresh_token
      };
    } catch (e) {
      console.error("OAuth callback error:", e);
      let errorMsg = e.message;
      if (e.message.includes("invalid_grant")) {
        errorMsg = "Invalid or expired authorization code. Please try again.";
      } else if (e.message.includes("redirect_uri_mismatch")) {
        errorMsg = 'OAuth configuration error. Please ensure you have added "http://127.0.0.1" as an authorized redirect URI in your Google Cloud Console. Go to: APIs & Services > Credentials > OAuth 2.0 Client IDs > Your Client > Authorized redirect URIs.';
      }
      return { success: false, error: errorMsg };
    }
  });
  import_electron12.ipcMain.handle("email:oauth-test", async (_, data) => {
    var _a, _b, _c, _d, _e;
    try {
      let { clientId, clientSecret, email } = data || {};
      const db = (init_database(), __toCommonJS(database_exports)).getDatabase();
      const settingsRow = ((_a = db.settings) == null ? void 0 : _a[0]) || {};
      if (!settingsRow.oauth_access_token) {
        return { success: false, error: "No OAuth tokens found. Please connect first." };
      }
      clientId = clientId || settingsRow.oauth_client_id;
      clientSecret = clientSecret || settingsRow.oauth_client_secret;
      if (!clientId || !clientSecret) {
        return { success: false, error: "OAuth credentials not found. Please reconnect." };
      }
      console.log("Testing OAuth connection...");
      const oauth2Client = new import_googleapis.google.auth.OAuth2(
        clientId,
        clientSecret,
        "http://127.0.0.1"
      );
      oauth2Client.setCredentials({
        access_token: settingsRow.oauth_access_token,
        refresh_token: settingsRow.oauth_refresh_token,
        expiry_date: settingsRow.oauth_expiry
      });
      oauth2Client.on("tokens", (tokens) => {
        console.log("New tokens received during test");
        if (tokens.access_token) {
          db.settings[0].oauth_access_token = tokens.access_token;
        }
        if (tokens.refresh_token) {
          db.settings[0].oauth_refresh_token = tokens.refresh_token;
        }
        if (tokens.expiry_date) {
          db.settings[0].oauth_expiry = tokens.expiry_date;
        }
        const fs7 = require("fs");
        const path10 = require("path");
        const { app: app11 } = require("electron");
        const dataDir = path10.join(app11.getPath("userData"), "data");
        fs7.writeFileSync(path10.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
      });
      const gmail = import_googleapis.google.gmail({ version: "v1", auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: "me" });
      console.log("Gmail profile:", profile.data);
      const messageList = await gmail.users.messages.list({
        userId: "me",
        maxResults: 5,
        labelIds: ["INBOX"]
      });
      const messages = [];
      if (messageList.data.messages) {
        for (const msg of messageList.data.messages.slice(0, 5)) {
          const fullMsg = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"]
          });
          const headers = ((_b = fullMsg.data.payload) == null ? void 0 : _b.headers) || [];
          messages.push({
            from: ((_c = headers.find((h) => h.name === "From")) == null ? void 0 : _c.value) || "Unknown",
            subject: ((_d = headers.find((h) => h.name === "Subject")) == null ? void 0 : _d.value) || "(No Subject)",
            date: ((_e = headers.find((h) => h.name === "Date")) == null ? void 0 : _e.value) || "",
            snippet: fullMsg.data.snippet
          });
        }
      }
      return {
        success: true,
        email: profile.data.emailAddress,
        totalMessages: profile.data.messagesTotal,
        messages
      };
    } catch (e) {
      console.error("OAuth test error:", e);
      let errorMsg = e.message;
      if (e.message.includes("invalid_grant") || e.message.includes("Token has been expired") || e.message.includes("Invalid Credentials")) {
        errorMsg = "OAuth token expired or invalid. Please reconnect your email.";
      }
      return { success: false, error: errorMsg };
    }
  });
  import_electron12.ipcMain.handle("compatibility:calculate", async (_, data) => {
    try {
      const result = await calculateCompatibility(data.userId, data.jobId);
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("compatibility:calculate-all", async (_, data) => {
    try {
      await calculateAllCompatibility(data.userId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("compatibility:get-by-level", async (_, data) => {
    try {
      const jobs = await getJobsByCompatibility(data.userId, data.minLevel);
      return { success: true, data: jobs };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:setup-pin", async (_, data) => {
    try {
      return await setupSecretaryPin(data.userId, data.pin);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:verify-pin", async (_, data) => {
    try {
      return await verifySecretaryPin(data.userId, data.pin);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:change-pin", async (_, data) => {
    try {
      return await changeSecretaryPin(data.userId, data.currentPin, data.newPin);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:reset-pin", async (_, data) => {
    try {
      return await resetSecretaryPin(data.userId);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:is-pin-set", async (_, data) => {
    try {
      const isSet = await isSecretaryPinSet(data.userId);
      return { success: true, isSet };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:get-settings", async (_, data) => {
    try {
      const settings = await getSecretaryAccessSettings(data.userId);
      return { success: true, ...settings };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  import_electron12.ipcMain.handle("secretary:update-permissions", async (_, data) => {
    try {
      return await updateSecretaryPermissions(data.userId, data.permissions);
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  return channels;
}

// src/main/ipc/index.ts
function setupIpcHandlers() {
  const allChannels = [];
  const handlerModules = [
    registerSettingsHandlers,
    registerUserHandlers,
    registerProfilesHandlers,
    registerJobsHandlers,
    registerAIHandlers,
    registerDocsHandlers,
    registerWebsitesHandlers,
    registerAIModelsHandlers,
    registerSystemHandlers,
    registerServicesHandlers
  ];
  const knownChannels = [
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
    "hunter:cancel-search",
    "ai:process-application",
    "ai:generate-tailored-docs",
    "ai:smart-apply",
    "ai:continue-application",
    "ai:cancel-application",
    "ai:fetch-models",
    "ai:test-model",
    "ai:generate-interview-prep",
    "ai:ask-custom-question",
    "ai:ask-about-cv",
    "docs:get-all",
    "docs:save",
    "docs:delete",
    "docs:open-file",
    "docs:convert-to-pdf",
    "docs:convert-all-pdf",
    "docs:reprocess",
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
    "qa:delete",
    "email:test-config",
    "email:send",
    "email:send-notification",
    "email:test-inbox",
    "email:fetch-inbox",
    "email:oauth-start",
    "email:oauth-callback",
    "email:oauth-test",
    "compatibility:calculate",
    "compatibility:calculate-all",
    "compatibility:get-by-level",
    "secretary:setup-pin",
    "secretary:verify-pin",
    "secretary:change-pin",
    "secretary:reset-pin",
    "secretary:is-pin-set",
    "secretary:get-settings",
    "secretary:update-permissions"
  ];
  knownChannels.forEach((channel) => {
    try {
      import_electron13.ipcMain.removeHandler(channel);
    } catch (e) {
    }
  });
  handlerModules.forEach((registerFn) => {
    const channels = registerFn();
    allChannels.push(...channels);
  });
  console.log(`\u2705 IPC Handlers registered successfully (${allChannels.length} channels)`);
  console.log("   Handler modules loaded: settings, user, profiles, jobs, ai, docs, websites, ai-models, system, services");
}

// electron-main.ts
import_electron14.app.disableHardwareAcceleration();
var gotTheLock = import_electron14.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron14.app.quit();
}
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron14.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    webPreferences: {
      preload: import_path7.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const startUrl = import_electron_is_dev.default ? "http://localhost:5173" : `file://${import_path7.default.join(__dirname, "../dist/index.html")}`;
  mainWindow.loadURL(startUrl);
  if (import_electron_is_dev.default) mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new import_electron14.Menu();
    menu.append(new import_electron14.MenuItem({ label: "Cut", role: "cut", enabled: params.editFlags.canCut }));
    menu.append(new import_electron14.MenuItem({ label: "Copy", role: "copy", enabled: params.editFlags.canCopy }));
    menu.append(new import_electron14.MenuItem({ label: "Paste", role: "paste", enabled: params.editFlags.canPaste }));
    menu.append(new import_electron14.MenuItem({ type: "separator" }));
    menu.append(new import_electron14.MenuItem({ label: "Select All", role: "selectAll", enabled: params.editFlags.canSelectAll }));
    menu.popup({ window: mainWindow });
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron14.app.on("ready", async () => {
  await initializeDatabase();
  setupIpcHandlers();
  createWindow();
});
import_electron14.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron14.app.quit();
});
import_electron14.app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
//# sourceMappingURL=electron-main.cjs.map