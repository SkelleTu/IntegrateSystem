const {app} = require('electron'); console.log('app type:', typeof app); console.log('app ready:', app ? typeof app.whenReady : 'no app');
