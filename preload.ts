import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // A general tool to call any background command
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Specific Email tools
  saveEmailConfig: (data: any) => ipcRenderer.invoke('email:save-config', data),
  getEmailConfig: (userId: number) => ipcRenderer.invoke('email:get-config', userId),
  getGmailAuthUrl: (userId: number) => ipcRenderer.invoke('email:get-gmail-auth-url', userId),
  onGmailCodeReceived: (callback: (code: string) => void) => 
    ipcRenderer.on('gmail:code-received', (_event, code) => callback(code)),
  exchangeCode: (userId: number, code: string) => ipcRenderer.invoke('email:exchange-code', userId, code),
  
  // Application tools
  saveApp: (data: any) => ipcRenderer.invoke('apps:save', data),
  getApps: (userId: number) => ipcRenderer.invoke('apps:get-all', userId),
});