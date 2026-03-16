import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { type PrismaClient } from '@prisma/client';
import { createTestPrisma } from './test-helpers.js';
import { appRouter } from './routers/index.js';

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const testDb = createTestPrisma();
  prisma = testDb.prisma;
  cleanup = testDb.cleanup;

  const user = await prisma.user.create({
    data: { email: 'card-test@example.com', passwordHash: 'fakehash' },
  });
  userId = user.id;

  const otherUser = await prisma.user.create({
    data: { email: 'other-card@example.com', passwordHash: 'fakehash' },
  });
  otherUserId = otherUser.id;
});

beforeEach(async () => {
  await prisma.deck.deleteMany({});
});

afterAll(async () => {
  await cleanup();
});

function createCaller(overrideUserId?: string) {
  return appRouter.createCaller({
    prisma,
    userId: overrideUserId ?? userId,
  });
}

describe('cardRouter', () => {
  describe('listByDeck', () => {
    it('returns cards for a deck', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: {
            create: [
              { front: 'Q1', back: 'A1' },
              { front: 'Q2', back: 'A2' },
            ],
          },
        },
      });

      const caller = createCaller();
      const cards = await caller.card.listByDeck({ deckId: deck.id });

      expect(cards).toHaveLength(2);
      expect(cards[0].front).toBe('Q1');
      expect(cards[1].front).toBe('Q2');
    });

    it('returns empty array for deck with no cards', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Empty Deck', userId },
      });

      const caller = createCaller();
      const cards = await caller.card.listByDeck({ deckId: deck.id });

      expect(cards).toEqual([]);
    });

    it('throws NOT_FOUND for deck owned by another user', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other Deck', userId: otherUserId },
      });

      const caller = createCaller();
      await expect(
        caller.card.listByDeck({ deckId: otherDeck.id }),
      ).rejects.toThrow(/not found/i);
    });

    it('throws NOT_FOUND for nonexistent deck', async () => {
      const caller = createCaller();
      await expect(
        caller.card.listByDeck({ deckId: 'nonexistent' }),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('importCsv', () => {
    it('imports cards from valid CSV into a deck', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      const result = await caller.card.importCsv({
        deckId: deck.id,
        csvContent: 'front,back\nCapital of France,Paris\n2 + 2,4',
      });

      expect(result.importedCount).toBe(2);

      const cards = await prisma.card.findMany({
        where: { deckId: deck.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(cards).toHaveLength(2);
      expect(cards[0].front).toBe('Capital of France');
      expect(cards[0].back).toBe('Paris');
      expect(cards[1].front).toBe('2 + 2');
      expect(cards[1].back).toBe('4');
    });

    it('rejects CSV with invalid headers', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCsv({
          deckId: deck.id,
          csvContent: 'question,answer\nWhat is 1+1,2',
        }),
      ).rejects.toThrow(/front.*back|header/i);
    });

    it('rejects CSV with rows missing fields', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCsv({
          deckId: deck.id,
          csvContent: 'front,back\nOnly front,',
        }),
      ).rejects.toThrow(/row/i);
    });

    it('appends cards to a deck that already has cards', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Existing Deck',
          userId,
          cards: { create: [{ front: 'Existing Q', back: 'Existing A' }] },
        },
      });

      const caller = createCaller();
      await caller.card.importCsv({
        deckId: deck.id,
        csvContent: 'front,back\nNew Q,New A',
      });

      const cards = await prisma.card.findMany({
        where: { deckId: deck.id },
      });
      expect(cards).toHaveLength(2);
    });

    it('throws NOT_FOUND for deck owned by another user', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other Deck', userId: otherUserId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCsv({
          deckId: otherDeck.id,
          csvContent: 'front,back\nQ,A',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('throws NOT_FOUND for nonexistent deck', async () => {
      const caller = createCaller();
      await expect(
        caller.card.importCsv({
          deckId: 'nonexistent',
          csvContent: 'front,back\nQ,A',
        }),
      ).rejects.toThrow(/not found/i);
    });
  });
});
