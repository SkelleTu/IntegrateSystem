import serverless from 'serverless-http';
import { initApp } from '../server/app.js';

let appInstance;

export default async (req, res) => {
  if (!appInstance) {
    const { app } = await initApp();
    appInstance = serverless(app);
  }
  return appInstance(req, res);
};
