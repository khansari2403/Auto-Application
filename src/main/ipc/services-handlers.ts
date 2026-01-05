import { ipcMain } from 'electron';
import * as EmailService from '../features/email-service';
import * as CompatibilityService from '../features/compatibility-service';
import * as SecretaryAuth from '../features/secretary-auth';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getAllQuery, runQuery } from '../database';

export function registerServicesHandlers(): string[] {
  const channels = [
    // Email Service
    'email:test-config', 
    'email:send', 
    'email:send-notification',
    'email:test-inbox',
    'email:fetch-inbox',
    // Compatibility Score
    'compatibility:calculate', 
    'compatibility:calculate-all', 
    'compatibility:get-by-level',
    // Secretary Authentication
    'secretary:setup-pin', 
    'secretary:verify-pin', 
    'secretary:change-pin', 
    'secretary:reset-pin', 
    'secretary:is-pin-set', 
    'secretary:get-settings', 
    'secretary:update-permissions'
  ];

  // --- EMAIL SERVICE ---
  ipcMain.handle('email:test-config', async (_, data) => {
    try {
      return await EmailService.testEmailConfig(data.userId, data.testEmail);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send', async (_, data) => {
    try {
      return await EmailService.sendEmail(data.options, data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:send-notification', async (_, data) => {
    try {
      const result = await EmailService.sendNotification(data.userId, data.type, data.details);
      return { success: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- EMAIL INBOX TEST & FETCH ---
  ipcMain.handle('email:test-inbox', async (_, data) => {
    try {
      const { email, password, provider } = data;
      
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }
      
      // Determine IMAP settings based on provider
      let imapConfig: any = {
        user: email,
        password: password,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      
      if (provider === 'gmail' || email.includes('@gmail.com')) {
        imapConfig.host = 'imap.gmail.com';
        imapConfig.port = 993;
      } else if (provider === 'outlook' || email.includes('@outlook') || email.includes('@hotmail') || email.includes('@live')) {
        imapConfig.host = 'outlook.office365.com';
        imapConfig.port = 993;
      } else if (provider === 'yahoo' || email.includes('@yahoo')) {
        imapConfig.host = 'imap.mail.yahoo.com';
        imapConfig.port = 993;
      } else if (provider === 'icloud' || email.includes('@icloud')) {
        imapConfig.host = 'imap.mail.me.com';
        imapConfig.port = 993;
      } else {
        // Default to Gmail settings
        imapConfig.host = 'imap.gmail.com';
        imapConfig.port = 993;
      }
      
      console.log('Testing IMAP connection to:', imapConfig.host);
      
      return new Promise((resolve) => {
        const imap = new Imap(imapConfig);
        
        imap.once('ready', () => {
          console.log('IMAP connection successful');
          imap.end();
          resolve({ success: true, message: 'Connection successful! Inbox accessible.' });
        });
        
        imap.once('error', (err: any) => {
          console.error('IMAP connection error:', err.message);
          let errorMsg = err.message;
          
          if (err.message.includes('Invalid credentials') || err.message.includes('AUTHENTICATIONFAILED')) {
            errorMsg = 'Invalid credentials. For Gmail, use an App Password (not your regular password).';
          } else if (err.message.includes('ECONNREFUSED')) {
            errorMsg = 'Connection refused. Check your internet connection.';
          }
          
          resolve({ success: false, error: errorMsg });
        });
        
        imap.connect();
        
        // Timeout after 15 seconds
        setTimeout(() => {
          try { imap.end(); } catch (e) {}
          resolve({ success: false, error: 'Connection timeout - server not responding' });
        }, 15000);
      });
      
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('email:fetch-inbox', async (_, data) => {
    try {
      const { email, password, provider, maxMessages } = data;
      
      if (!email || !password) {
        return { success: false, error: 'Email and password are required', messages: [] };
      }
      
      // Determine IMAP settings
      let imapConfig: any = {
        user: email,
        password: password,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };
      
      if (provider === 'gmail' || email.includes('@gmail.com')) {
        imapConfig.host = 'imap.gmail.com';
        imapConfig.port = 993;
      } else if (provider === 'outlook' || email.includes('@outlook') || email.includes('@hotmail') || email.includes('@live')) {
        imapConfig.host = 'outlook.office365.com';
        imapConfig.port = 993;
      } else if (provider === 'yahoo' || email.includes('@yahoo')) {
        imapConfig.host = 'imap.mail.yahoo.com';
        imapConfig.port = 993;
      } else if (provider === 'icloud' || email.includes('@icloud')) {
        imapConfig.host = 'imap.mail.me.com';
        imapConfig.port = 993;
      } else {
        imapConfig.host = 'imap.gmail.com';
        imapConfig.port = 993;
      }
      
      console.log('Fetching emails from:', imapConfig.host);
      
      return new Promise((resolve) => {
        const imap = new Imap(imapConfig);
        const messages: any[] = [];
        const limit = maxMessages || 5;
        
        imap.once('ready', () => {
          imap.openBox('INBOX', true, (err: any, box: any) => {
            if (err) {
              imap.end();
              resolve({ success: false, error: 'Failed to open inbox: ' + err.message, messages: [] });
              return;
            }
            
            const totalMessages = box.messages.total;
            if (totalMessages === 0) {
              imap.end();
              resolve({ success: true, messages: [], totalCount: 0 });
              return;
            }
            
            // Fetch last N messages
            const fetchFrom = Math.max(1, totalMessages - limit + 1);
            const fetchRange = `${fetchFrom}:${totalMessages}`;
            
            const fetch = imap.seq.fetch(fetchRange, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              struct: true
            });
            
            fetch.on('message', (msg: any, seqno: number) => {
              const messageData: any = { seqno };
              
              msg.on('body', (stream: any, info: any) => {
                let buffer = '';
                stream.on('data', (chunk: any) => buffer += chunk.toString('utf8'));
                stream.on('end', () => {
                  if (info.which.includes('HEADER')) {
                    const parsed = Imap.parseHeader(buffer);
                    messageData.from = parsed.from?.[0] || 'Unknown';
                    messageData.to = parsed.to?.[0] || '';
                    messageData.subject = parsed.subject?.[0] || '(No Subject)';
                    messageData.date = parsed.date?.[0] || '';
                  } else {
                    messageData.preview = buffer.substring(0, 200).replace(/\r?\n/g, ' ').trim();
                  }
                });
              });
              
              msg.once('end', () => {
                messages.push(messageData);
              });
            });
            
            fetch.once('error', (err: any) => {
              console.error('Fetch error:', err);
            });
            
            fetch.once('end', () => {
              imap.end();
              // Sort by most recent first
              messages.sort((a, b) => b.seqno - a.seqno);
              resolve({ 
                success: true, 
                messages: messages.slice(0, limit),
                totalCount: totalMessages 
              });
            });
          });
        });
        
        imap.once('error', (err: any) => {
          console.error('IMAP error:', err.message);
          resolve({ success: false, error: err.message, messages: [] });
        });
        
        imap.connect();
        
        // Timeout after 30 seconds
        setTimeout(() => {
          try { imap.end(); } catch (e) {}
          if (messages.length === 0) {
            resolve({ success: false, error: 'Connection timeout', messages: [] });
          }
        }, 30000);
      });
      
    } catch (e: any) {
      return { success: false, error: e.message, messages: [] };
    }
  });

  // --- COMPATIBILITY SCORE ---
  ipcMain.handle('compatibility:calculate', async (_, data) => {
    try {
      const result = await CompatibilityService.calculateCompatibility(data.userId, data.jobId);
      return { success: true, ...result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:calculate-all', async (_, data) => {
    try {
      await CompatibilityService.calculateAllCompatibility(data.userId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('compatibility:get-by-level', async (_, data) => {
    try {
      const jobs = await CompatibilityService.getJobsByCompatibility(data.userId, data.minLevel);
      return { success: true, data: jobs };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- SECRETARY AUTHENTICATION ---
  ipcMain.handle('secretary:setup-pin', async (_, data) => {
    try {
      return await SecretaryAuth.setupSecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:verify-pin', async (_, data) => {
    try {
      return await SecretaryAuth.verifySecretaryPin(data.userId, data.pin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:change-pin', async (_, data) => {
    try {
      return await SecretaryAuth.changeSecretaryPin(data.userId, data.currentPin, data.newPin);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:reset-pin', async (_, data) => {
    try {
      return await SecretaryAuth.resetSecretaryPin(data.userId);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:is-pin-set', async (_, data) => {
    try {
      const isSet = await SecretaryAuth.isSecretaryPinSet(data.userId);
      return { success: true, isSet };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:get-settings', async (_, data) => {
    try {
      const settings = await SecretaryAuth.getSecretaryAccessSettings(data.userId);
      return { success: true, ...settings };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('secretary:update-permissions', async (_, data) => {
    try {
      return await SecretaryAuth.updateSecretaryPermissions(data.userId, data.permissions);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  return channels;
}
