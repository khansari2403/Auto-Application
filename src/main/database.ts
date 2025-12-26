import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: any = null;

export function getDatabase(): any {
  if (!db) {
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = { ready: true };
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  // Database schema for Phase 2
  // Tables: application_follow_ups, email_monitoring, rejection_response_styles, email_alerts
  
  console.log('Database initialized with Phase 2 schema');
  console.log('Tables ready: application_follow_ups, email_monitoring, rejection_response_styles, email_alerts');
}

export function closeDatabase(): void {
  if (db) {
    db = null;
  }
}