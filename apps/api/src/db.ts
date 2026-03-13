import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

function resolveDbPath(): string {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  const filePath = dbUrl.replace(/^file:/, '');
  return path.resolve(projectRoot, filePath);
}

const adapter = new PrismaBetterSqlite3({ url: resolveDbPath() });

export const prisma = new PrismaClient({ adapter });
