import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

/**
 * Creates an isolated test database with a fresh schema.
 * Each test suite gets its own SQLite file that is cleaned up after tests.
 */
export function createTestPrisma() {
  const testDbFile = path.resolve(
    projectRoot,
    `test-${randomUUID().slice(0, 8)}.db`,
  );
  const testDbUrl = `file:${testDbFile}`;

  // Apply migrations to the test database
  execSync(`pnpm prisma migrate deploy`, {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });

  const adapter = new PrismaBetterSqlite3({ url: testDbFile });
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    },
  };
}
