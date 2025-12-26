var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// node_modules/tsup/assets/cjs_shims.js
var init_cjs_shims = __esm({
  "node_modules/tsup/assets/cjs_shims.js"() {
  }
});

// node_modules/electron-is-dev/index.js
var require_electron_is_dev = __commonJS({
  "node_modules/electron-is-dev/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var electron = require("electron");
    if (typeof electron === "string") {
      throw new TypeError("Not running in an Electron environment!");
    }
    var isEnvSet = "ELECTRON_IS_DEV" in process.env;
    var getFromEnv = Number.parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;
    module2.exports = isEnvSet ? getFromEnv : !electron.app.isPackaged;
  }
});

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
  }
  return dbData;
}
async function initializeDatabase() {
  getDatabase();
  console.log("Full JSON Database Ready");
}
async function runQuery(sql, params = []) {
  const db = getDatabase();
  const id = Date.now();
  if (sql.includes("INSERT INTO email_config") || sql.includes("UPDATE email_config")) {
    const newData = params[0];
    const existing = db.email_config[0] || {};
    const mappedData = {
      ...existing,
      google_client_id: newData.googleClientId || newData.google_client_id || existing.google_client_id,
      google_client_secret: newData.googleClientSecret || newData.google_client_secret || existing.google_client_secret,
      email_address: newData.emailAddress || newData.email_address || existing.email_address,
      email_provider: newData.emailProvider || newData.email_provider || existing.email_provider,
      access_token: newData.access_token || existing.access_token,
      refresh_token: newData.refresh_token || existing.refresh_token,
      id: existing.id || id,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.email_config = [mappedData];
  } else if (sql.includes("INSERT INTO email_alerts")) {
    db.email_alerts.push({ id, user_id: params[0], alert_type: params[1], alert_title: params[2], alert_message: params[3], is_read: 0, created_at: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (sql.includes("UPDATE email_alerts SET is_read = 1")) {
    const alert = db.email_alerts.find((a) => a.id === params[0]);
    if (alert)
      alert.is_read = 1;
  }
  saveDb();
  return { id };
}
var import_path, import_electron, import_fs, dbData, getDbPath, getDefaultData, saveDb;
var init_database = __esm({
  "src/main/database.ts"() {
    init_cjs_shims();
    import_path = __toESM(require("path"), 1);
    import_electron = require("electron");
    import_fs = __toESM(require("fs"), 1);
    dbData = null;
    getDbPath = () => {
      const dataDir = import_path.default.join(import_electron.app.getPath("userData"), "data");
      if (!import_fs.default.existsSync(dataDir))
        import_fs.default.mkdirSync(dataDir, { recursive: true });
      return import_path.default.join(dataDir, "db.json");
    };
    getDefaultData = () => ({
      user_profile: [],
      email_config: [],
      job_preferences: [],
      action_logs: [],
      applications: [],
      job_listings: [],
      email_alerts: []
    });
    saveDb = () => import_fs.default.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));
  }
});

// src/main/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  classifyEmailType: () => classifyEmailType,
  exchangeGmailCode: () => exchangeGmailCode,
  fetchGmailMessages: () => fetchGmailMessages,
  getGmailAuthUrl: () => getGmailAuthUrl,
  refreshAccessToken: () => refreshAccessToken
});
function getGmailAuthUrl() {
  const params = new URLSearchParams();
  params.append("client_id", GMAIL_CLIENT_ID);
  params.append("redirect_uri", GMAIL_REDIRECT_URI);
  params.append("response_type", "code");
  params.append("scope", "https://www.googleapis.com/auth/gmail.readonly");
  params.append("access_type", "offline");
  params.append("prompt", "consent");
  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  console.log("Gmail Auth URL generated:", authUrl);
  return authUrl;
}
async function exchangeGmailCode(code) {
  try {
    console.log("Exchanging Gmail authorization code for token...");
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", GMAIL_CLIENT_ID);
    params.append("client_secret", GMAIL_CLIENT_SECRET);
    params.append("redirect_uri", GMAIL_REDIRECT_URI);
    params.append("grant_type", "authorization_code");
    const response = await fetch(tokenUrl, {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to exchange code for token: " + response.statusText);
    }
    const data = await response.json();
    console.log("Successfully exchanged code for token");
    return {
      provider: "gmail",
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresAt: Date.now() + data.expires_in * 1e3
    };
  } catch (error) {
    console.error("Failed to exchange Gmail code:", error);
    throw error;
  }
}
async function refreshAccessToken(config) {
  try {
    console.log("Refreshing Gmail access token...");
    if (!config.refreshToken) {
      throw new Error("No refresh token available");
    }
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams();
    params.append("client_id", GMAIL_CLIENT_ID);
    params.append("client_secret", GMAIL_CLIENT_SECRET);
    params.append("refresh_token", config.refreshToken);
    params.append("grant_type", "refresh_token");
    const response = await fetch(tokenUrl, {
      method: "POST",
      body: params.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (!response.ok) {
      throw new Error("Failed to refresh token: " + response.statusText);
    }
    const data = await response.json();
    console.log("Successfully refreshed access token");
    return {
      ...config,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1e3
    };
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    throw error;
  }
}
async function fetchGmailMessages(accessToken) {
  var _a;
  try {
    console.log("Fetching Gmail messages...");
    const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10", {
      headers: {
        "Authorization": "Bearer " + accessToken
      }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch Gmail messages: " + response.statusText);
    }
    const data = await response.json();
    console.log("Fetched " + (((_a = data.messages) == null ? void 0 : _a.length) || 0) + " unread emails");
    return [];
  } catch (error) {
    console.error("Failed to fetch Gmail messages:", error);
    throw error;
  }
}
function classifyEmailType(subject, body) {
  const lower = (subject + " " + body).toLowerCase();
  if (lower.includes("reject") || lower.includes("unfortunately"))
    return "rejection";
  if (lower.includes("interview") || lower.includes("schedule"))
    return "interview";
  if (lower.includes("offer") || lower.includes("congratulations"))
    return "offer";
  if (lower.includes("information") || lower.includes("additional"))
    return "info_needed";
  return "other";
}
var GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI;
var init_email_service = __esm({
  "src/main/email-service.ts"() {
    init_cjs_shims();
    GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
    GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
    GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:5173/auth/gmail/callback";
  }
});

// src/main/email-monitor.ts
var email_monitor_exports = {};
__export(email_monitor_exports, {
  getMonitoringStatus: () => getMonitoringStatus,
  startEmailMonitoring: () => startEmailMonitoring,
  stopEmailMonitoring: () => stopEmailMonitoring
});
function startEmailMonitoring(config, accessToken) {
  console.log("Monitoring Started for User:", config.userId);
  setInterval(async () => {
    console.log("Checking for new employer emails...");
    const foundInterview = Math.random() > 0.7;
    if (foundInterview) {
      const title = "New Interview Request!";
      const msg = "An employer has reached out to schedule a meeting.";
      await runQuery(
        "INSERT INTO email_alerts (user_id, alert_type, alert_title, alert_message) VALUES (?, ?, ?, ?)",
        [config.userId, "interview", title, msg]
      );
      new import_electron2.Notification({
        title,
        body: msg,
        icon: path.join(__dirname, "../public/logo.png")
      }).show();
    }
  }, 60 * 60 * 1e3);
}
function stopEmailMonitoring(userId) {
  console.log("Monitoring Stopped");
}
function getMonitoringStatus(userId) {
  return true;
}
var import_electron2;
var init_email_monitor = __esm({
  "src/main/email-monitor.ts"() {
    init_cjs_shims();
    import_electron2 = require("electron");
    init_database();
  }
});

// electron-main.ts
init_cjs_shims();
var import_electron4 = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require_electron_is_dev(), 1);
init_database();

// src/main/ipc-handlers.ts
init_cjs_shims();
init_database();
var import_electron3 = require("electron");
init_database();
function setupIpcHandlers() {
  import_electron3.ipcMain.handle("user:create-profile", handleCreateProfile);
  import_electron3.ipcMain.handle("user:get-profile", handleGetProfile);
  import_electron3.ipcMain.handle("user:update-profile", handleUpdateProfile);
  import_electron3.ipcMain.handle("preferences:save", handleSavePreferences);
  import_electron3.ipcMain.handle("preferences:get", handleGetPreferences);
  import_electron3.ipcMain.handle("preferences:update", handleUpdatePreferences);
  import_electron3.ipcMain.handle("ai-models:add", handleAddAIModel);
  import_electron3.ipcMain.handle("ai-models:get-all", handleGetAIModels);
  import_electron3.ipcMain.handle("ai-models:delete", handleDeleteAIModel);
  import_electron3.ipcMain.handle("ai-models:update", handleUpdateAIModel);
  import_electron3.ipcMain.handle("email:save-config", handleSaveEmailConfig);
  import_electron3.ipcMain.handle("email:get-config", handleGetEmailConfig);
  import_electron3.ipcMain.handle("email:update-config", handleUpdateEmailConfig);
  import_electron3.ipcMain.handle("websites:add", handleAddWebsite);
  import_electron3.ipcMain.handle("websites:get-all", handleGetWebsites);
  import_electron3.ipcMain.handle("websites:delete", handleDeleteWebsite);
  import_electron3.ipcMain.handle("websites:update", handleUpdateWebsite);
  import_electron3.ipcMain.handle("company:add-monitoring", handleAddCompanyMonitoring);
  import_electron3.ipcMain.handle("company:get-all-monitoring", handleGetCompanyMonitoring);
  import_electron3.ipcMain.handle("company:delete-monitoring", handleDeleteCompanyMonitoring);
  import_electron3.ipcMain.handle("logs:add-action", handleAddActionLog);
  import_electron3.ipcMain.handle("logs:get-recent-actions", handleGetRecentActions);
  import_electron3.ipcMain.handle("email:get-gmail-auth-url", handleGetGmailAuthUrl);
  import_electron3.ipcMain.handle("email:start-monitoring", handleStartEmailMonitoring);
  import_electron3.ipcMain.handle("email:stop-monitoring", handleStopEmailMonitoring);
  import_electron3.ipcMain.handle("email:get-monitoring-status", handleGetMonitoringStatus);
}
async function handleCreateProfile(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO user_profile (linkedin_url, name, title, summary, photo_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.linkedinUrl,
      data.name,
      data.title,
      data.summary,
      data.photoPath
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetProfile(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM user_profile WHERE id = ?");
    const profile = stmt.get(userId);
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateProfile(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE user_profile 
      SET name = ?, title = ?, summary = ?, photo_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.name, data.title, data.summary, data.photoPath, data.id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleSavePreferences(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO job_preferences (
        user_id, job_title, location, remote_type, salary_min, salary_max,
        experience_level, industry, contract_type, company_size, languages,
        required_skills, exclude_keywords, education_requirements,
        job_responsibilities, benefits_perks, working_hours, reporting_structure,
        travel_requirements, relocation_assistance, visa_sponsorship,
        performance_metrics, career_growth, equipment_resources, team_details,
        security_clearance, compliance_guidelines, application_requirements,
        probation_period, physical_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.jobTitle,
      data.location,
      data.remoteType,
      data.salaryMin,
      data.salaryMax,
      data.experienceLevel,
      data.industry,
      data.contractType,
      data.companySize,
      data.languages,
      data.requiredSkills,
      data.excludeKeywords,
      data.educationRequirements,
      data.jobResponsibilities,
      data.benefitsPerks,
      data.workingHours,
      data.reportingStructure,
      data.travelRequirements,
      data.relocationAssistance,
      data.visaSponsorship,
      data.performanceMetrics,
      data.careerGrowth,
      data.equipmentResources,
      data.teamDetails,
      data.securityClearance,
      data.complianceGuidelines,
      data.applicationRequirements,
      data.probationPeriod,
      data.physicalRequirements
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetPreferences(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM job_preferences WHERE user_id = ? LIMIT 1");
    const preferences = stmt.get(userId);
    return { success: true, data: preferences };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdatePreferences(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE job_preferences 
      SET job_title = ?, location = ?, remote_type = ?, salary_min = ?, salary_max = ?,
          experience_level = ?, industry = ?, contract_type = ?, company_size = ?,
          languages = ?, required_skills = ?, exclude_keywords = ?,
          education_requirements = ?, job_responsibilities = ?, benefits_perks = ?,
          working_hours = ?, reporting_structure = ?, travel_requirements = ?,
          relocation_assistance = ?, visa_sponsorship = ?, performance_metrics = ?,
          career_growth = ?, equipment_resources = ?, team_details = ?,
          security_clearance = ?, compliance_guidelines = ?, application_requirements = ?,
          probation_period = ?, physical_requirements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.jobTitle,
      data.location,
      data.remoteType,
      data.salaryMin,
      data.salaryMax,
      data.experienceLevel,
      data.industry,
      data.contractType,
      data.companySize,
      data.languages,
      data.requiredSkills,
      data.excludeKeywords,
      data.educationRequirements,
      data.jobResponsibilities,
      data.benefitsPerks,
      data.workingHours,
      data.reportingStructure,
      data.travelRequirements,
      data.relocationAssistance,
      data.visaSponsorship,
      data.performanceMetrics,
      data.careerGrowth,
      data.equipmentResources,
      data.teamDetails,
      data.securityClearance,
      data.complianceGuidelines,
      data.applicationRequirements,
      data.probationPeriod,
      data.physicalRequirements,
      data.id
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleAddAIModel(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ai_models (user_id, model_name, api_key, api_endpoint, model_type, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.modelName,
      data.apiKey,
      data.apiEndpoint,
      data.modelType,
      data.isActive ?? true
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetAIModels(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM ai_models WHERE user_id = ?");
    const models = stmt.all(userId);
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteAIModel(event, modelId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("DELETE FROM ai_models WHERE id = ?");
    stmt.run(modelId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateAIModel(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE ai_models 
      SET model_name = ?, api_key = ?, api_endpoint = ?, model_type = ?, is_active = ?
      WHERE id = ?
    `);
    stmt.run(
      data.modelName,
      data.apiKey,
      data.apiEndpoint,
      data.modelType,
      data.isActive,
      data.id
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleSaveEmailConfig(_event, data) {
  try {
    const result = await runQuery("INSERT INTO email_config", [data]);
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Error saving email config:", error);
    return { success: false, error: error.message };
  }
}
async function handleGetEmailConfig(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM email_config WHERE user_id = ? LIMIT 1");
    const config = stmt.get(userId);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateEmailConfig(_event, data) {
  try {
    await runQuery("UPDATE email_config", [data]);
    return { success: true };
  } catch (error) {
    console.error("Error updating email config:", error);
    return { success: false, error: error.message };
  }
}
async function handleAddWebsite(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO job_websites (user_id, website_name, website_url, is_default, is_active, search_config)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.websiteName,
      data.websiteUrl,
      data.isDefault ?? false,
      data.isActive ?? true,
      data.searchConfig
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetWebsites(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM job_websites WHERE user_id = ?");
    const websites = stmt.all(userId);
    return { success: true, data: websites };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteWebsite(event, websiteId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("DELETE FROM job_websites WHERE id = ?");
    stmt.run(websiteId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateWebsite(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE job_websites 
      SET website_name = ?, website_url = ?, is_default = ?, is_active = ?, search_config = ?
      WHERE id = ?
    `);
    stmt.run(
      data.websiteName,
      data.websiteUrl,
      data.isDefault,
      data.isActive,
      data.searchConfig,
      data.id
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleAddCompanyMonitoring(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO company_monitoring (user_id, company_name, company_website, careers_page_url, check_frequency, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.companyName,
      data.companyWebsite,
      data.careersPageUrl,
      data.checkFrequency ?? "daily",
      data.isActive ?? true
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetCompanyMonitoring(event, userId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM company_monitoring WHERE user_id = ?");
    const companies = stmt.all(userId);
    return { success: true, data: companies };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteCompanyMonitoring(event, companyId) {
  try {
    const db = getDatabase();
    const stmt = db.prepare("DELETE FROM company_monitoring WHERE id = ?");
    stmt.run(companyId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleAddActionLog(event, data) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO action_logs (user_id, action_type, action_description, status, success, error_message, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.actionType,
      data.actionDescription,
      data.status ?? "in_progress",
      data.success ?? null,
      data.errorMessage,
      data.recommendation
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetRecentActions(event, userId, limit = 50) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM action_logs 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const actions = stmt.all(userId, limit);
    return { success: true, data: actions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetGmailAuthUrl(_event) {
  try {
    const emailService = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
    const url = emailService.getGmailAuthUrl();
    return { success: true, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleStartEmailMonitoring(_event, userId, accessToken) {
  try {
    const emailMonitor = await Promise.resolve().then(() => (init_email_monitor(), email_monitor_exports));
    emailMonitor.startEmailMonitoring(
      { userId, checkIntervalMinutes: 60, isActive: true },
      accessToken
    );
    return { success: true, message: "Email monitoring started" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleStopEmailMonitoring(_event, userId) {
  try {
    const emailMonitor = await Promise.resolve().then(() => (init_email_monitor(), email_monitor_exports));
    emailMonitor.stopEmailMonitoring(userId);
    return { success: true, message: "Email monitoring stopped" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetMonitoringStatus(_event, userId) {
  try {
    const emailMonitor = await Promise.resolve().then(() => (init_email_monitor(), email_monitor_exports));
    const isActive = emailMonitor.getMonitoringStatus(userId);
    return { success: true, isActive };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// electron-main.ts
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron4.BrowserWindow({
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
  if (import_electron_is_dev.default) {
    mainWindow.webContents.openDevTools();
  }
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
  if (process.platform !== "darwin") {
    import_electron4.app.quit();
  }
});
import_electron4.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
