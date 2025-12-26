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
      try {
        dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch (e) {
        dbData = getDefaultData();
      }
    } else {
      dbData = getDefaultData();
    }
  }
  return dbData;
}

const getDefaultData = () => ({
  user_profile: [],
  email_config: [],
  job_preferences: [],
  action_logs: [],
  applications: [],
  job_listings: [],
  email_alerts: []
});

const saveDb = () => fs.writeFileSync(getDbPath(), JSON.stringify(dbData, null, 2));

export async function initializeDatabase(): Promise<void> {
  getDatabase();
  console.log('Full JSON Database Ready');
}

export async function runQuery(sql: string, params: any[] = []): Promise<any> {
  const db = getDatabase();
  const id = Date.now();
  
  if (sql.includes('INSERT INTO email_config') || sql.includes('UPDATE email_config')) {
    const newData = params[0];
    const existing = db.email_config[0] || {};
    
    // This part "translates" the UI names to Database names
    const mappedData = {
      ...existing,
      google_client_id: newData.googleClientId || newData.google_client_id || existing.google_client_id,
      google_client_secret: newData.googleClientSecret || newData.google_client_secret || existing.google_client_secret,
      email_address: newData.emailAddress || newData.email_address || existing.email_address,
      email_provider: newData.emailProvider || newData.email_provider || existing.email_provider,
      access_token: newData.access_token || existing.access_token,
      refresh_token: newData.refresh_token || existing.refresh_token,
      id: existing.id || id,
      updated_at: new Date().toISOString()
    };
    
    db.email_config = [mappedData];
  } 
  else if (sql.includes('INSERT INTO email_alerts')) {
    db.email_alerts.push({ id, user_id: params[0], alert_type: params[1], alert_title: params[2], alert_message: params[3], is_read: 0, created_at: new Date().toISOString() });
  }
  else if (sql.includes('UPDATE email_alerts SET is_read = 1')) {
    const alert = db.email_alerts.find((a: any) => a.id === params[0]);
    if (alert) alert.is_read = 1;
  }
  
  saveDb();
  return { id };
}
export async function getQuery(sql: string, params: any[] = []): Promise<any> {
  const db = getDatabase();
  if (sql.includes('FROM email_config')) return db.email_config[0] || null;
  if (sql.includes('FROM user_profile')) return db.user_profile[0] || null;
  return null;
}

export async function getAllQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = getDatabase();
  if (sql.includes('FROM email_alerts')) return db.email_alerts.sort((a:any, b:any) => b.id - a.id);
  if (sql.includes('FROM action_logs')) return db.action_logs;
  return [];
}

export function closeDatabase(): void { saveDb(); }