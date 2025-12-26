import { Notification } from 'electron';
import { runQuery } from './database';

export function startEmailMonitoring(config: any, accessToken: string): void {
  console.log('Monitoring Started for User:', config.userId);
  
  // This is the "Heartbeat" - it runs every hour
  setInterval(async () => {
    console.log('Checking for new employer emails...');
    
    // MOCK: In a real scenario, we'd fetch from Gmail here.
    // Let's simulate finding an important email to test the alert system.
    const foundInterview = Math.random() > 0.7; 

    if (foundInterview) {
      const title = "New Interview Request!";
      const msg = "An employer has reached out to schedule a meeting.";
      
      // 1. Save to Database
      await runQuery('INSERT INTO email_alerts (user_id, alert_type, alert_title, alert_message) VALUES (?, ?, ?, ?)', 
        [config.userId, 'interview', title, msg]);

      // 2. Show Windows Desktop Notification
      new Notification({
        title: title,
        body: msg,
        icon: path.join(__dirname, '../public/logo.png')
      }).show();
    }
  }, 60 * 60 * 1000); // Every hour
}

export function stopEmailMonitoring(userId: number): void {
  console.log('Monitoring Stopped');
}

export function getMonitoringStatus(userId: number): boolean {
  return true; // Simplified for now
}