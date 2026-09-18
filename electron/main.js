import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ROOT = 'C:\\Users\\Victor\\Desktop\\IntegrateSystem-main';
const ELECTRON_DIR = 'C:\\Users\\Victor\\Desktop\\IntegrateSystem-main\\electron';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Aura System',
    icon: path.join(PROJECT_ROOT, 'ico.ico'),
    frame: true,
    titleBarStyle: 'default',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(ELECTRON_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5010');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

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

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('toggle-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('aura-save-text-file', async (_event, payload) => {
  if (!mainWindow) return { saved: false };
  if (!payload || typeof payload.content !== 'string') throw new Error('Conteúdo inválido');

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar Banco SQL',
    defaultPath: payload.defaultFileName || 'aura-database.sql',
    filters: [
      { name: 'Banco SQL', extensions: ['sql'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) return { saved: false };
  fs.writeFileSync(result.filePath, payload.content, 'utf8');
  return { saved: true, path: result.filePath };
});