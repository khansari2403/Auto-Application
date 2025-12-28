// preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, ...args) => import_electron.ipcRenderer.invoke(channel, ...args),
  // Documents
  saveDoc: (data) => import_electron.ipcRenderer.invoke("docs:save", data),
  getDocs: (userId) => import_electron.ipcRenderer.invoke("docs:get-all", userId),
  // Profiles
  saveProfile: (data) => import_electron.ipcRenderer.invoke("profiles:save", data),
  getProfiles: (userId) => import_electron.ipcRenderer.invoke("profiles:get-all", userId),
  updateProfileStatus: (data) => import_electron.ipcRenderer.invoke("profiles:update", data),
  // AI Loop
  generateCV: (data) => import_electron.ipcRenderer.invoke("ai:generate-cv", data),
  verifyCV: (data) => import_electron.ipcRenderer.invoke("ai:verify-cv", data),
  // Existing
  getEmailConfig: (userId) => import_electron.ipcRenderer.invoke("email:get-config", userId),
  onGmailCodeReceived: (callback) => import_electron.ipcRenderer.on("gmail:code-received", (_event, code) => callback(code))
});
