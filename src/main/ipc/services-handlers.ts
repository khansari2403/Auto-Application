import { ipcMain } from 'electron';
import * as EmailService from '../features/email-service';
import * as CompatibilityService from '../features/compatibility-service';
import * as SecretaryAuth from '../features/secretary-auth';

export function registerServicesHandlers(): string[] {
  const channels = [
    // Email Service
    'email:test-config', 
    'email:send', 
    'email:send-notification',
    // Compatibility Score
    'compatibility:calculate', 
    'compatibility:calculate-all', 
    'compatibility:get-by-level',
    // Secretary Authentication
    'secretary:setup-pin', 
    'secretary:verify-pin', 
    'secretary:change-pin', 
    'secretary:reset-pin', 
    'secretary:is-pin-set', 
    'secretary:get-settings', 
    'secretary:update-permissions'
  ];

  // --- EMAIL SERVICE ---
  ipcMain.handle('email:test-config', async (_, data) => {
    try {
      return await EmailService.testEmailConfig(data.userId, data.testEmail);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send', async (_, data) => {
    try {
      return await EmailService.sendEmail(data.options, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send-notification', async (_, data) => {
    try {
      const result = await EmailService.sendNotification(data.userId, data.type, data.details);
      return { success: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- COMPATIBILITY SCORE ---
  ipcMain.handle('compatibility:calculate', async (_, data) => {
    try {
      const result = await CompatibilityService.calculateCompatibility(data.userId, data.jobId);
      return { success: true, ...result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:calculate-all', async (_, data) => {
    try {
      await CompatibilityService.calculateAllCompatibility(data.userId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:get-by-level', async (_, data) => {
    try {
      const jobs = await CompatibilityService.getJobsByCompatibility(data.userId, data.minLevel);
      return { success: true, data: jobs };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SECRETARY AUTHENTICATION ---
  ipcMain.handle('secretary:setup-pin', async (_, data) => {
    try {
      return await SecretaryAuth.setupSecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:verify-pin', async (_, data) => {
    try {
      return await SecretaryAuth.verifySecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:change-pin', async (_, data) => {
    try {
      return await SecretaryAuth.changeSecretaryPin(data.userId, data.currentPin, data.newPin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:reset-pin', async (_, data) => {
    try {
      return await SecretaryAuth.resetSecretaryPin(data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:is-pin-set', async (_, data) => {
    try {
      const isSet = await SecretaryAuth.isSecretaryPinSet(data.userId);
      return { success: true, isSet };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:get-settings', async (_, data) => {
    try {
      const settings = await SecretaryAuth.getSecretaryAccessSettings(data.userId);
      return { success: true, ...settings };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:update-permissions', async (_, data) => {
    try {
      return await SecretaryAuth.updateSecretaryPermissions(data.userId, data.permissions);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
