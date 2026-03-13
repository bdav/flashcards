import { type PrismaClient } from '@prisma/client';
import { prisma } from './db.js';

// Hardcoded seed user ID until auth is implemented (PR 13).
// The seed script creates this user on first migration.
const SEED_USER_ID = 'seed-user-dev';

export function createContext() {
  return { prisma, userId: SEED_USER_ID };
}

export type Context = {
  prisma: PrismaClient;
  userId: string;
};
