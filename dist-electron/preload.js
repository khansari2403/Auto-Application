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
    var fs = require("fs");
    var path = require("path");
    var pathFile = path.join(__dirname, "path.txt");
    function getElectronPath() {
      let executablePath;
      if (fs.existsSync(pathFile)) {
        executablePath = fs.readFileSync(pathFile, "utf-8");
      }
      if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
        return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || "electron");
      }
      if (executablePath) {
        return path.join(__dirname, "dist", executablePath);
      } else {
        throw new Error("Electron failed to install correctly, please delete node_modules/electron and try installing again");
      }
    }
    module2.exports = getElectronPath();
  }
});

// preload.ts
var import_electron = __toESM(require_electron());
import_electron.contextBridge.exposeInMainWorld("electron", {
  // User Profile
  createProfile: (data) => import_electron.ipcRenderer.invoke("user:create-profile", data),
  getProfile: (userId) => import_electron.ipcRenderer.invoke("user:get-profile", userId),
  updateProfile: (data) => import_electron.ipcRenderer.invoke("user:update-profile", data),
  // Job Preferences
  savePreferences: (data) => import_electron.ipcRenderer.invoke("preferences:save", data),
  getPreferences: (userId) => import_electron.ipcRenderer.invoke("preferences:get", userId),
  updatePreferences: (data) => import_electron.ipcRenderer.invoke("preferences:update", data),
  // AI Models
  addAIModel: (data) => import_electron.ipcRenderer.invoke("ai-models:add", data),
  getAIModels: (userId) => import_electron.ipcRenderer.invoke("ai-models:get-all", userId),
  deleteAIModel: (modelId) => import_electron.ipcRenderer.invoke("ai-models:delete", modelId),
  updateAIModel: (data) => import_electron.ipcRenderer.invoke("ai-models:update", data),
  // Email Configuration
  saveEmailConfig: (data) => import_electron.ipcRenderer.invoke("email:save-config", data),
  getEmailConfig: (userId) => import_electron.ipcRenderer.invoke("email:get-config", userId),
  updateEmailConfig: (data) => import_electron.ipcRenderer.invoke("email:update-config", data),
  // Job Websites
  addWebsite: (data) => import_electron.ipcRenderer.invoke("websites:add", data),
  getWebsites: (userId) => import_electron.ipcRenderer.invoke("websites:get-all", userId),
  deleteWebsite: (websiteId) => import_electron.ipcRenderer.invoke("websites:delete", websiteId),
  updateWebsite: (data) => import_electron.ipcRenderer.invoke("websites:update", data),
  // Company Monitoring
  addCompanyMonitoring: (data) => import_electron.ipcRenderer.invoke("company:add-monitoring", data),
  getCompanyMonitoring: (userId) => import_electron.ipcRenderer.invoke("company:get-all-monitoring", userId),
  deleteCompanyMonitoring: (companyId) => import_electron.ipcRenderer.invoke("company:delete-monitoring", companyId),
  // Action Logs
  addActionLog: (data) => import_electron.ipcRenderer.invoke("logs:add-action", data),
  getRecentActions: (userId, limit) => import_electron.ipcRenderer.invoke("logs:get-recent-actions", userId, limit)
});
