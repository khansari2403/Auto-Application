import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getAllQuery, logAction, runQuery } from '../database';

/**
 * WAIT FOR AND FETCH LATEST OTP
 * Monitors the inbox for a security code (4-8 digits).
 * Retries every 15 seconds for up to 3 minutes.
 */
export async function fetchLatestOTP(userId: number): Promise<string | null> {
  console.log('Secretary: Monitoring inbox for security code...');
  await logAction(userId, 'ai_secretary', '📧 Monitoring inbox for security code...', 'in_progress');

  const configRes = await getAllQuery('SELECT * FROM email_config');
  const config = configRes[0];
  
  if (!config || !config.email_user || !config.email_password || !config.imap_host) {
    await logAction(userId, 'ai_secretary', '❌ Email configuration is missing in Settings', 'failed', false);
    return null;
  }

  // Retry logic: check every 15 seconds for up to 12 attempts (3 minutes total)
  for (let attempt = 0; attempt < 12; attempt++) {
    const otp = await performImapSearch(config, ['UNSEEN'], (text: string) => {
      // Regex to match 4 to 8 digit numeric codes
      const match = text.match(/\b\d{4,8}\b/);
      return match ? match[0] : null;
    });

    if (otp) {
      await logAction(userId, 'ai_secretary', `✅ Security code found: ${otp}`, 'completed', true);
      return otp;
    }

    console.log(`Secretary: OTP not found yet (Attempt ${attempt + 1}/12). Waiting 15s...`);
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  await logAction(userId, 'ai_secretary', '❌ Timed out waiting for security code after 3 minutes', 'failed', false);
  return null;
}

/**
 * MONITOR FOR APPLICATION CONFIRMATIONS
 * Scans for emails indicating a successful submission.
 */
export async function monitorConfirmations(userId: number) {
  const configRes = await getAllQuery('SELECT * FROM email_config');
  const config = configRes[0];
  if (!config || !config.email_user || !config.email_password) return;

  const confirmation = await performImapSearch(config, ['UNSEEN'], (text: string, subject: string) => {
    const keywords = ['application received', 'thank you for applying', 'confirmation', 'received your application'];
    const combined = (text + ' ' + subject).toLowerCase();
    
    if (keywords.some(k => combined.includes(k))) {
      return { subject, snippet: text.substring(0, 200) };
    }
    return null;
  });

  if (confirmation) {
    await logAction(userId, 'ai_secretary', `📬 Received confirmation: ${confirmation.subject}`, 'completed', true);
    await runQuery('INSERT INTO email_alerts', {
      user_id: userId,
      alert_type: 'confirmation',
      subject: confirmation.subject,
      snippet: confirmation.snippet,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * INTERNAL HELPER: PERFORM IMAP SEARCH
 */
async function performImapSearch(config: any, criteria: any[], extractor: (text: string, subject: string) => any): Promise<any> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: config.email_user,
      password: config.email_password,
      host: config.imap_host,
      port: config.imap_port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          console.error('IMAP: Could not open inbox', err);
          imap.end();
          resolve(null);
          return;
        }
        
        imap.search(criteria, (err, results) => {
          if (err || !results || results.length === 0) {
            imap.end();
            resolve(null);
            return;
          }
          
          // Fetch the most recent matching message
          const f = imap.fetch(results[results.length - 1], { bodies: '' });
          
          f.on('message', (msg) => {
            msg.on('body', async (stream: any) => {
              const parsed: any = await simpleParser(stream);
              const result = extractor(parsed.text || '', parsed.subject || '');
              resolve(result);
            });
          });
          
          f.once('end', () => imap.end());
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP Connection Error:', err);
      resolve(null);
    });

    imap.connect();
  });
}