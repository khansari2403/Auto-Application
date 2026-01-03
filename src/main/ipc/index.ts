import { ipcMain } from 'electron';

// Import all handler registrations
import { registerSettingsHandlers } from './settings-handlers';
import { registerUserHandlers } from './user-handlers';
import { registerProfilesHandlers } from './profiles-handlers';
import { registerJobsHandlers } from './jobs-handlers';
import { registerAIHandlers } from './ai-handlers';
import { registerDocsHandlers } from './docs-handlers';
import { registerWebsitesHandlers } from './websites-handlers';
import { registerAIModelsHandlers } from './ai-models-handlers';
import { registerSystemHandlers } from './system-handlers';
import { registerServicesHandlers } from './services-handlers';

/**
 * Setup all IPC handlers for the application.
 * This is the main entry point for IPC handler registration.
 */
export function setupIpcHandlers(): void {
  // Collect all channel names for cleanup
  const allChannels: string[] = [];

  // Register each handler module and collect channels
  const handlerModules = [
    registerSettingsHandlers,
    registerUserHandlers,
    registerProfilesHandlers,
    registerJobsHandlers,
    registerAIHandlers,
    registerDocsHandlers,
    registerWebsitesHandlers,
    registerAIModelsHandlers,
    registerSystemHandlers,
    registerServicesHandlers
  ];

  // First, remove any existing handlers to prevent duplication on hot reload
  const knownChannels = [
    'settings:get', 'settings:update', 'user:get-profile', 'user:update-profile',
    'user:open-linkedin', 'user:capture-linkedin', 'user:save-linkedin-profile',
    'profiles:get-all', 'profiles:save', 'profiles:update', 'profiles:delete',
    'jobs:get-all', 'jobs:delete', 'jobs:add-manual', 'jobs:update-doc-confirmation',
    'hunter:start-search', 'ai:process-application', 'ai:generate-tailored-docs',
    'ai:smart-apply', 'ai:continue-application', 'ai:cancel-application',
    'ai:fetch-models', 'ai:generate-interview-prep', 'ai:ask-custom-question',
    'docs:get-all', 'docs:save', 'docs:delete', 'docs:open-file', 'docs:convert-to-pdf', 
    'docs:convert-all-pdf', 'docs:reprocess',
    'websites:get-all', 'websites:add', 'websites:delete', 'websites:toggle-active',
    'ai-models:get-all', 'ai-models:add', 'ai-models:update', 'ai-models:delete',
    'logs:get-recent-actions', 'apps:get-all',
    'scheduler:toggle', 'scheduler:get-status',
    'qa:get-all', 'qa:update', 'qa:delete',
    'email:test-config', 'email:send', 'email:send-notification',
    'compatibility:calculate', 'compatibility:calculate-all', 'compatibility:get-by-level',
    'secretary:setup-pin', 'secretary:verify-pin', 'secretary:change-pin', 
    'secretary:reset-pin', 'secretary:is-pin-set', 'secretary:get-settings', 'secretary:update-permissions'
  ];

  // Remove existing handlers
  knownChannels.forEach(channel => {
    try { 
      ipcMain.removeHandler(channel); 
    } catch (e) { 
      /* ignore if not exists */ 
    }
  });

  // Register all handlers
  handlerModules.forEach(registerFn => {
    const channels = registerFn();
    allChannels.push(...channels);
  });

  console.log(`✅ IPC Handlers registered successfully (${allChannels.length} channels)`);
  console.log('   Handler modules loaded: settings, user, profiles, jobs, ai, docs, websites, ai-models, system, services');
}
