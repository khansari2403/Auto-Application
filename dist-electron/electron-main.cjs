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

// electron-main.ts
init_cjs_shims();
var import_electron3 = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require_electron_is_dev(), 1);

// src/main/database.ts
init_cjs_shims();
var import_path = __toESM(require("path"), 1);
var import_electron = require("electron");
var import_fs = __toESM(require("fs"), 1);
var db = null;
function getDatabase() {
  if (!db) {
    const dataDir = import_path.default.join(import_electron.app.getPath("userData"), "data");
    if (!import_fs.default.existsSync(dataDir)) {
      import_fs.default.mkdirSync(dataDir, { recursive: true });
    }
    db = { ready: true };
  }
  return db;
}
async function initializeDatabase() {
  console.log("Database initialized successfully");
}

// src/main/ipc-handlers.ts
init_cjs_shims();
var import_electron2 = require("electron");
function setupIpcHandlers() {
  import_electron2.ipcMain.handle("user:create-profile", handleCreateProfile);
  import_electron2.ipcMain.handle("user:get-profile", handleGetProfile);
  import_electron2.ipcMain.handle("user:update-profile", handleUpdateProfile);
  import_electron2.ipcMain.handle("preferences:save", handleSavePreferences);
  import_electron2.ipcMain.handle("preferences:get", handleGetPreferences);
  import_electron2.ipcMain.handle("preferences:update", handleUpdatePreferences);
  import_electron2.ipcMain.handle("ai-models:add", handleAddAIModel);
  import_electron2.ipcMain.handle("ai-models:get-all", handleGetAIModels);
  import_electron2.ipcMain.handle("ai-models:delete", handleDeleteAIModel);
  import_electron2.ipcMain.handle("ai-models:update", handleUpdateAIModel);
  import_electron2.ipcMain.handle("email:save-config", handleSaveEmailConfig);
  import_electron2.ipcMain.handle("email:get-config", handleGetEmailConfig);
  import_electron2.ipcMain.handle("email:update-config", handleUpdateEmailConfig);
  import_electron2.ipcMain.handle("websites:add", handleAddWebsite);
  import_electron2.ipcMain.handle("websites:get-all", handleGetWebsites);
  import_electron2.ipcMain.handle("websites:delete", handleDeleteWebsite);
  import_electron2.ipcMain.handle("websites:update", handleUpdateWebsite);
  import_electron2.ipcMain.handle("company:add-monitoring", handleAddCompanyMonitoring);
  import_electron2.ipcMain.handle("company:get-all-monitoring", handleGetCompanyMonitoring);
  import_electron2.ipcMain.handle("company:delete-monitoring", handleDeleteCompanyMonitoring);
  import_electron2.ipcMain.handle("logs:add-action", handleAddActionLog);
  import_electron2.ipcMain.handle("logs:get-recent-actions", handleGetRecentActions);
}
async function handleCreateProfile(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM user_profile WHERE id = ?");
    const profile = stmt.get(userId);
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateProfile(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM job_preferences WHERE user_id = ? LIMIT 1");
    const preferences = stmt.get(userId);
    return { success: true, data: preferences };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdatePreferences(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM ai_models WHERE user_id = ?");
    const models = stmt.all(userId);
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteAIModel(event, modelId) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare("DELETE FROM ai_models WHERE id = ?");
    stmt.run(modelId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateAIModel(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
async function handleSaveEmailConfig(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
      INSERT INTO email_config (
        user_id, email_provider, email_address, auth_type, oauth_token,
        smtp_host, smtp_port, smtp_username, smtp_password, auto_send
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.emailProvider,
      data.emailAddress,
      data.authType,
      data.oauthToken,
      data.smtpHost,
      data.smtpPort,
      data.smtpUsername,
      data.smtpPassword,
      data.autoSend ?? false
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleGetEmailConfig(event, userId) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM email_config WHERE user_id = ? LIMIT 1");
    const config = stmt.get(userId);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateEmailConfig(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
      UPDATE email_config 
      SET email_provider = ?, email_address = ?, auth_type = ?, oauth_token = ?,
          smtp_host = ?, smtp_port = ?, smtp_username = ?, smtp_password = ?,
          auto_send = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.emailProvider,
      data.emailAddress,
      data.authType,
      data.oauthToken,
      data.smtpHost,
      data.smtpPort,
      data.smtpUsername,
      data.smtpPassword,
      data.autoSend,
      data.id
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleAddWebsite(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM job_websites WHERE user_id = ?");
    const websites = stmt.all(userId);
    return { success: true, data: websites };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteWebsite(event, websiteId) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare("DELETE FROM job_websites WHERE id = ?");
    stmt.run(websiteId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleUpdateWebsite(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare("SELECT * FROM company_monitoring WHERE user_id = ?");
    const companies = stmt.all(userId);
    return { success: true, data: companies };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleDeleteCompanyMonitoring(event, companyId) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare("DELETE FROM company_monitoring WHERE id = ?");
    stmt.run(companyId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function handleAddActionLog(event, data) {
  try {
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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
    const db2 = getDatabase();
    const stmt = db2.prepare(`
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

// electron-main.ts
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron3.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    webPreferences: {
      preload: import_path2.default.join(__dirname, "preload.js"),
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
import_electron3.app.on("ready", async () => {
  await initializeDatabase();
  setupIpcHandlers();
  createWindow();
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron3.app.quit();
  }
});
import_electron3.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
