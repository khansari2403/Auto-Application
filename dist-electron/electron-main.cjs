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
var import_electron4 = require("electron");
var import_path3 = __toESM(require("path"), 1);
var import_electron_is_dev = __toESM(require_electron_is_dev(), 1);

// src/main/database.ts
init_cjs_shims();
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
  const tables = ["user_profile", "email_config", "job_preferences", "ai_models", "job_websites", "company_monitoring", "job_listings", "applications", "action_logs", "email_alerts", "documents", "search_profiles", "settings"];
  tables.forEach((t) => {
    if (!dbData[t])
      dbData[t] = [];
  });
  if (!dbData.search_profiles.find((p) => p.is_speculative === 1)) {
    dbData.search_profiles.push({ id: 999, profile_name: "Speculative Application", is_active: 0, is_speculative: 1, location: "Any", industry: "Any" });
  }
  if (dbData.settings.length === 0) {
    dbData.settings = [{ id: 1, auto_apply: 0, language: "en", layout: "ltr", storage_path: import_electron.app.getPath("documents") }];
  }
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
  settings: [{ id: 1, auto_apply: 0, language: "en", layout: "ltr", storage_path: "" }]
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
  const table = sql.includes("INSERT") ? sqlParts[2] : sqlParts[1];
  const newData = Array.isArray(params) ? params[0] : params;
  if (sql.includes("INSERT")) {
    const mapped = mapToSnakeCase(newData);
    if (table === "job_listings") {
      const existing = db.job_listings.find((j) => j.url === mapped.url);
      if (existing) {
        existing.seen_count = (existing.seen_count || 1) + 1;
        existing.last_seen = (/* @__PURE__ */ new Date()).toISOString();
        saveDb();
        return { id: existing.id };
      }
      mapped.seen_count = 1;
      mapped.first_seen = (/* @__PURE__ */ new Date()).toISOString();
      mapped.last_seen = (/* @__PURE__ */ new Date()).toISOString();
      mapped.sources = [mapped.source || "Manual"];
    }
    const entry = {
      ...mapped,
      id,
      status: table === "ai_models" ? "active" : void 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    db[table].push(entry);
  } else if (sql.includes("UPDATE")) {
    const index = db[table].findIndex((item) => item.id === newData.id || ["user_profile", "email_config", "settings"].includes(table));
    if (index !== -1)
      db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  } else if (sql.includes("DELETE")) {
    if (sql.includes("WHERE id = ?")) {
      const deleteId = Array.isArray(params) ? params[0] : params;
      db[table] = db[table].filter((item) => item.id !== deleteId && item.is_speculative !== 1);
    } else {
      db[table] = db[table].filter((item) => item.is_speculative === 1);
    }
  }
  saveDb();
  return { id };
}
async function getQuery(sql, params = []) {
  var _a;
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3];
  return ((_a = db[table]) == null ? void 0 : _a[0]) || null;
}
async function getAllQuery(sql, params = []) {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3];
  return db[table] || [];
}

// src/main/ipc-handlers.ts
init_cjs_shims();
var import_electron3 = require("electron");

// src/main/ai-service.ts
init_cjs_shims();
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_electron2 = require("electron");
async function processApplication(jobId, userId) {
  try {
    console.log("--- AI LOOP DEBUG START ---");
    const db = getDatabase();
    const job = db.job_listings.find((j) => j.id === jobId);
    const profile = await getQuery("SELECT * FROM user_profile");
    const models = await getAllQuery("SELECT * FROM ai_models");
    const settings = await getQuery("SELECT * FROM settings");
    console.log(`Found ${models.length} total AI models in database.`);
    models.forEach((m) => console.log(`- Member: ${m.model_name}, Role: ${m.role}, Status: ${m.status}`));
    const thinker = models.find((m) => {
      var _a;
      return ((_a = m.role) == null ? void 0 : _a.toLowerCase().includes("thinker")) && m.status === "active";
    });
    const auditor = models.find((m) => {
      var _a;
      return ((_a = m.role) == null ? void 0 : _a.toLowerCase().includes("auditor")) && m.status === "active";
    });
    if (!thinker && !auditor)
      throw new Error("CRITICAL: Both 'Thinker' (Adam) and 'Auditor' (Eve) are missing or inactive. Please check your AI Team settings.");
    if (!thinker)
      throw new Error(`The 'Thinker' (Adam) is missing. I found: ${models.map((m) => m.role).join(", ")}`);
    if (!auditor)
      throw new Error(`The 'Auditor' (Eve) is missing. I found: ${models.map((m) => m.role).join(", ")}`);
    console.log(`Team Assembled: Thinker=${thinker.model_name}, Auditor=${auditor.model_name}`);
    await logAction(userId, "ai_loop", `Starting AI Loop for ${job.job_title} at ${job.company_name}`, "in_progress");
    let generatedCV = `Tailored CV for ${job.job_title}

Experience: ${(profile == null ? void 0 : profile.experiences) || "No experience data"}`;
    let generatedLetter = `Dear ${job.company_name} Team,

I am excited to apply...`;
    const folderName = `${job.company_name}_${job.job_title}_${Date.now()}`.replace(/[^a-z0-9]/gi, "_");
    const saveDir = import_path2.default.join(settings.storage_path || import_electron2.app.getPath("documents"), folderName);
    if (!import_fs2.default.existsSync(saveDir))
      import_fs2.default.mkdirSync(saveDir, { recursive: true });
    import_fs2.default.writeFileSync(import_path2.default.join(saveDir, "Tailored_CV.txt"), generatedCV);
    import_fs2.default.writeFileSync(import_path2.default.join(saveDir, "Motivation_Letter.txt"), generatedLetter);
    await runQuery("UPDATE job_listings", { id: jobId, status: "applied" });
    await logAction(userId, "ai_loop", `Success! Files saved to: ${saveDir}`, "completed", true);
    return { success: true, path: saveDir };
  } catch (error) {
    console.error("AI LOOP ERROR:", error.message);
    await logAction(userId, "ai_loop", `AI Loop Failed: ${error.message}`, "failed", false);
    return { success: false, error: error.message };
  }
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
function setupIpcHandlers() {
  import_electron3.ipcMain.handle("ai:process-application", async (_, jobId, userId) => {
    return await processApplication(jobId, userId);
  });
  import_electron3.ipcMain.handle("ai-models:add", async (_, data) => await runQuery("INSERT INTO ai_models", [data]));
  import_electron3.ipcMain.handle("ai-models:get-all", async (_, userId) => ({ success: true, data: await getAllQuery("SELECT * FROM ai_models") }));
  import_electron3.ipcMain.handle("ai-models:delete", async (_, id) => await runQuery("DELETE ai_models WHERE id = ?", [id]));
  import_electron3.ipcMain.handle("settings:get", async () => ({ success: true, data: await getQuery("SELECT * FROM settings") }));
  import_electron3.ipcMain.handle("settings:update", async (_, data) => await runQuery("UPDATE settings", [data]));
  import_electron3.ipcMain.handle("settings:select-directory", async () => {
    const result = await import_electron3.dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled)
      return null;
    return result.filePaths[0];
  });
  import_electron3.ipcMain.handle("docs:save", async (_, data) => await runQuery("INSERT INTO documents", [data]));
  import_electron3.ipcMain.handle("docs:get-all", async (_, userId) => ({ success: true, data: await getAllQuery("SELECT * FROM documents") }));
  import_electron3.ipcMain.handle("docs:delete", async (_, id) => await runQuery("DELETE documents WHERE id = ?", [id]));
  import_electron3.ipcMain.handle("jobs:get-all", async (_, userId) => ({ success: true, data: await getAllQuery("SELECT * FROM job_listings") }));
  import_electron3.ipcMain.handle("jobs:add-manual", async (_, data) => await runQuery("INSERT INTO job_listings", { ...data, source: "Manual", profileName: "Manual" }));
  import_electron3.ipcMain.handle("profiles:save", async (_, data) => await runQuery("INSERT INTO search_profiles", [data]));
  import_electron3.ipcMain.handle("profiles:get-all", async (_, userId) => ({ success: true, data: await getAllQuery("SELECT * FROM search_profiles") }));
  import_electron3.ipcMain.handle("profiles:update", async (_, data) => await runQuery("UPDATE search_profiles", [data]));
  import_electron3.ipcMain.handle("profiles:delete", async (_, id) => await runQuery("DELETE search_profiles WHERE id = ?", [id]));
  import_electron3.ipcMain.handle("logs:get-recent-actions", async (_, userId) => ({ success: true, data: await getAllQuery("SELECT * FROM action_logs") }));
  import_electron3.ipcMain.handle("logs:clear", async (_, userId) => await runQuery("DELETE action_logs", []));
  import_electron3.ipcMain.handle("email:get-config", async (_, userId) => ({ success: true, data: await getQuery("SELECT * FROM email_config") }));
  import_electron3.ipcMain.handle("user:get-profile", async (_, userId) => ({ success: true, data: await getQuery("SELECT * FROM user_profile") }));
  import_electron3.ipcMain.handle("user:update-profile", async (_, data) => await runQuery("UPDATE user_profile", [data]));
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
      preload: import_path3.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const startUrl = import_electron_is_dev.default ? "http://localhost:5173" : `file://${import_path3.default.join(__dirname, "../dist/index.html")}`;
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
