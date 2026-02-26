import app from '../server/app.js';
import { initApp } from '../server/app.js';

let prepared = false;

export default async (req: any, res: any) => {
  if (!prepared) {
    await initApp();
    prepared = true;
  }
  return app(req, res);
};
