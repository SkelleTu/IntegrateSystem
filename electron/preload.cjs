const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
  saveTextFile: (payload) => ipcRenderer.invoke('aura-save-text-file', payload),
});
