var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// node_modules/electron/index.js
var require_electron = __commonJS({
  "node_modules/electron/index.js"(exports2, module2) {
    var fs2 = require("fs");
    var path3 = require("path");
    var pathFile = path3.join(__dirname, "path.txt");
    function getElectronPath() {
      let executablePath;
      if (fs2.existsSync(pathFile)) {
        executablePath = fs2.readFileSync(pathFile, "utf-8");
      }
      if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
        return path3.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || "electron");
      }
      if (executablePath) {
        return path3.join(__dirname, "dist", executablePath);
      } else {
        throw new Error("Electron failed to install correctly, please delete node_modules/electron and try installing again");
      }
    }
    module2.exports = getElectronPath();
  }
});

// node_modules/electron-is-dev/index.js
var require_electron_is_dev = __commonJS({
  "node_modules/electron-is-dev/index.js"(exports2, module2) {
    "use strict";
    var electron = require_electron();
    if (typeof electron === "string") {
      throw new TypeError("Not running in an Electron environment!");
    }
    var isEnvSet = "ELECTRON_IS_DEV" in process.env;
    var getFromEnv = Number.parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;
    module2.exports = isEnvSet ? getFromEnv : !electron.app.isPackaged;
  }
});

// electron-main.ts
var import_electron3 = __toESM(require_electron());
var import_path2 = __toESM(require("path"));
var import_electron_is_dev = __toESM(require_electron_is_dev());

// src/main/database.ts
var import_path = __toESM(require("path"));
var import_electron = __toESM(require_electron());
var import_fs = __toESM(require("fs"));
var db = null;
function getDatabase() {
  if (!db) {
    const dataDir = import_path.default.join(import_electron.app.getPath("userData"), "data");
    if (!import_fs.default.existsSync(dataDir)) {
      import_fs.default.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = import_path.default.join(dataDir, "job-automation.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}
async function initializeDatabase() {
  const database = getDatabase();
  database.exec(`
    -- User Profile Table
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      linkedin_url TEXT UNIQUE,
      name TEXT,
      title TEXT,
      summary TEXT,
      photo_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Job Preferences Table
    CREATE TABLE IF NOT EXISTS job_preferences (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_title TEXT,
      location TEXT,
      remote_type TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      experience_level TEXT,
      industry TEXT,
      contract_type TEXT,
      company_size TEXT,
      languages TEXT,
      required_skills TEXT,
      exclude_keywords TEXT,
      education_requirements TEXT,
      job_responsibilities TEXT,
      benefits_perks TEXT,
      working_hours TEXT,
      reporting_structure TEXT,
      travel_requirements TEXT,
      relocation_assistance BOOLEAN,
      visa_sponsorship BOOLEAN,
      performance_metrics TEXT,
      career_growth TEXT,
      equipment_resources TEXT,
      team_details TEXT,
      security_clearance BOOLEAN,
      compliance_guidelines TEXT,
      application_requirements TEXT,
      probation_period TEXT,
      physical_requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- AI Models Configuration Table
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      model_name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      api_endpoint TEXT,
      model_type TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Email Configuration Table
    CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email_provider TEXT,
      email_address TEXT,
      auth_type TEXT,
      oauth_token TEXT,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_username TEXT,
      smtp_password TEXT,
      auto_send BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Job Websites Configuration Table
    CREATE TABLE IF NOT EXISTS job_websites (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      website_name TEXT NOT NULL,
      website_url TEXT NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      search_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Company Monitoring Table
    CREATE TABLE IF NOT EXISTS company_monitoring (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      company_website TEXT NOT NULL,
      careers_page_url TEXT,
      last_checked DATETIME,
      check_frequency TEXT DEFAULT 'daily',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Job Listings Table
    CREATE TABLE IF NOT EXISTS job_listings (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_website TEXT,
      job_url TEXT UNIQUE,
      job_source TEXT,
      location TEXT,
      salary_range TEXT,
      job_description TEXT,
      requirements TEXT,
      language TEXT,
      posting_date DATETIME,
      found_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_relevant BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Applications Table
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_listing_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      application_status TEXT DEFAULT 'pending',
      application_date DATETIME,
      cv_path TEXT,
      motivation_letter_path TEXT,
      application_folder_path TEXT,
      account_created BOOLEAN DEFAULT 0,
      account_username TEXT,
      account_password_encrypted TEXT,
      application_method TEXT,
      verification_email_received BOOLEAN DEFAULT 0,
      verification_timeout DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id),
      FOREIGN KEY (job_listing_id) REFERENCES job_listings(id)
    );

    -- Application Log Table
    CREATE TABLE IF NOT EXISTS application_logs (
      id INTEGER PRIMARY KEY,
      application_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      status TEXT,
      message TEXT,
      error_message TEXT,
      recommendation TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- Action Log Table (for real-time UI updates)
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_description TEXT,
      status TEXT DEFAULT 'in_progress',
      success BOOLEAN,
      error_message TEXT,
      recommendation TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_user_profile_linkedin ON user_profile(linkedin_url);
    CREATE INDEX IF NOT EXISTS idx_job_preferences_user ON job_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_models_user ON ai_models(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_config_user ON email_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_websites_user ON job_websites(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_monitoring_user ON company_monitoring(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_listings_user ON job_listings(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_listing_id);
    CREATE INDEX IF NOT EXISTS idx_application_logs_app ON application_logs(application_id);
    CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);
  `);
  console.log("Database initialized successfully");
}

// src/main/ipc-handlers.ts
var import_electron2 = __toESM(require_electron());
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
