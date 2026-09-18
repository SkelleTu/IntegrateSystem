console.log('process.electronBinding:', typeof process.electronBinding);
if (process.electronBinding) {
  try {
    const app = process.electronBinding('app');
    console.log('app via electronBinding:', app);
  } catch(e) { console.log('electronBinding error:', e.message); }
}
console.log('global.electron:', typeof global.electron);
