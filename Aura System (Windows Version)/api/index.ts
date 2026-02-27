import app from '../server/app.js';
import { initApp } from '../server/app.js';

let prepared = false;

export default async (req: any, res: any) => {
  if (!prepared) {
    try {
      await initApp();
      prepared = true;
    } catch (e) {
      console.error("Failed to init app:", e);
    }
  }
  return app(req, res);
};
