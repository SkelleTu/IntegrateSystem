import serverless from 'serverless-http';
import { initApp } from '../server/app.js';

let handler;

export default async (req, res) => {
  if (!handler) {
    const { app } = await initApp();
    handler = serverless(app);
  }
  return handler(req, res);
};
