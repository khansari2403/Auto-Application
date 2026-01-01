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

const saveDb = () => {
  try {
    fs.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));
    console.log('DB: Saved to disk');
  } catch (e) {
    console.error('DB: Save failed', e);
  }
};

export async function initializeDatabase(): Promise<void> { getDatabase(); }

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const mapToSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) { 
    newObj[toSnakeCase(key)] = obj[key]; 
  }
  return newObj;
};

export async function runQuery(sql: string, params: any = []): Promise<any> {
  const db = getDatabase();
  
  // Parse SQL to get operation and table
  const sqlUpper = sql.toUpperCase();
  const sqlParts = sql.trim().split(/\s+/);
  
  let table = '';
  if (sqlUpper.includes('INSERT INTO')) {
    table = sqlParts[2];
  } else if (sqlUpper.includes('UPDATE')) {
    table = sqlParts[1];
  } else if (sqlUpper.includes('DELETE FROM')) {
    table = sqlParts[2];
  }
  table = table.replace(/[`"']/g, '');
  
  console.log(`DB: ${sqlUpper.split(' ')[0]} on "${table}"`);
  
  if (!db[table]) {
    console.log(`DB: Table "${table}" not found!`);
    return { success: false, error: 'Table not found' };
  }
  
  // Get data from params
  const newData = Array.isArray(params) ? params[0] : params;
  
  // INSERT
  if (sqlUpper.includes('INSERT')) {
    const mapped = mapToSnakeCase(newData);
    
    // USE THE PROVIDED ID if it exists, otherwise generate one
    const recordId = mapped.id || newData.id || Date.now();
    
    const record = { 
      ...mapped, 
      id: recordId,
      is_active: mapped.is_active ?? 1, 
      timestamp: new Date().toISOString() 
    };
    
    db[table].push(record);
    saveDb();
    
    console.log(`DB: Inserted into ${table} with id=${recordId}`);
    return { id: recordId, success: true };
  } 
  
  // UPDATE
  else if (sqlUpper.includes('UPDATE')) {
    const mapped = mapToSnakeCase(newData);
    const updateId = mapped.id || newData.id;
    
    console.log(`DB: Looking for id=${updateId} in ${table} (${db[table].length} records)`);
    
    // Find by ID
    let index = -1;
    if (updateId !== undefined) {
      index = db[table].findIndex((item: any) => {
        // Compare as numbers and strings
        return item.id === updateId || 
               item.id === Number(updateId) || 
               String(item.id) === String(updateId);
      });
    }
    
    // Special case for single-record tables
    if (index === -1 && ['user_profile', 'settings', 'job_preferences', 'email_config'].includes(table)) {
      if (db[table].length > 0) {
        index = 0;
      } else {
        // Create new record for single-record tables
        const record = { ...mapped, id: updateId || Date.now(), timestamp: new Date().toISOString() };
        db[table].push(record);
        saveDb();
        console.log(`DB: Created new ${table} record`);
        return { id: record.id, success: true };
      }
    }
    
    if (index !== -1) {
      // Merge existing data with new data
      db[table][index] = { 
        ...db[table][index], 
        ...mapped,
        id: db[table][index].id // Keep original ID
      };
      saveDb();
      console.log(`DB: Updated ${table}[${index}] with id=${db[table][index].id}`);
      return { success: true, id: db[table][index].id };
    } else {
      console.log(`DB: ❌ Record not found for update! id=${updateId}`);
      console.log(`DB: Available IDs in ${table}:`, db[table].map((r: any) => r.id));
      return { success: false, error: 'Record not found' };
    }
  } 
  
  // DELETE
  else if (sqlUpper.includes('DELETE')) {
    const deleteId = typeof newData === 'object' ? (newData.id) : newData;
    const beforeCount = db[table].length;
    
    db[table] = db[table].filter((item: any) => {
      return item.id !== deleteId && 
             item.id !== Number(deleteId) && 
             String(item.id) !== String(deleteId);
    });
    
    const deleted = beforeCount - db[table].length;
    saveDb();
    console.log(`DB: Deleted ${deleted} record(s) from ${table} where id=${deleteId}`);
    return { success: true, deleted };
  }
  
  return { success: false, error: 'Unknown operation' };
}

export async function getAllQuery(sql: string): Promise<any[]> {
  const db = getDatabase();
  const parts = sql.trim().split(/\s+/);
  
  // Handle "SELECT * FROM table"
  let table = '';
  const fromIndex = parts.findIndex(p => p.toUpperCase() === 'FROM');
  if (fromIndex !== -1 && parts[fromIndex + 1]) {
    table = parts[fromIndex + 1].replace(/[`"']/g, '');
  }
  
  const result = db[table] || [];
  console.log(`DB: SELECT from ${table} returned ${result.length} records`);
  return result;
}

export async function logAction(userId: number, type: string, desc: string, status: string, success?: boolean) {
  const db = getDatabase();
  const logEntry = { 
    id: Date.now(),
    user_id: userId, 
    action_type: type, 
    action_description: desc, 
    status: status, 
    success: success,
    timestamp: new Date().toISOString()
  };
  
  db.action_logs.push(logEntry);
  
  // Keep only last 200 logs
  if (db.action_logs.length > 200) {
    db.action_logs = db.action_logs.slice(-200);
  }
  
  saveDb();
}