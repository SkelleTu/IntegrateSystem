const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 5010;
const MAX_RETRIES = 30;
const RETRY_MS = 1000;

async function killOldProcesses() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? 'taskkill /F /IM node.exe'
      : 'pkill -f "node server/index.ts"';
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
  console.log('[Bootstrap] Iniciando servidor Node.js (npm run dev)...');

  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..'),
  });

  const up = await waitForServer();
  if (!up) {
    console.error('[Bootstrap] Servidor não subiu a tempo.');
    server.kill();
    process.exit(1);
  }

  console.log('[Bootstrap] Servidor OK. Iniciando Electron...');

  const electronPath = require('electron');
  const mainScript = path.join(__dirname, 'main.js');

  const electron = spawn(electronPath, [mainScript], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });

  electron.on('close', () => {
    server.kill();
    process.exit(0);
  });
}

start();