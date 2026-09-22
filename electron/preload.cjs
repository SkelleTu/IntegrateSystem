const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  toggleMaximize: () => ipcRenderer.send('toggle-maximize'),
  saveTextFile: (payload) => ipcRenderer.invoke('aura-save-text-file', payload),
});

function serializeError(error) {
  if (!error) return { value: String(error) };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    value: String(error),
  };
}

function reportRendererEvent(event, message, data = {}) {
  try {
    ipcRenderer.send('runtime-renderer-event', {
      event,
      message,
      data,
    });
  } catch {
    // Runtime diagnostics must never break the application.
  }
}

window.addEventListener('error', (event) => {
  reportRendererEvent('renderer-error', 'Erro JavaScript no renderer', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    error: serializeError(event.error),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  reportRendererEvent('renderer-unhandled-rejection', 'Promise rejeitada sem tratamento', {
    reason: serializeError(event.reason),
  });
});

window.addEventListener('load', () => {
  reportRendererEvent('renderer-load', 'Interface renderer carregada');
});

window.addEventListener('beforeunload', () => {
  reportRendererEvent('renderer-beforeunload', 'Interface renderer encerrando');
});
