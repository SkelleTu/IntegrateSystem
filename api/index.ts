import serverless from 'serverless-http';
import { initApp } from '../server/app.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any;

export default async (req: VercelRequest, res: VercelResponse) => {
  if (!appInstance) {
    const { app } = await initApp();
    appInstance = serverless(app);
  }
  return appInstance(req, res);
};
