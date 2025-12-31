import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getAllQuery } from '../database';

export async function fetchLatestOTP(userId: number): Promise<string | null> {
  console.log('Secretary: Accessing inbox to retrieve security code...');
  const configRes = await getAllQuery('SELECT * FROM email_config');
  const config = configRes[0];
  if (!config || !config.imap_host || !config.email_user || !config.email_password) return null;

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
      imap.openBox('INBOX', true, (err, box) => {
        if (err) { resolve(null); return; }
        imap.search(['UNSEEN', ['OR', ['FROM', 'linkedin.com'], ['FROM', 'indeed.com']]], (err, results) => {
          if (err || !results || results.length === 0) { imap.end(); resolve(null); return; }
          const f = imap.fetch(results[results.length - 1], { bodies: ['HEADER', 'TEXT'] });
          f.on('message', (msg) => {
            msg.on('body', async (stream) => {
              const parsed = await simpleParser(stream);
              const otpMatch = (parsed.text || '').match(/\b\d{6}\b/);
              resolve(otpMatch ? otpMatch[0] : null);
            });
          });
          f.once('end', () => imap.end());
        });
      });
    });
    imap.once('error', () => resolve(null));
    imap.connect();
  });
}