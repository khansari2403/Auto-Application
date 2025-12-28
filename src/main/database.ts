import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// We use a global variable to ensure the database is shared across all files
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
    (global as any).dbData = dbData; // Save to global
  }
  const tables = ['user_profile', 'email_config', 'job_preferences', 'ai_models', 'job_websites', 'company_monitoring', 'job_listings', 'applications', 'action_logs', 'email_alerts', 'documents', 'search_profiles', 'settings'];
  tables.forEach(t => { if (!dbData[t]) dbData[t] = []; });
  
  if (!dbData.search_profiles.find((p: any) => p.is_speculative === 1)) {
    dbData.search_profiles.push({ id: 999, profile_name: "Speculative Application", is_active: 0, is_speculative: 1, location: 'Any', industry: 'Any' });
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
  documents: [], search_profiles: [], settings: [{ id: 1, auto_apply: 0, language: 'en', layout: 'ltr', storage_path: '' }]
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
  const table = sql.includes('INSERT') ? sqlParts[2] : sqlParts[1];
  const newData = Array.isArray(params) ? params[0] : params;

  if (sql.includes('INSERT')) {
    const mapped = mapToSnakeCase(newData);
    if (table === 'job_listings') {
      const existing = db.job_listings.find((j: any) => j.url === mapped.url);
      if (existing) {
        existing.seen_count = (existing.seen_count || 1) + 1;
        existing.last_seen = new Date().toISOString();
        saveDb(); return { id: existing.id };
      }
      mapped.seen_count = 1; mapped.first_seen = new Date().toISOString(); mapped.last_seen = new Date().toISOString(); mapped.sources = [mapped.source || 'Manual'];
    }
    const entry = { 
      ...mapped, 
      id, 
      status: table === 'ai_models' ? 'active' : undefined,
      timestamp: new Date().toISOString(), 
      created_at: new Date().toISOString() 
    };
    db[table].push(entry);
  } else if (sql.includes('UPDATE')) {
    const index = db[table].findIndex((item: any) => item.id === newData.id || ['user_profile', 'email_config', 'settings'].includes(table));
    if (index !== -1) db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData), updated_at: new Date().toISOString() };
  } else if (sql.includes('DELETE')) {
    if (sql.includes('WHERE id = ?')) {
      const deleteId = Array.isArray(params) ? params[0] : params;
      db[table] = db[table].filter((item: any) => item.id !== deleteId && item.is_speculative !== 1);
    } else { db[table] = db[table].filter((item: any) => item.is_speculative === 1); }
  }
  saveDb();
  return { id };
}

export async function getQuery(sql: string, params: any[] = []): Promise<any> {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3];
  return db[table]?.[0] || null;
}

export async function getAllQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3];
  return db[table] || [];
}