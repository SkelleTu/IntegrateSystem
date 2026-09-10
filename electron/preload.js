const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aura', {
  close: () => ipcRenderer.send('close-app'),
  minimize: () => ipcRenderer.send('minimize-app'),
  toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
  onMaximized: (cb) => ipcRenderer.on('window-maximized', (_e, v) => cb(v)),
  onUnmaximized: (cb) => ipcRenderer.on('window-unmaximized', () => cb()),
});