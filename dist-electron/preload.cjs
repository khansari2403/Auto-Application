var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
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
  getRecentActions: (userId, limit) => import_electron.ipcRenderer.invoke("logs:get-recent-actions", userId, limit),
  // Email Monitoring (NEW)
  getGmailAuthUrl: () => import_electron.ipcRenderer.invoke("email:get-gmail-auth-url"),
  startEmailMonitoring: (userId, accessToken) => import_electron.ipcRenderer.invoke("email:start-monitoring", userId, accessToken),
  stopEmailMonitoring: (userId) => import_electron.ipcRenderer.invoke("email:stop-monitoring", userId),
  getMonitoringStatus: (userId) => import_electron.ipcRenderer.invoke("email:get-monitoring-status", userId),
  getEmailAlerts: (userId) => import_electron.ipcRenderer.invoke("email:get-alerts", userId),
  markAlertAsRead: (alertId) => import_electron.ipcRenderer.invoke("email:mark-alert-read", alertId)
});
