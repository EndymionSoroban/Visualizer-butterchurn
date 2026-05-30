// Clean up giant agent environment variables to prevent macOS Swift ProcessInfo crashes
for (const key in process.env) {
  if (key.startsWith('ANTIGRAVITY')) {
    delete process.env[key];
  }
}

import { app, BrowserWindow, session, systemPreferences } from 'electron';
import path from 'node:path';

const DIST_PATH = path.join(__dirname, '../dist');
const VITE_PUBLIC_PATH = app.isPackaged ? DIST_PATH : path.join(DIST_PATH, '../public');

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // For loading local MP3 easily in dev
    },
  });

  // Automatically approve media (microphone) permissions requests from frontend
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Route renderer console messages to main process terminal
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
    console.log(`[Renderer ${levels[level] || 'LOG'}] ${message} (${path.basename(sourceId)}:${line})`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(DIST_PATH, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // On macOS, explicitly ask for microphone/media permissions on startup
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone')
      .then((allowed) => {
        console.log('[Electron] macOS Microphone Access allowed:', allowed);
      })
      .catch((err) => {
        console.error('[Electron] macOS Microphone Access error:', err);
      });
  }
  createWindow();
});

