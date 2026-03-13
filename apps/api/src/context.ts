import { prisma } from './db.js';

export function createContext() {
  return { prisma };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
