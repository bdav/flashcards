import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
  : /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));

export { app };
export type AppRouter = typeof appRouter;
