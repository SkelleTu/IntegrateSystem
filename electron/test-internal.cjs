console.log('process.versions.electron:', process.versions.electron);
console.log('process.electronRequire:', typeof process.electronRequire);
console.log('process.electronBinding:', typeof process.electronBinding);
console.log('process.atomBinding:', typeof process.atomBinding);
console.log('global.require:', typeof global.require);
if (global.require) {
  try { console.log('global.require(electron):', global.require('electron')); } catch(e) { console.log('error:', e.message); }
}
