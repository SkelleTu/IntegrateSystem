#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');
const mainScript = path.join(__dirname, 'main.js');

const child = spawn(electronPath, [mainScript], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

child.on('close', (code) => process.exit(code));