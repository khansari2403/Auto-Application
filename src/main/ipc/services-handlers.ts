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
  
  // Loopback redirect URI for desktop OAuth (Google approved method)
  const LOOPBACK_REDIRECT_URI = 'http://127.0.0.1';
  let authServerInstance: any = null;
  
  // Start OAuth flow - opens browser for consent using loopback method
  ipcMain.handle('email:oauth-start', async (_, data) => {
    try {
      const { clientId, clientSecret, email } = data;
      
      if (!clientId || !clientSecret) {
        return { success: false, error: 'Client ID and Client Secret are required' };
      }
      
      console.log('Starting OAuth flow for:', email);
      
      // Find an available port and start a local server to receive the callback
      const http = require('http');
      const url = require('url');
      
      // Try ports in sequence
      const findAvailablePort = (): Promise<number> => {
        return new Promise((resolve, reject) => {
          const server = http.createServer();
          server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
          });
          server.on('error', reject);
        });
      };
      
      const port = await findAvailablePort();
      const redirectUri = `${LOOPBACK_REDIRECT_URI}:${port}`;
      
      console.log('Using redirect URI:', redirectUri);
      
      // Create OAuth2 client with loopback redirect
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );
      
      // Store client for later use
      oauthClients.set(email || 'default', { client: oauth2Client, redirectUri });
      
      // Create promise to wait for the callback
      const authCodePromise = new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          if (authServerInstance) {
            authServerInstance.close();
            authServerInstance = null;
          }
          reject(new Error('OAuth timeout - no response received within 5 minutes'));
        }, 300000); // 5 minute timeout
        
        authServerInstance = http.createServer(async (req: any, res: any) => {
          try {
            const queryParams = url.parse(req.url, true).query;
            
            if (queryParams.code) {
              clearTimeout(timeoutId);
              
              // Send success page
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Authorization Successful</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           display: flex; justify-content: center; align-items: center; height: 100vh; 
                           margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { background: white; padding: 40px; border-radius: 16px; text-align: center; 
                                 box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; }
                    h1 { color: #4CAF50; margin-bottom: 10px; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>✓ Authorization Successful!</h1>
                    <p>You can close this window and return to the app.</p>
                    <p style="font-size: 12px; color: #888; margin-top: 20px;">This window will close automatically...</p>
                  </div>
                  <script>setTimeout(() => window.close(), 3000);</script>
                </body>
                </html>
              `);
              
              // Close server and resolve
              authServerInstance.close();
              authServerInstance = null;
              resolve(queryParams.code as string);
              
            } else if (queryParams.error) {
              clearTimeout(timeoutId);
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Authorization Failed</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                  <h1 style="color: #f44336;">Authorization Failed</h1>
                  <p>Error: ${queryParams.error}</p>
                  <p>Please close this window and try again.</p>
                </body>
                </html>
              `);
              authServerInstance.close();
              authServerInstance = null;
              reject(new Error(queryParams.error as string));
            }
          } catch (err) {
            console.error('Error handling OAuth callback:', err);
          }
        });
        
        authServerInstance.listen(port, '127.0.0.1', () => {
          console.log(`OAuth callback server listening on port ${port}`);
        });
      });
      
      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://mail.google.com/'
        ],
        prompt: 'consent'
      });
      
      console.log('OAuth URL generated:', authUrl);
      
      // Open browser with auth URL
      await shell.openExternal(authUrl);
      
      // Wait for the authorization code
      try {
        const code = await authCodePromise;
        
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        console.log('OAuth tokens received:', {
          access_token: tokens.access_token ? 'present' : 'missing',
          refresh_token: tokens.refresh_token ? 'present' : 'missing',
          expiry_date: tokens.expiry_date
        });
        
        // Store tokens in database
        const db = require('../database').getDatabase();
        if (db.settings.length === 0) {
          db.settings.push({ id: 1 });
        }
        db.settings[0].oauth_access_token = tokens.access_token;
        db.settings[0].oauth_refresh_token = tokens.refresh_token;
        db.settings[0].oauth_expiry = tokens.expiry_date;
        db.settings[0].email_connected = 1;
        db.settings[0].oauth_client_id = clientId;
        db.settings[0].oauth_client_secret = clientSecret;
        
        // Save to disk
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron');
        const dataDir = path.join(app.getPath('userData'), 'data');
        fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db, null, 2));
        
        return { 
          success: true, 
          message: 'OAuth connected successfully! Your email is now linked.',
          hasRefreshToken: !!tokens.refresh_token
        };
        
      } catch (authError: any) {
        console.error('OAuth flow error:', authError);
        return { success: false, error: authError.message };
      }
      
    } catch (e: any) {
      console.error('OAuth start error:', e);
      if (authServerInstance) {
        authServerInstance.close();
        authServerInstance = null;
      }
      return { success: false, error: e.message };
    }
  });
  
  // Handle OAuth callback with authorization code (kept for manual code entry fallback)
  ipcMain.handle('email:oauth-callback', async (_, data) => {
    try {
      const { clientId, clientSecret, code, email } = data;
      
      if (!code) {
        return { success: false, error: 'Authorization code is required' };
      }
      
      console.log('Processing OAuth callback for:', email);
      
      // Get or create OAuth2 client
      let oauthData = oauthClients.get(email || 'default');
      let oauth2Client;
      let redirectUri = 'http://127.0.0.1';
      
      if (oauthData) {
        oauth2Client = oauthData.client;
        redirectUri = oauthData.redirectUri || redirectUri;
      } else {
        oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
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
      const db = require('../database').getDatabase();
      if (db.settings.length === 0) {
        db.settings.push({ id: 1 });
      }
      db.settings[0].oauth_access_token = tokens.access_token;
      db.settings[0].oauth_refresh_token = tokens.refresh_token;
      db.settings[0].oauth_expiry = tokens.expiry_date;
      db.settings[0].email_connected = 1;
      db.settings[0].oauth_client_id = clientId;
      db.settings[0].oauth_client_secret = clientSecret;
      
      // Save to disk
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const dataDir = path.join(app.getPath('userData'), 'data');
      fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(db, null, 2));
      
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
        errorMsg = 'OAuth configuration error. Please ensure you have added "http://127.0.0.1" as an authorized redirect URI in your Google Cloud Console. Go to: APIs & Services > Credentials > OAuth 2.0 Client IDs > Your Client > Authorized redirect URIs.';
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
