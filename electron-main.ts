import { app, BrowserWindow, Menu, MenuItem } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { initializeDatabase } from './src/main/database';
import { setupIpcHandlers } from './src/main/ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  const startUrl = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  if (isDev) mainWindow.webContents.openDevTools();

  // ENABLE RIGHT-CLICK CONTEXT MENU
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    menu.append(new MenuItem({ label: 'Cut', role: 'cut', enabled: params.editFlags.canCut }));
    menu.append(new MenuItem({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }));
    menu.append(new MenuItem({ label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: 'Select All', role: 'selectAll', enabled: params.editFlags.canSelectAll }));
    menu.popup({ window: mainWindow! });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', async () => {
  await initializeDatabase();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });