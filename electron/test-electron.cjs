console.log('process.versions.electron:', process.versions.electron);
console.log('process.type:', process.type);
console.log('process.electronBinding:', typeof process.electronBinding);
if (process.electronBinding) {
  try {
    const app = process.electronBinding('app');
    console.log('app:', typeof app);
  } catch(e) { console.log('electronBinding error:', e.message); }
}
