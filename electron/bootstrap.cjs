const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PROJECT_ROOT = 'C:\\Users\\Victor\\Desktop\\IntegrateSystem-main';
const ELECTRON_DIR = 'C:\\Users\\Victor\\Desktop\\IntegrateSystem-main\\electron';

const PORT = 5010;
const MAX_RETRIES = 30;
const RETRY_MS = 1000;

const ELECTRON_PKG = path.join(PROJECT_ROOT, 'node_modules', 'electron');

function getElectronBinaryPath() {
  const pathFile = path.join(ELECTRON_PKG, 'path.txt');
  if (fs.existsSync(pathFile)) {
    const executablePath = fs.readFileSync(pathFile, 'utf-8').trim();
    return path.join(ELECTRON_PKG, 'dist', executablePath);
  }
  return path.join(ELECTRON_PKG, 'dist', 'electron.exe');
}

const electronPath = getElectronBinaryPath();

async function killOldProcesses() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'taskkill /F /IM node.exe'
      : 'pkill -f "node dist/index.js"';
    exec(cmd, () => resolve());
  });
}

function isPortOpen() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/db/status`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await isPortOpen()) return true;
    await new Promise((r) => setTimeout(r, RETRY_MS));
  }
  return false;
}

async function start() {
  await killOldProcesses();
  console.log('[Bootstrap] Iniciando servidor Aura System em produção...');

  const server = spawn(process.execPath, ['dist/index.js'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    env: { ...process.env, NODE_ENV: 'production' },
  });

  const up = await waitForServer();
  if (!up) {
    console.error('[Bootstrap] Servidor não subiu a tempo.');
    server.kill();
    process.exit(1);
  }

  console.log('[Bootstrap] Servidor OK. Iniciando Electron...');

  // Usa `electron .` a partir da pasta electron (que tem package.json com main: main.js)
  const electron = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    cwd: ELECTRON_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
  });

  electron.on('close', (code) => {
    server.kill();
    process.exit(code || 0);
  });

  electron.on('error', (err) => {
    console.error('[Bootstrap] Erro no Electron:', err);
    server.kill();
    process.exit(1);
  });
}

start();