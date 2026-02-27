const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public', 'favicon.ico')
  });

  // Em produção, carregaríamos o app buildado. 
  // Para fins de demonstração e "versão windows", apontamos para a URL do app ou carregamos o index.html
  // Como é uma versão "portátil" que se atualiza, idealmente ela carrega o conteúdo web da Aura
  win.loadURL('https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co');

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Iniciar verificação de atualizações
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Lógica de atualização silenciosa
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
