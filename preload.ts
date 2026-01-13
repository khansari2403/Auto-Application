import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Documents
  saveDoc: (data: any) => ipcRenderer.invoke('docs:save', data),
  getDocs: (userId: number) => ipcRenderer.invoke('docs:get-all', userId),
  
  // Profiles
  saveProfile: (data: any) => ipcRenderer.invoke('profiles:save', data),
  getProfiles: (userId: number) => ipcRenderer.invoke('profiles:get-all', userId),
  updateProfileStatus: (data: any) => ipcRenderer.invoke('profiles:update', data),

  // AI Loop
  generateCV: (data: any) => ipcRenderer.invoke('ai:generate-cv', data),
  verifyCV: (data: any) => ipcRenderer.invoke('ai:verify-cv', data),

  // Existing
  getEmailConfig: (userId: number) => ipcRenderer.invoke('email:get-config', userId),
  onGmailCodeReceived: (callback: (code: string) => void) => ipcRenderer.on('gmail:code-received', (_event, code) => callback(code)),
});