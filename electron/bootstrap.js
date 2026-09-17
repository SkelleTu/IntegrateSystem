const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 5000;
const MAX_RETRIES = 30;
const RETRY_MS = 1000;

function isAuraServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/db/status`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(res.statusCode === 200 && payload.status === 'online');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForAuraServer() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await isAuraServerReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
  return false;
}

async function start() {
  const serverWasRunning = await isAuraServerReady();
  let server = null;

  if (!serverWasRunning) {
    console.log('[Bootstrap] Iniciando servidor Aura System em produção...');

    server = spawn(process.execPath, ['dist/index.js'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
    });

    const up = await waitForAuraServer();
    if (!up) {
      console.error('[Bootstrap] Servidor não subiu a tempo.');
      server.kill();
      process.exit(1);
    }
  } else {
    console.log('[Bootstrap] Servidor Aura já está disponível.');
  }

  console.log('[Bootstrap] Servidor OK. Iniciando Electron...');

  const electronPath = require('electron');
  const mainScript = path.join(__dirname, 'main.js');
  const electronEnv = { ...process.env, NODE_ENV: 'production' };
  delete electronEnv.ELECTRON_RUN_AS_NODE;

  const electron = spawn(electronPath, [mainScript], {
    stdio: 'inherit',
    env: electronEnv,
  });

  electron.on('error', (error) => {
    console.error(`[Bootstrap] Falha ao iniciar Electron: ${error.message}`);
    if (server) server.kill();
    process.exit(1);
  });

  electron.on('close', () => {
    if (server) server.kill();
    process.exit(0);
  });
}

start();
