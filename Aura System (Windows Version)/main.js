const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

let serverProcess;

function startServer() {
  const serverPath = path.join(__dirname, 'dist', 'index.cjs');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '5000' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public', 'favicon.ico')
  });

  // Tenta carregar localmente primeiro (Offline First)
  const localUrl = 'http://localhost:5000';
  
  win.loadURL(localUrl).catch(() => {
    // Se falhar o local (servidor ainda subindo), tenta novamente em 2s ou carrega remoto
    setTimeout(() => {
      win.loadURL(localUrl).catch(() => {
        const remoteUrl = process.env.APP_URL || 'https://aura-system.replit.app';
        win.loadURL(remoteUrl);
      });
    }, 2000);
  });

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
