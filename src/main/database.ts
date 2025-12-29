import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let dbData: any = (global as any).dbData || null;

const getDbPath = () => {
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'db.json');
};

export function getDatabase(): any {
  if (!dbData) {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      try { dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } 
      catch (e) { dbData = getDefaultData(); }
    } else { dbData = getDefaultData(); }
    (global as any).dbData = dbData;
  }
  const tables = ['user_profile', 'email_config', 'job_preferences', 'ai_models', 'job_websites', 'company_monitoring', 'job_listings', 'applications', 'action_logs', 'email_alerts', 'documents', 'search_profiles', 'settings', 'questions'];
  tables.forEach(t => { if (!dbData[t]) dbData[t] = []; });
  
  if (!dbData.search_profiles.find((p: any) => p.is_speculative === 1)) {
    dbData.search_profiles.push({ id: 999, profile_name: "Speculative Application", is_active: 0, is_speculative: 1, location: 'Any', industry: 'Any' });
  }
  
  if (dbData.search_profiles.length <= 1) {
    dbData.search_profiles.push({ 
      id: Date.now(), 
      profile_name: "Software Engineer", 
      is_active: 1, 
      is_speculative: 0, 
      location: 'Remote', 
      industry: 'Tech/IT',
      job_type: 'Full-Time',
      experience_level: 'Mid-Level',
      required_skills: 'React, TypeScript, Node.js'
    });
  }

  if (dbData.job_websites.length === 0) {
    dbData.job_websites.push(
      { id: 1, website_name: 'LinkedIn', website_url: 'https://www.linkedin.com/jobs', is_active: 1 },
      { id: 2, website_name: 'Indeed', website_url: 'https://www.indeed.com', is_active: 1 }
    );
  }

  if (dbData.settings.length === 0) {
    dbData.settings = [{ id: 1, auto_apply: 0, language: 'en', layout: 'ltr', storage_path: app.getPath('documents') }];
  }
  return dbData;
}

const getDefaultData = () => ({
  user_profile: [], email_config: [], job_preferences: [], ai_models: [],
  job_websites: [], company_monitoring: [], job_listings: [],
  applications: [], action_logs: [], email_alerts: [],
  documents: [], search_profiles: [], settings: [], questions: []
});

const saveDb = () => fs.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));

export async function initializeDatabase(): Promise<void> { getDatabase(); }

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const mapToSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) { newObj[toSnakeCase(key)] = obj[key]; }
  return newObj;
};

export async function runQuery(sql: string, params: any = []): Promise<any> {
  const db = getDatabase();
  const id = Date.now();
  const sqlParts = sql.trim().split(/\s+/);
  let table = '';
  
  if (sql.toUpperCase().includes('INSERT INTO')) table = sqlParts[2];
  else if (sql.toUpperCase().includes('UPDATE')) table = sqlParts[1];
  else if (sql.toUpperCase().includes('DELETE FROM')) table = sqlParts[2];
  else if (sql.toUpperCase().includes('DELETE')) table = sqlParts[1];

  table = table.replace(/[`"']/g, '');

  if (!db[table]) {
    console.error(`Table "${table}" not found in database.`);
    return { success: false, error: 'Table not found' };
  }

  const newData = Array.isArray(params) ? params[0] : params;

  if (sql.toUpperCase().includes('INSERT')) {
    const mapped = mapToSnakeCase(newData);
    const entry = { 
      ...mapped, 
      id, 
      status: table === 'ai_models' ? 'active' : (mapped.status || 'submitted'),
      ai_status: table === 'documents' ? 'pending' : undefined,
      timestamp: new Date().toISOString(), 
      created_at: new Date().toISOString() 
    };
    db[table].push(entry);
  } else if (sql.toUpperCase().includes('UPDATE')) {
    const index = db[table].findIndex((item: any) => item.id === newData.id || ['user_profile', 'email_config', 'settings'].includes(table));
    if (index !== -1) db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData), updated_at: new Date().toISOString() };
  } else if (sql.toUpperCase().includes('DELETE')) {
    if (sql.includes('WHERE id = ?')) {
      const deleteId = Array.isArray(params) ? params[0] : params;
      db[table] = db[table].filter((item: any) => item.id !== deleteId);
    } else { db[table] = []; }
  }
  saveDb();
  return { id };
}

export async function getQuery(sql: string, params: any[] = []): Promise<any> {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3].replace(/[`"']/g, '');
  if (sql.includes('WHERE id = ?')) {
    return db[table]?.find((item: any) => item.id === params[0]) || null;
  }
  return db[table]?.[0] || null;
}

export async function getAllQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3].replace(/[`"']/g, '');
  return db[table] || [];
}