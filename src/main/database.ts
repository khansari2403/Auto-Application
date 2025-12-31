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
  table = table.replace(/[`"']/g, '');
  if (!db[table]) return { success: false, error: 'Table not found' };
  const newData = Array.isArray(params) ? params[0] : params;
  if (sql.toUpperCase().includes('INSERT')) {
    const mapped = mapToSnakeCase(newData);
    db[table].push({ ...mapped, id, is_active: mapped.is_active ?? 1, timestamp: new Date().toISOString() });
  } else if (sql.toUpperCase().includes('UPDATE')) {
    const index = db[table].findIndex((item: any) => item.id === newData.id || ['user_profile', 'settings'].includes(table));
    if (index !== -1) db[table][index] = { ...db[table][index], ...mapToSnakeCase(newData) };
    else if (['user_profile', 'settings'].includes(table)) db[table].push({ ...mapToSnakeCase(newData), id });
  } else if (sql.toUpperCase().includes('DELETE')) {
    // FIXED: Correctly extract ID for deletion
    const deleteId = typeof newData === 'object' ? newData.id : newData;
    db[table] = db[table].filter((item: any) => item.id !== deleteId);
  }
  saveDb();
  return { id };
}

export async function getAllQuery(sql: string): Promise<any[]> {
  const db = getDatabase();
  const table = sql.trim().split(/\s+/)[3].replace(/[`"']/g, '');
  return db[table] || [];
}

export async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  await runQuery('INSERT INTO action_logs', { 
    user_id: userId, 
    action_type: type, 
    action_description: desc, 
    status: status, 
    success: success 
  });
}