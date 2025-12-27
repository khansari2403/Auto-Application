// preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electron", {
  // A general tool to call any background command
  invoke: (channel, ...args) => import_electron.ipcRenderer.invoke(channel, ...args),
  // Specific Email tools
  saveEmailConfig: (data) => import_electron.ipcRenderer.invoke("email:save-config", data),
  getEmailConfig: (userId) => import_electron.ipcRenderer.invoke("email:get-config", userId),
  getGmailAuthUrl: (userId) => import_electron.ipcRenderer.invoke("email:get-gmail-auth-url", userId),
  onGmailCodeReceived: (callback) => import_electron.ipcRenderer.on("gmail:code-received", (_event, code) => callback(code)),
  exchangeCode: (userId, code) => import_electron.ipcRenderer.invoke("email:exchange-code", userId, code),
  // Application tools
  saveApp: (data) => import_electron.ipcRenderer.invoke("apps:save", data),
  getApps: (userId) => import_electron.ipcRenderer.invoke("apps:get-all", userId)
});
