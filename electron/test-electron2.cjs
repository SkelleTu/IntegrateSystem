const fs = require('fs');
const path = require('path');

// Check what's in electron dist
const electronDist = path.join('C:', 'Users', 'Victor', 'Desktop', 'IntegrateSystem-main', 'node_modules', 'electron', 'dist');
console.log('dist exists:', fs.existsSync(electronDist));
if (fs.existsSync(electronDist)) {
  console.log('dist contents:', fs.readdirSync(electronDist));
}
