try {
  const m = require('@electron/internal/main-process');
  console.log('@electron/internal/main-process:', Object.keys(m));
} catch(e) { console.log('@electron/internal/main-process error:', e.message); }

try {
  const m = require('@electron/internal/renderer-process');
  console.log('@electron/internal/renderer-process:', Object.keys(m));
} catch(e) { console.log('@electron/internal/renderer-process error:', e.message); }

try {
  const m = require('electron/common');
  console.log('electron/common:', Object.keys(m));
} catch(e) { console.log('electron/common error:', e.message); }

try {
  const m = require('electron/main');
  console.log('electron/main:', Object.keys(m));
} catch(e) { console.log('electron/main error:', e.message); }
