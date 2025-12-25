/**
 * Database Module
 * Handles SQLite database initialization and schema creation
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    // Create data directory if it doesn't exist
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    const dbPath = path.join(dataDir, 'job-automation.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  // Create tables
  database.exec(`
    -- User Profile Table
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      linkedin_url TEXT UNIQUE,
      name TEXT,
      title TEXT,
      summary TEXT,
      photo_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Job Preferences Table
    CREATE TABLE IF NOT EXISTS job_preferences (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_title TEXT,
      location TEXT,
      remote_type TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      experience_level TEXT,
      industry TEXT,
      contract_type TEXT,
      company_size TEXT,
      languages TEXT,
      required_skills TEXT,
      exclude_keywords TEXT,
      education_requirements TEXT,
      job_responsibilities TEXT,
      benefits_perks TEXT,
      working_hours TEXT,
      reporting_structure TEXT,
      travel_requirements TEXT,
      relocation_assistance BOOLEAN,
      visa_sponsorship BOOLEAN,
      performance_metrics TEXT,
      career_growth TEXT,
      equipment_resources TEXT,
      team_details TEXT,
      security_clearance BOOLEAN,
      compliance_guidelines TEXT,
      application_requirements TEXT,
      probation_period TEXT,
      physical_requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- AI Models Configuration Table
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      model_name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      api_endpoint TEXT,
      model_type TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Email Configuration Table
    CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email_provider TEXT,
      email_address TEXT,
      auth_type TEXT,
      oauth_token TEXT,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_username TEXT,
      smtp_password TEXT,
      auto_send BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Job Websites Configuration Table
    CREATE TABLE IF NOT EXISTS job_websites (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      website_name TEXT NOT NULL,
      website_url TEXT NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      search_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Company Monitoring Table
    CREATE TABLE IF NOT EXISTS company_monitoring (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      company_website TEXT NOT NULL,
      careers_page_url TEXT,
      last_checked DATETIME,
      check_frequency TEXT DEFAULT 'daily',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Job Listings Table
    CREATE TABLE IF NOT EXISTS job_listings (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_website TEXT,
      job_url TEXT UNIQUE,
      job_source TEXT,
      location TEXT,
      salary_range TEXT,
      job_description TEXT,
      requirements TEXT,
      language TEXT,
      posting_date DATETIME,
      found_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_relevant BOOLEAN,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Applications Table
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      job_listing_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      application_status TEXT DEFAULT 'pending',
      application_date DATETIME,
      cv_path TEXT,
      motivation_letter_path TEXT,
      application_folder_path TEXT,
      account_created BOOLEAN DEFAULT 0,
      account_username TEXT,
      account_password_encrypted TEXT,
      application_method TEXT,
      verification_email_received BOOLEAN DEFAULT 0,
      verification_timeout DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id),
      FOREIGN KEY (job_listing_id) REFERENCES job_listings(id)
    );

    -- Application Log Table
    CREATE TABLE IF NOT EXISTS application_logs (
      id INTEGER PRIMARY KEY,
      application_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      status TEXT,
      message TEXT,
      error_message TEXT,
      recommendation TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- Action Log Table (for real-time UI updates)
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_description TEXT,
      status TEXT DEFAULT 'in_progress',
      success BOOLEAN,
      error_message TEXT,
      recommendation TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_profile(id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_user_profile_linkedin ON user_profile(linkedin_url);
    CREATE INDEX IF NOT EXISTS idx_job_preferences_user ON job_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_models_user ON ai_models(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_config_user ON email_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_websites_user ON job_websites(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_monitoring_user ON company_monitoring(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_listings_user ON job_listings(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_listing_id);
    CREATE INDEX IF NOT EXISTS idx_application_logs_app ON application_logs(application_id);
    CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);
  `);

  console.log('Database initialized successfully');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
