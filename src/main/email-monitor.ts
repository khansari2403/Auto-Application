import { Notification } from 'electron';
import { runQuery, getQuery, getAllQuery, getDatabase } from './database';
import * as emailService from './email-service';

let monitoringInterval: NodeJS.Timeout | null = null;

export async function startEmailMonitoring(config: any, accessToken: string): Promise<void> {
  if (monitoringInterval) return;
  
  monitoringInterval = setInterval(async () => {
    await checkEmails(config.userId, accessToken);
    await checkFollowUps(config.userId);
  }, 60 * 60 * 1000); // Every hour
}

async function checkEmails(userId: number, accessToken: string) {
  const messages = await emailService.fetchGmailMessages(accessToken);
  const db = getDatabase();
  
  for (const msg of messages) {
    const type = emailService.classifyEmailType(msg.subject, msg.body);
    
    // Find matching application by company name or subject
    const app = db.applications.find((a: any) => 
      msg.from.toLowerCase().includes(a.company_name.toLowerCase()) || 
      msg.subject.toLowerCase().includes(a.company_name.toLowerCase())
    );

    if (app) {
      let feedback = app.secretary_feedback;
      let status = app.status;

      if (type === 'interview') {
        feedback = '📅 Appointment Request: The company has reached out to schedule an interview!';
        status = 'appointment';
      } else if (type === 'rejection') {
        feedback = '❌ Rejection: Unfortunately, the company has decided not to move forward.';
        status = 'rejected';
      }

      await runQuery('UPDATE applications', { 
        id: app.id, 
        status: status, 
        secretary_feedback: feedback,
        events: [...(app.events || []), { from: 'Company', date: new Date().toISOString(), content: msg.subject, type: type === 'interview' ? 'Appointment Request' : 'Rejection/Acceptance' }]
      });
    }

    if (type !== 'other') {
      await runQuery('INSERT INTO email_alerts', { user_id: userId, alert_type: type, alert_title: `New ${type}`, alert_message: msg.subject });
      new Notification({ title: `New ${type}`, body: msg.subject }).show();
    }
  }
}

async function checkFollowUps(userId: number) {
  const config = await getQuery('SELECT * FROM email_config');
  const windowDays = config?.follow_up_days || 3;
  
  console.log(`Checking for applications older than ${windowDays} days...`);
}

export function stopEmailMonitoring(userId: number): void {
  if (monitoringInterval) { clearInterval(monitoringInterval); monitoringInterval = null; }
}