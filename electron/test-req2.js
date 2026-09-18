console.log('module.paths:', module.paths);
console.log('require.resolve paths:');
try { console.log(require.resolve('electron')); } catch(e) { console.log('electron:', e.message); }
try { console.log(require.resolve('electron/main')); } catch(e) { console.log('electron/main:', e.message); }
try { console.log(require.resolve('electron/renderer')); } catch(e) { console.log('electron/renderer:', e.message); }
