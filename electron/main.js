const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Aura System',
    icon: path.join(__dirname, '..', 'ico.ico'),
    frame: true,
    titleBarStyle: 'default',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5010');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abre ferramentas de desenvolvedor em dev
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Permitir que o frontend feche a janela
ipcMain.on('close-app', () => {
  app.quit();
});

// Permitir que o frontend minimize a janela
ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

// Permitir que o frontend maximize/restaurar
ipcMain.on('toggle-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});