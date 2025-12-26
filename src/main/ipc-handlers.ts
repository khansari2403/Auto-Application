import { runQuery, getAllQuery, getQuery } from './database';
/**
 * IPC Handlers
 * Handles communication between renderer (React UI) and main process
 */

import { ipcMain } from 'electron';
import { getDatabase } from './database';

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers(): void {
  // User Profile Handlers
  ipcMain.handle('user:create-profile', handleCreateProfile);
  ipcMain.handle('user:get-profile', handleGetProfile);
  ipcMain.handle('user:update-profile', handleUpdateProfile);

  // Job Preferences Handlers
  ipcMain.handle('preferences:save', handleSavePreferences);
  ipcMain.handle('preferences:get', handleGetPreferences);
  ipcMain.handle('preferences:update', handleUpdatePreferences);

  // AI Models Handlers
  ipcMain.handle('ai-models:add', handleAddAIModel);
  ipcMain.handle('ai-models:get-all', handleGetAIModels);
  ipcMain.handle('ai-models:delete', handleDeleteAIModel);
  ipcMain.handle('ai-models:update', handleUpdateAIModel);

  // Email Configuration Handlers
  ipcMain.handle('email:save-config', handleSaveEmailConfig);
  ipcMain.handle('email:get-config', handleGetEmailConfig);
  ipcMain.handle('email:update-config', handleUpdateEmailConfig);

  // Job Websites Handlers
  ipcMain.handle('websites:add', handleAddWebsite);
  ipcMain.handle('websites:get-all', handleGetWebsites);
  ipcMain.handle('websites:delete', handleDeleteWebsite);
  ipcMain.handle('websites:update', handleUpdateWebsite);

  // Company Monitoring Handlers
  ipcMain.handle('company:add-monitoring', handleAddCompanyMonitoring);
  ipcMain.handle('company:get-all-monitoring', handleGetCompanyMonitoring);
  ipcMain.handle('company:delete-monitoring', handleDeleteCompanyMonitoring);

  // Action Log Handlers
  ipcMain.handle('logs:add-action', handleAddActionLog);
  ipcMain.handle('logs:get-recent-actions', handleGetRecentActions);

  // Email Monitoring Handlers
  ipcMain.handle('email:get-gmail-auth-url', handleGetGmailAuthUrl);
  ipcMain.handle('email:start-monitoring', handleStartEmailMonitoring);
  ipcMain.handle('email:stop-monitoring', handleStopEmailMonitoring);
  ipcMain.handle('email:get-monitoring-status', handleGetMonitoringStatus);
}

// ============ User Profile Handlers ============

async function handleCreateProfile(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO user_profile (linkedin_url, name, title, summary, photo_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.linkedinUrl,
      data.name,
      data.title,
      data.summary,
      data.photoPath
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetProfile(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM user_profile WHERE id = ?');
    const profile = stmt.get(userId);
    return { success: true, data: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleUpdateProfile(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE user_profile 
      SET name = ?, title = ?, summary = ?, photo_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(data.name, data.title, data.summary, data.photoPath, data.id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ Job Preferences Handlers ============

async function handleSavePreferences(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO job_preferences (
        user_id, job_title, location, remote_type, salary_min, salary_max,
        experience_level, industry, contract_type, company_size, languages,
        required_skills, exclude_keywords, education_requirements,
        job_responsibilities, benefits_perks, working_hours, reporting_structure,
        travel_requirements, relocation_assistance, visa_sponsorship,
        performance_metrics, career_growth, equipment_resources, team_details,
        security_clearance, compliance_guidelines, application_requirements,
        probation_period, physical_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.jobTitle,
      data.location,
      data.remoteType,
      data.salaryMin,
      data.salaryMax,
      data.experienceLevel,
      data.industry,
      data.contractType,
      data.companySize,
      data.languages,
      data.requiredSkills,
      data.excludeKeywords,
      data.educationRequirements,
      data.jobResponsibilities,
      data.benefitsPerks,
      data.workingHours,
      data.reportingStructure,
      data.travelRequirements,
      data.relocationAssistance,
      data.visaSponsorship,
      data.performanceMetrics,
      data.careerGrowth,
      data.equipmentResources,
      data.teamDetails,
      data.securityClearance,
      data.complianceGuidelines,
      data.applicationRequirements,
      data.probationPeriod,
      data.physicalRequirements
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetPreferences(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM job_preferences WHERE user_id = ? LIMIT 1');
    const preferences = stmt.get(userId);
    return { success: true, data: preferences };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleUpdatePreferences(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE job_preferences 
      SET job_title = ?, location = ?, remote_type = ?, salary_min = ?, salary_max = ?,
          experience_level = ?, industry = ?, contract_type = ?, company_size = ?,
          languages = ?, required_skills = ?, exclude_keywords = ?,
          education_requirements = ?, job_responsibilities = ?, benefits_perks = ?,
          working_hours = ?, reporting_structure = ?, travel_requirements = ?,
          relocation_assistance = ?, visa_sponsorship = ?, performance_metrics = ?,
          career_growth = ?, equipment_resources = ?, team_details = ?,
          security_clearance = ?, compliance_guidelines = ?, application_requirements = ?,
          probation_period = ?, physical_requirements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.jobTitle,
      data.location,
      data.remoteType,
      data.salaryMin,
      data.salaryMax,
      data.experienceLevel,
      data.industry,
      data.contractType,
      data.companySize,
      data.languages,
      data.requiredSkills,
      data.excludeKeywords,
      data.educationRequirements,
      data.jobResponsibilities,
      data.benefitsPerks,
      data.workingHours,
      data.reportingStructure,
      data.travelRequirements,
      data.relocationAssistance,
      data.visaSponsorship,
      data.performanceMetrics,
      data.careerGrowth,
      data.equipmentResources,
      data.teamDetails,
      data.securityClearance,
      data.complianceGuidelines,
      data.applicationRequirements,
      data.probationPeriod,
      data.physicalRequirements,
      data.id
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ AI Models Handlers ============

async function handleAddAIModel(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ai_models (user_id, model_name, api_key, api_endpoint, model_type, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.modelName,
      data.apiKey,
      data.apiEndpoint,
      data.modelType,
      data.isActive ?? true
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetAIModels(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM ai_models WHERE user_id = ?');
    const models = stmt.all(userId);
    return { success: true, data: models };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleDeleteAIModel(event: any, modelId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ai_models WHERE id = ?');
    stmt.run(modelId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleUpdateAIModel(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE ai_models 
      SET model_name = ?, api_key = ?, api_endpoint = ?, model_type = ?, is_active = ?
      WHERE id = ?
    `);
    stmt.run(
      data.modelName,
      data.apiKey,
      data.apiEndpoint,
      data.modelType,
      data.isActive,
      data.id
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ Email Configuration Handlers ============

async function handleSaveEmailConfig(_event: any, data: any) {
  try {
    // We pass the whole 'data' object to runQuery
    const result = await runQuery('INSERT INTO email_config', [data]);
    return { success: true, id: result.id };
  } catch (error: any) {
    console.error('Error saving email config:', error);
    return { success: false, error: error.message };
  }
}
async function handleGetEmailConfig(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM email_config WHERE user_id = ? LIMIT 1');
    const config = stmt.get(userId);
    return { success: true, data: config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleUpdateEmailConfig(_event: any, data: any) {
  try {
    await runQuery('UPDATE email_config', [data]);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating email config:', error);
    return { success: false, error: error.message };
  }
}
// ============ Job Websites Handlers ============

async function handleAddWebsite(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO job_websites (user_id, website_name, website_url, is_default, is_active, search_config)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.websiteName,
      data.websiteUrl,
      data.isDefault ?? false,
      data.isActive ?? true,
      data.searchConfig
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetWebsites(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM job_websites WHERE user_id = ?');
    const websites = stmt.all(userId);
    return { success: true, data: websites };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleDeleteWebsite(event: any, websiteId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM job_websites WHERE id = ?');
    stmt.run(websiteId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleUpdateWebsite(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE job_websites 
      SET website_name = ?, website_url = ?, is_default = ?, is_active = ?, search_config = ?
      WHERE id = ?
    `);
    stmt.run(
      data.websiteName,
      data.websiteUrl,
      data.isDefault,
      data.isActive,
      data.searchConfig,
      data.id
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ Company Monitoring Handlers ============

async function handleAddCompanyMonitoring(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO company_monitoring (user_id, company_name, company_website, careers_page_url, check_frequency, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.companyName,
      data.companyWebsite,
      data.careersPageUrl,
      data.checkFrequency ?? 'daily',
      data.isActive ?? true
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetCompanyMonitoring(event: any, userId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM company_monitoring WHERE user_id = ?');
    const companies = stmt.all(userId);
    return { success: true, data: companies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleDeleteCompanyMonitoring(event: any, companyId: number) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM company_monitoring WHERE id = ?');
    stmt.run(companyId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============ Action Log Handlers ============

async function handleAddActionLog(event: any, data: any) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO action_logs (user_id, action_type, action_description, status, success, error_message, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.actionType,
      data.actionDescription,
      data.status ?? 'in_progress',
      data.success ?? null,
      data.errorMessage,
      data.recommendation
    );
    return { success: true, id: result.lastInsertRowid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetRecentActions(event: any, userId: number, limit: number = 50) {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM action_logs 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const actions = stmt.all(userId, limit);
    return { success: true, data: actions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
// ============ Email Monitoring Handlers ============

async function handleGetGmailAuthUrl(_event: any) {
  try {
    const emailService = await import('./email-service');
    const url = emailService.getGmailAuthUrl();
    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleStartEmailMonitoring(_event: any, userId: number, accessToken: string) {
  try {
    const emailMonitor = await import('./email-monitor');
    emailMonitor.startEmailMonitoring(
      { userId, checkIntervalMinutes: 60, isActive: true },
      accessToken
    );
    return { success: true, message: 'Email monitoring started' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleStopEmailMonitoring(_event: any, userId: number) {
  try {
    const emailMonitor = await import('./email-monitor');
    emailMonitor.stopEmailMonitoring(userId);
    return { success: true, message: 'Email monitoring stopped' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetMonitoringStatus(_event: any, userId: number) {
  try {
    const emailMonitor = await import('./email-monitor');
    const isActive = emailMonitor.getMonitoringStatus(userId);
    return { success: true, isActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
async function handleExchangeCode(_event: any, userId: number, code: string) {
  try {
    const emailService = await import('./email-service');
    const tokenConfig = await emailService.exchangeGmailCode(userId, code);
    
    // NEW: Save the tokens to the database immediately
    await runQuery('UPDATE email_config', [{
      access_token: tokenConfig.accessToken,
      refresh_token: tokenConfig.refreshToken,
      expires_at: tokenConfig.expiresAt
    }]);

    return { success: true, data: tokenConfig };
  } catch (error: any) {
    console.error('Error exchanging code:', error);
    return { success: false, error: error.message };
  }
}