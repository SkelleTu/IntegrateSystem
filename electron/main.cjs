const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ELECTRON_DIR = __dirname;
const RUNTIME_DIR = path.resolve(
  process.env.AURA_RUNTIME_DIR || path.join(process.cwd(), 'runtime')
);
const RUNTIME_EVENTS_FILE = path.join(RUNTIME_DIR, 'aura-runtime.jsonl');
const runtimeStartedAt = Date.now();
let runtimeSequence = 0;
let mainWindow = null;

function ensureRuntimeDir() {
  try {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  } catch {}
}

function writeLocalRuntime(event, message, data = {}) {
  ensureRuntimeDir();
  runtimeSequence += 1;

  const record = {
    sequence: runtimeSequence,
    sessionId: process.env.AURA_RUNTIME_SESSION || null,
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - runtimeStartedAt,
    process: 'electron',
    pid: process.pid,
    event,
    message,
    data,
  };

  try {
    fs.appendFileSync(
      RUNTIME_EVENTS_FILE,
      JSON.stringify(record) + require('os').EOL,
      'utf8'
    );

  } catch {}
}

function sendRuntimeEvent(event, message, data = {}) {
  writeLocalRuntime(event, message, data);

  void fetch('http://127.0.0.1:5010/api/runtime/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, message, data }),
  }).catch(() => {
    // The local event was already persisted. Server forwarding is best-effort.
  });
}

process.on('uncaughtException', (error) => {
  sendRuntimeEvent('electron-uncaught-exception', 'Erro não tratado no processo Electron', {
    phase: 'electron',
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
  });
});

process.on('unhandledRejection', (reason) => {
  sendRuntimeEvent(
    'electron-unhandled-rejection',
    'Promise rejeitada sem tratamento no processo Electron',
    {
      phase: 'electron',
      reason: reason instanceof Error
        ? { name: reason.name, message: reason.message, stack: reason.stack }
        : { value: String(reason) },
    }
  );
});

writeLocalRuntime('electron-process-start', 'Processo Electron iniciado', {
  phase: 'electron',
  progress: 95,
});

function createWindow() {
  writeLocalRuntime('window-create-start', 'Criando janela principal', {
    phase: 'electron',
    progress: 97,
  });

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
      preload: path.join(ELECTRON_DIR, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('did-start-loading', () => {
    sendRuntimeEvent('electron-load-start', 'Electron iniciou o carregamento da interface', {
      phase: 'electron',
      progress: 98,
    });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    sendRuntimeEvent('electron-load-finished', 'Interface carregada no Electron', {
      phase: 'electron',
      progress: 100,
      url: mainWindow?.webContents.getURL() || null,
    });
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    sendRuntimeEvent('electron-load-failed', 'Falha ao carregar a interface', {
      phase: 'electron',
      progress: 100,
      errorCode,
      errorDescription,
      validatedURL,
    });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    sendRuntimeEvent('renderer-process-gone', 'Processo renderer terminou inesperadamente', {
      phase: 'electron',
      details,
    });
  });

  mainWindow.webContents.on('unresponsive', () => {
    sendRuntimeEvent('window-unresponsive', 'Janela Electron ficou sem responder', {
      phase: 'electron',
    });
  });

  mainWindow.webContents.on('responsive', () => {
    sendRuntimeEvent('window-responsive', 'Janela Electron voltou a responder', {
      phase: 'electron',
    });
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    sendRuntimeEvent('renderer-console', message, {
      phase: 'renderer-console',
      level,
      line,
      sourceId,
    });
  });

  mainWindow.loadURL('http://localhost:5010').catch((error) => {
    sendRuntimeEvent('electron-load-error', 'Falha ao carregar Aura System', {
      phase: 'electron',
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
    });

    dialog.showErrorBox(
      'Aura System',
      'Não foi possível conectar ao servidor local na porta 5010.\n\n' +
        error.message
    );
  });

  mainWindow.on('closed', () => {
    sendRuntimeEvent('window-closed', 'Janela principal fechada', {
      phase: 'shutdown',
      progress: 100,
    });
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  sendRuntimeEvent('electron-ready', 'Electron ficou pronto', {
    phase: 'electron',
    progress: 96,
  });

  createWindow();

  app.on('activate', () => {
    sendRuntimeEvent('electron-activate', 'Electron recebeu evento activate', {
      phase: 'electron',
    });

    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  sendRuntimeEvent('electron-ready-error', 'Falha no app.whenReady()', {
    phase: 'electron',
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
  });
});

app.on('before-quit', () => {
  sendRuntimeEvent('electron-before-quit', 'Electron iniciando encerramento', {
    phase: 'shutdown',
    progress: 100,
  });
});

app.on('window-all-closed', () => {
  sendRuntimeEvent('window-all-closed', 'Todas as janelas Electron foram fechadas', {
    phase: 'shutdown',
    progress: 100,
  });

  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('runtime-renderer-event', (_event, payload) => {
  if (!payload || typeof payload !== 'object') return;

  sendRuntimeEvent(
    typeof payload.event === 'string' ? payload.event : 'renderer-event',
    typeof payload.message === 'string' ? payload.message : 'Evento do renderer',
    payload.data && typeof payload.data === 'object'
      ? payload.data
      : {}
  );
});

ipcMain.on('close-app', () => {
  sendRuntimeEvent('ipc-close-app', 'Interface solicitou fechamento do aplicativo', {
    phase: 'shutdown',
  });
  app.quit();
});

ipcMain.on('minimize-app', () => {
  sendRuntimeEvent('ipc-minimize-app', 'Interface solicitou minimizar janela', {
    phase: 'electron',
  });
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('toggle-maximize', () => {
  sendRuntimeEvent('ipc-toggle-maximize', 'Interface solicitou alternância de maximização', {
    phase: 'electron',
  });

  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('aura-save-text-file', async (_event, payload) => {
  sendRuntimeEvent('ipc-save-text-file', 'Solicitação para salvar arquivo de texto', {
    phase: 'electron',
    defaultFileName: payload?.defaultFileName || 'aura-database.sql',
  });

  if (!mainWindow) return { saved: false };
  if (!payload || typeof payload.content !== 'string') {
    throw new Error('Invalid content');
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save SQL Database',
    defaultPath: payload.defaultFileName || 'aura-database.sql',
    filters: [
      { name: 'SQL Database', extensions: ['sql'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    sendRuntimeEvent('save-text-file-cancelled', 'Usuário cancelou o salvamento', {
      phase: 'electron',
    });
    return { saved: false };
  }

  fs.writeFileSync(result.filePath, payload.content, 'utf8');

  sendRuntimeEvent('save-text-file-success', 'Arquivo salvo com sucesso', {
    phase: 'electron',
    saved: true,
  });

  return { saved: true, path: result.filePath };
});