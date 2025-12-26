/**
 * Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC methods to React app
contextBridge.exposeInMainWorld('electron', {
  // User Profile
  createProfile: (data: any) => ipcRenderer.invoke('user:create-profile', data),
  getProfile: (userId: number) => ipcRenderer.invoke('user:get-profile', userId),
  updateProfile: (data: any) => ipcRenderer.invoke('user:update-profile', data),

  // Job Preferences
  savePreferences: (data: any) => ipcRenderer.invoke('preferences:save', data),
  getPreferences: (userId: number) => ipcRenderer.invoke('preferences:get', userId),
  updatePreferences: (data: any) => ipcRenderer.invoke('preferences:update', data),

  // AI Models
  addAIModel: (data: any) => ipcRenderer.invoke('ai-models:add', data),
  getAIModels: (userId: number) => ipcRenderer.invoke('ai-models:get-all', userId),
  deleteAIModel: (modelId: number) => ipcRenderer.invoke('ai-models:delete', modelId),
  updateAIModel: (data: any) => ipcRenderer.invoke('ai-models:update', data),

  // Email Configuration
  saveEmailConfig: (data: any) => ipcRenderer.invoke('email:save-config', data),
  getEmailConfig: (userId: number) => ipcRenderer.invoke('email:get-config', userId),
  updateEmailConfig: (data: any) => ipcRenderer.invoke('email:update-config', data),

  // Job Websites
  addWebsite: (data: any) => ipcRenderer.invoke('websites:add', data),
  getWebsites: (userId: number) => ipcRenderer.invoke('websites:get-all', userId),
  deleteWebsite: (websiteId: number) => ipcRenderer.invoke('websites:delete', websiteId),
  updateWebsite: (data: any) => ipcRenderer.invoke('websites:update', data),

  // Company Monitoring
  addCompanyMonitoring: (data: any) => ipcRenderer.invoke('company:add-monitoring', data),
  getCompanyMonitoring: (userId: number) => ipcRenderer.invoke('company:get-all-monitoring', userId),
  deleteCompanyMonitoring: (companyId: number) => ipcRenderer.invoke('company:delete-monitoring', companyId),

  // Action Logs
  addActionLog: (data: any) => ipcRenderer.invoke('logs:add-action', data),
  getRecentActions: (userId: number, limit?: number) => ipcRenderer.invoke('logs:get-recent-actions', userId, limit),

  // Email Monitoring (NEW)
  getGmailAuthUrl: () => ipcRenderer.invoke('email:get-gmail-auth-url'),
  startEmailMonitoring: (userId: number, accessToken: string) => ipcRenderer.invoke('email:start-monitoring', userId, accessToken),
  stopEmailMonitoring: (userId: number) => ipcRenderer.invoke('email:stop-monitoring', userId),
  getMonitoringStatus: (userId: number) => ipcRenderer.invoke('email:get-monitoring-status', userId),
  getEmailAlerts: (userId: number) => ipcRenderer.invoke('email:get-alerts', userId),
  markAlertAsRead: (alertId: number) => ipcRenderer.invoke('email:mark-alert-read', alertId),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electron: {
      createProfile: (data: any) => Promise<any>;
      getProfile: (userId: number) => Promise<any>;
      updateProfile: (data: any) => Promise<any>;
      savePreferences: (data: any) => Promise<any>;
      getPreferences: (userId: number) => Promise<any>;
      updatePreferences: (data: any) => Promise<any>;
      addAIModel: (data: any) => Promise<any>;
      getAIModels: (userId: number) => Promise<any>;
      deleteAIModel: (modelId: number) => Promise<any>;
      updateAIModel: (data: any) => Promise<any>;
      saveEmailConfig: (data: any) => Promise<any>;
      getEmailConfig: (userId: number) => Promise<any>;
      updateEmailConfig: (data: any) => Promise<any>;
      addWebsite: (data: any) => Promise<any>;
      getWebsites: (userId: number) => Promise<any>;
      deleteWebsite: (websiteId: number) => Promise<any>;
      updateWebsite: (data: any) => Promise<any>;
      addCompanyMonitoring: (data: any) => Promise<any>;
      getCompanyMonitoring: (userId: number) => Promise<any>;
      deleteCompanyMonitoring: (companyId: number) => Promise<any>;
      addActionLog: (data: any) => Promise<any>;
      getRecentActions: (userId: number, limit?: number) => Promise<any>;
      // Email Monitoring (NEW)
      getGmailAuthUrl: () => Promise<any>;
      startEmailMonitoring: (userId: number, accessToken: string) => Promise<any>;
      stopEmailMonitoring: (userId: number) => Promise<any>;
      getMonitoringStatus: (userId: number) => Promise<any>;
      getEmailAlerts: (userId: number) => Promise<any>;
      markAlertAsRead: (alertId: number) => Promise<any>;
    };
  }
}

export {};