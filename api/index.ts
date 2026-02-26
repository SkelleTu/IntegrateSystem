import serverless from 'serverless-http';
import { initApp } from '../server/app.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let appInstance: ((req: VercelRequest, res: VercelResponse) => Promise<any>) | any;

export default async (req: VercelRequest, res: VercelResponse) => {
  if (!appInstance) {
    const { app }: { app: Express } = await initApp();
    appInstance = serverless(app);
  }
  return appInstance(req, res);
};
