import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let dbData: any = null;

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
  }
  return dbData;
}

const getDefaultData = () => ({
  user_profile: [], email_config: [], job_preferences: [], ai_models: [],
  job_websites: [], company_monitoring: [], job_listings: [],
  applications: [], application_logs: [], action_logs: [], email_alerts: []
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

  if (!db[table]) db[table] = [];

  if (sql.includes('INSERT')) {
    const entry = { ...mapToSnakeCase(newData), id, timestamp: new Date().toISOString(), created_at: new Date().toISOString() };
    if (['email_config', 'user_profile', 'job_preferences'].includes(table)) {
      db[table] = [entry];
    } else {
      db[table].push(entry);
    }
  } else if (sql.includes('UPDATE')) {
    const index = db[table].findIndex((item: any) => item.id === newData.id || table === 'user_profile' || table === 'email_config');
    if (index !== -1) {
      db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData), updated_at: new Date().toISOString() };
    } else if (['user_profile', 'email_config'].includes(table)) {
      db[table] = [{ ...mapToSnakeCase(newData), id, updated_at: new Date().toISOString() }];
    }
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
