const props = Object.getOwnPropertyNames(process).filter(p => p.toLowerCase().includes('electron') || p.toLowerCase().includes('atom') || p.toLowerCase().includes('chrome') || p.toLowerCase().includes('browser'));
console.log('process props:', props);
console.log('process.versions:', process.versions);
