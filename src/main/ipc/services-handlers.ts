import { ipcMain, shell, BrowserWindow } from 'electron';
import * as EmailService from '../features/email-service';
import * as CompatibilityService from '../features/compatibility-service';
import * as SecretaryAuth from '../features/secretary-auth';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getAllQuery, runQuery } from '../database';
import { google } from 'googleapis';

export function registerServicesHandlers(): string[] {
  const channels = [
    // Email Service
    'email:test-config', 
    'email:send', 
    'email:send-notification',
    'email:test-inbox',
    'email:fetch-inbox',
    'email:oauth-start',
    'email:oauth-callback',
    'email:oauth-test',
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

  // --- GOOGLE OAUTH HANDLERS ---
  
  // Store OAuth clients temporarily
  const oauthClients: Map<string, any> = new Map();
  
  // Start OAuth flow - opens browser for consent
  ipcMain.handle('email:oauth-start', async (_, data) => {
    try {
      const { clientId, clientSecret, email } = data;
      
      if (!clientId || !clientSecret) {
        return { success: false, error: 'Client ID and Client Secret are required' };
      }
      
      console.log('Starting OAuth flow for:', email);
      
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // Use out-of-band for desktop apps
      );
      
      // Store client for later use
      oauthClients.set(email || 'default', oauth2Client);
      
      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://mail.google.com/' // Full IMAP access
        ],
        prompt: 'consent' // Force consent screen to get refresh token
      });
      
      console.log('OAuth URL generated:', authUrl);
      
      // Open browser with auth URL
      await shell.openExternal(authUrl);
      
      return { 
        success: true, 
        message: 'Browser opened. Please sign in and copy the authorization code.',
        authUrl: authUrl
      };
      
    } catch (e: any) {
      console.error('OAuth start error:', e);
      return { success: false, error: e.message };
    }
  });
  
  // Handle OAuth callback with authorization code
  ipcMain.handle('email:oauth-callback', async (_, data) => {
    try {
      const { clientId, clientSecret, code, email } = data;
      
      if (!code) {
        return { success: false, error: 'Authorization code is required' };
      }
      
      console.log('Processing OAuth callback for:', email);
      
      // Get or create OAuth2 client
      let oauth2Client = oauthClients.get(email || 'default');
      
      if (!oauth2Client) {
        oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          'urn:ietf:wg:oauth:2.0:oob'
        );
      }
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      console.log('OAuth tokens received:', {
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing',
        expiry_date: tokens.expiry_date
      });
      
      // Store tokens in database
      await runQuery(
        `UPDATE settings SET oauth_access_token = ?, oauth_refresh_token = ?, oauth_expiry = ?, email_connected = ? WHERE id = 1`,
        [tokens.access_token, tokens.refresh_token, tokens.expiry_date, 1]
      );
      
      return { 
        success: true, 
        message: 'OAuth connected successfully! Your email is now linked.',
        hasRefreshToken: !!tokens.refresh_token
      };
      
    } catch (e: any) {
      console.error('OAuth callback error:', e);
      
      let errorMsg = e.message;
      if (e.message.includes('invalid_grant')) {
        errorMsg = 'Invalid or expired authorization code. Please try again.';
      } else if (e.message.includes('redirect_uri_mismatch')) {
        errorMsg = 'OAuth configuration error. Check your Google Cloud Console redirect URIs.';
      }
      
      return { success: false, error: errorMsg };
    }
  });
  
  // Test OAuth connection by fetching emails
  ipcMain.handle('email:oauth-test', async (_, data) => {
    try {
      const { clientId, clientSecret, email } = data;
      
      // Get stored tokens
      const settings = await getAllQuery('SELECT * FROM settings WHERE id = 1');
      const settingsRow = settings?.[0] || {};
      
      if (!settingsRow.oauth_access_token) {
        return { success: false, error: 'No OAuth tokens found. Please connect first.' };
      }
      
      console.log('Testing OAuth connection for:', email);
      
      // Create OAuth2 client with stored tokens
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );
      
      oauth2Client.setCredentials({
        access_token: settingsRow.oauth_access_token,
        refresh_token: settingsRow.oauth_refresh_token,
        expiry_date: settingsRow.oauth_expiry
      });
      
      // Test by fetching user profile
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      console.log('Gmail profile:', profile.data);
      
      // Fetch latest messages
      const messageList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        labelIds: ['INBOX']
      });
      
      const messages: any[] = [];
      
      if (messageList.data.messages) {
        for (const msg of messageList.data.messages.slice(0, 5)) {
          const fullMsg = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });
          
          const headers = fullMsg.data.payload?.headers || [];
          messages.push({
            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
            subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
            date: headers.find(h => h.name === 'Date')?.value || '',
            snippet: fullMsg.data.snippet
          });
        }
      }
      
      return { 
        success: true, 
        email: profile.data.emailAddress,
        totalMessages: profile.data.messagesTotal,
        messages: messages
      };
      
    } catch (e: any) {
      console.error('OAuth test error:', e);
      
      let errorMsg = e.message;
      if (e.message.includes('invalid_grant') || e.message.includes('Token has been expired')) {
        errorMsg = 'OAuth token expired. Please reconnect your email.';
      }
      
      return { success: false, error: errorMsg };
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
