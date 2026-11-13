const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ELECTRON_DIR = __dirname;
const USER_DATA_DIR = app.getPath('userData');
const RUNTIME_DIR = path.resolve(
  process.env.AURA_RUNTIME_DIR || path.join(USER_DATA_DIR, 'runtime')
);
const SERVER_ENTRY = path.join(PROJECT_ROOT, 'dist', 'index.js');
const SERVER_PORT = Number(process.env.AURA_PORT || 5010);
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;
const RUNTIME_EVENTS_FILE = path.join(RUNTIME_DIR, 'aura-electron-runtime.jsonl');
const runtimeStartedAt = Date.now();
let runtimeSequence = 0;
let mainWindow = null;
let serverProcess = null;
let serverReady = false;
let serverStartupError = null;
let shutdownStarted = false;
let allowAppQuit = false;

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
  // The runtime event endpoint requires a dedicated MCP OAuth token.
  // Electron has no such grant, so diagnostics stay in the local JSONL file.
  writeLocalRuntime(event, message, data);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isAuraServerHealthy() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.status === 'ok' && health?.service === 'integrated-system';
  } catch {
    return false;
  }
}

async function waitForAuraServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverStartupError) throw serverStartupError;
    if (await isAuraServerHealthy()) {
      serverReady = true;
      writeLocalRuntime('local-server-ready', 'Servidor local Aura System pronto', {
        phase: 'server',
        port: SERVER_PORT,
        databaseDirectory: USER_DATA_DIR,
      });
      return;
    }
    await delay(500);
  }

  throw new Error(
    `Servidor local não ficou saudável na porta ${SERVER_PORT} em ${timeoutMs} ms.` +
  );
}

async function startLocalServer() {
  if (!Number.isInteger(SERVER_PORT) || SERVER_PORT < 1 || SERVER_PORT > 65535) {
    throw new Error('A porta local configurada para o Aura System é inválida.');
  }

  // Reuse an already-running Aura instance rather than launching a duplicate.
  if (await isAuraServerHealthy()) {
    serverReady = true;
    writeLocalRuntime('local-server-reused', 'Servidor Aura System já estava ativo', {
      phase: 'server',
      port: SERVER_PORT,
    });
    return;
  }

  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(`Arquivo do servidor local não encontrado: ${SERVER_ENTRY}`);
  }

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  ensureRuntimeDir();

  const childEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(SERVER_PORT),
    AURA_DATA_DIR: USER_DATA_DIR,
    AURA_RUNTIME_DIR: RUNTIME_DIR,
  };
  delete childEnv.VERCEL;
  delete childEnv.VERCEL_ENV;

  writeLocalRuntime('local-server-start', 'Iniciando servidor local Aura System', {
    phase: 'server',
    port: SERVER_PORT,
    entry: SERVER_ENTRY,
    databaseDirectory: USER_DATA_DIR,
  });

  const child = utilityProcess.fork(SERVER_ENTRY, [], {
    cwd: PROJECT_ROOT,
    env: childEnv,
    stdio: 'pipe',
    serviceName: 'Aura System Local Server',
  });
  serverProcess = child;

  child.stdout.on('data', (chunk) => {
    const message = String(chunk).trim();
    if (message) writeLocalRuntime('local-server-stdout', message.slice(0, 3000), { phase: 'server' });
  });
  child.stderr.on('data', (chunk) => {
    const message = String(chunk).trim();
    if (message) writeLocalRuntime('local-server-stderr', message.slice(0, 3000), { phase: 'server' });
  });
  child.on('error', (error) => {
    serverStartupError = new Error(error?.message || error?.report || 'Falha no processo utilitário do servidor.');
    writeLocalRuntime('local-server-process-error', 'Não foi possível iniciar o servidor local', {
      phase: 'server',
      error: { name: error?.name || 'UtilityProcessError', message: error?.message || error?.report },
    });
  });
  child.on('exit', (code) => {
    if (serverProcess === child) serverProcess = null;
    const message = `Servidor local encerrou (code=${code}).`;
    writeLocalRuntime('local-server-exit', message, { phase: 'server', code });

    if (shutdownStarted) {
      allowAppQuit = true;
      app.quit();
      return;
    }

    if (!serverReady) {
      serverStartupError = new Error(message);
      return;
    }

    dialog.showErrorBox('Aura System', message + '\\n\\nO aplicativo será encerrado para evitar uma tela sem conexão.');
    allowAppQuit = true;
    app.quit();
  });

  await waitForAuraServer();
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
    icon: path.join(PROJECT_ROOT, 'dist', 'public', 'aura-system-logo.svg'),
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

  mainWindow.webContents.on('console-message', (event) => {
    sendRuntimeEvent('renderer-console', event.message || 'Console message', {
      phase: 'renderer-console',
      level: event.level,
      line: event.lineNumber,
      sourceId: event.sourceId,
    });
  });

  mainWindow.loadURL(SERVER_URL).catch((error) => {
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
      'Não foi possível conectar ao servidor local na porta ' + SERVER_PORT + '.\n\n' +
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

app.whenReady().then(async () => {
  sendRuntimeEvent('electron-ready', 'Electron ficou pronto', {
    phase: 'electron',
    progress: 96,
  });

  // The server keeps its bundled static assets in the app directory and
  // stores mutable SQLite/runtime/upload data in the user's writable profile.
  await startLocalServer();
  createWindow();

  app.on('activate', () => {
    sendRuntimeEvent('electron-activate', 'Electron recebeu evento activate', {
      phase: 'electron',
    });

    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  sendRuntimeEvent('electron-ready-error', 'Falha ao iniciar o aplicativo local', {
    phase: 'electron',
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
  });
  dialog.showErrorBox('Aura System', `Não foi possível iniciar o servidor local.\\n\\n${error.message}`);
  allowAppQuit = true;
  app.quit();
});

app.on('before-quit', (event) => {
  sendRuntimeEvent('electron-before-quit', 'Electron iniciando encerramento', {
    phase: 'shutdown',
    progress: 100,
  });

  if (allowAppQuit || !serverProcess) return;
  event.preventDefault();
  if (shutdownStarted) return;

  shutdownStarted = true;
  writeLocalRuntime('local-server-stop', 'Encerrando servidor local Aura System', {
    phase: 'shutdown',
    port: SERVER_PORT,
  });
  serverProcess.once('exit', () => {
    serverProcess = null;
    allowAppQuit = true;
    app.quit();
  });
  try {
    serverProcess.postMessage({ type: 'AURA_SHUTDOWN' });
  } catch {
    serverProcess.kill();
  }

  const forcedStop = setTimeout(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    allowAppQuit = true;
    app.quit();
  }, 10000);
  forcedStop.unref();
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