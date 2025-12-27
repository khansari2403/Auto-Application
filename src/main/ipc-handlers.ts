import { runQuery, getAllQuery, getQuery } from './database';
import { ipcMain, BrowserWindow } from 'electron';

export function setupIpcHandlers(): void {
  // Email Handlers
  ipcMain.handle('email:save-config', async (_, data) => await runQuery('INSERT INTO email_config', [data]));
  ipcMain.handle('email:get-config', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM email_config') }));
  
  // Applications Handlers
  ipcMain.handle('apps:save', async (_, data) => { await runQuery('INSERT INTO applications', [data]); return { success: true }; });
  ipcMain.handle('apps:get-all', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM applications') }));

  // LinkedIn Scraper Handler
  ipcMain.handle('user:scrape-linkedin', async (_, url) => { console.log("IPC Received: scrape-linkedin for", url); 
    const scraper = await import('./scraper-service');
    return await scraper.scrapeLinkedInProfile(1, url); // Using userId 1 for now
  });

  // Gmail Auth Logic
  ipcMain.handle('email:get-gmail-auth-url', async (event, userId) => {
    const config = await getQuery('SELECT * FROM email_config');
    const emailService = await import('./email-service');
    const authUrl = emailService.getGmailAuthUrl(config.google_client_id);
    const authWindow = new BrowserWindow({ width: 600, height: 700, show: true });
    authWindow.loadURL(authUrl);
    const checkForCode = (url: string) => {
      if (url.includes('code=')) {
        const code = new URL(url).searchParams.get('code');
        if (code) { event.sender.send('gmail:code-received', code); authWindow.destroy(); }
      }
    };
    authWindow.webContents.on('will-navigate', (e, url) => checkForCode(url));
    authWindow.webContents.on('did-navigate', (e, url) => checkForCode(url));
    return { success: true };
  });

  ipcMain.handle('email:exchange-code', async (_, userId, code) => {
    const config = await getQuery('SELECT * FROM email_config');
    const emailService = await import('./email-service');
    const tokens = await emailService.exchangeGmailCode(code, config.google_client_id, config.google_client_secret);
    await runQuery('UPDATE email_config', [tokens]);
    return { success: true, data: tokens };
  });
  ipcMain.handle('logs:get-recent-actions', async (_, userId) => ({ success: true, data: await getAllQuery('SELECT * FROM action_logs') }));
  ipcMain.handle('user:get-profile', async (_, userId) => ({ success: true, data: await getQuery('SELECT * FROM user_profile') }))

  ipcMain.handle('user:open-linkedin', async (_, url) => {
    const scraper = await import('./scraper-service');
    return await scraper.openLinkedIn(1, url);
  });

  ipcMain.handle('user:capture-linkedin', async (_) => {
    const scraper = await import('./scraper-service');
    return await scraper.captureLinkedInData(1);
  });
  ipcMain.handle('user:update-profile', async (_, data) => await runQuery('UPDATE user_profile', [data]));
}