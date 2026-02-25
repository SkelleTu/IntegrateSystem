import serverless from "serverless-http";
import { initApp } from "../server/app.js";

let handler: any;

export default async (req: any, res: any) => {
  if (!handler) {
    const { app } = await initApp();
    handler = serverless(app);
  }
  return handler(req, res);
};
