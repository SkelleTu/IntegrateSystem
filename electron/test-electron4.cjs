console.log('global:', Object.keys(global).filter(k => k.includes('electron') || k.includes('Electron')));
console.log('process.mainModule:', process.mainModule);
console.log('process.mainModule.require:', typeof process.mainModule?.require);
if (process.mainModule?.require) {
  try {
    const e = process.mainModule.require('electron');
    console.log('process.mainModule.require(electron):', e);
  } catch(err) { console.log('mainModule.require error:', err.message); }
}
