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
    sessionToken: null,
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

  describe('create', () => {
    it('creates a card with front and back on a deck', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Test Deck', userId },
      });

      const caller = createCaller();
      const card = await caller.card.create({
        deckId: deck.id,
        front: 'What is 2+2?',
        back: '4',
      });

      expect(card.front).toBe('What is 2+2?');
      expect(card.back).toBe('4');
      expect(card.deckId).toBe(deck.id);
      expect(card.id).toBeDefined();
    });

    it('persists the card so it appears in listByDeck', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Test Deck', userId },
      });

      const caller = createCaller();
      await caller.card.create({
        deckId: deck.id,
        front: 'Q1',
        back: 'A1',
      });

      const cards = await caller.card.listByDeck({ deckId: deck.id });
      expect(cards).toHaveLength(1);
      expect(cards[0].front).toBe('Q1');
    });

    it('throws NOT_FOUND for deck owned by another user', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other Deck', userId: otherUserId },
      });

      const caller = createCaller();
      await expect(
        caller.card.create({
          deckId: otherDeck.id,
          front: 'Q',
          back: 'A',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('throws NOT_FOUND for nonexistent deck', async () => {
      const caller = createCaller();
      await expect(
        caller.card.create({
          deckId: 'nonexistent',
          front: 'Q',
          back: 'A',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects empty front', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Test Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.create({
          deckId: deck.id,
          front: '',
          back: 'A',
        }),
      ).rejects.toThrow();
    });

    it('rejects empty back', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Test Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.create({
          deckId: deck.id,
          front: 'Q',
          back: '',
        }),
      ).rejects.toThrow();
    });

    it('trims whitespace from front and back', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Test Deck', userId },
      });

      const caller = createCaller();
      const card = await caller.card.create({
        deckId: deck.id,
        front: '  What is 2+2?  ',
        back: '  4  ',
      });

      expect(card.front).toBe('What is 2+2?');
      expect(card.back).toBe('4');
    });
  });

  describe('update', () => {
    it('updates a card front and back', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Old Q', back: 'Old A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const updated = await caller.card.update({
        cardId: deck.cards[0].id,
        front: 'New Q',
        back: 'New A',
      });

      expect(updated.front).toBe('New Q');
      expect(updated.back).toBe('New A');
    });

    it('supports partial update (only front)', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Old Q', back: 'Old A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const updated = await caller.card.update({
        cardId: deck.cards[0].id,
        front: 'New Q',
      });

      expect(updated.front).toBe('New Q');
      expect(updated.back).toBe('Old A');
    });

    it('supports partial update (only back)', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Old Q', back: 'Old A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const updated = await caller.card.update({
        cardId: deck.cards[0].id,
        back: 'New A',
      });

      expect(updated.front).toBe('Old Q');
      expect(updated.back).toBe('New A');
    });

    it('rejects update on a card belonging to another user', async () => {
      const otherDeck = await prisma.deck.create({
        data: {
          name: 'Other Deck',
          userId: otherUserId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.update({
          cardId: otherDeck.cards[0].id,
          front: 'Hacked',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects update on a nonexistent card', async () => {
      const caller = createCaller();
      await expect(
        caller.card.update({
          cardId: 'nonexistent',
          front: 'Q',
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects empty front when provided', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.update({
          cardId: deck.cards[0].id,
          front: '',
        }),
      ).rejects.toThrow();
    });

    it('rejects empty back when provided', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.update({
          cardId: deck.cards[0].id,
          back: '',
        }),
      ).rejects.toThrow();
    });

    it('trims whitespace from front and back', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const updated = await caller.card.update({
        cardId: deck.cards[0].id,
        front: '  New Q  ',
        back: '  New A  ',
      });

      expect(updated.front).toBe('New Q');
      expect(updated.back).toBe('New A');
    });

    it('rejects update with neither front nor back', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.update({ cardId: deck.cards[0].id }),
      ).rejects.toThrow(/at least one/i);
    });
  });

  describe('delete', () => {
    it('deletes a card', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await caller.card.delete({ cardId: deck.cards[0].id });

      const cards = await prisma.card.findMany({
        where: { deckId: deck.id },
      });
      expect(cards).toHaveLength(0);
    });

    it('rejects deletion of a card belonging to another user', async () => {
      const otherDeck = await prisma.deck.create({
        data: {
          name: 'Other Deck',
          userId: otherUserId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.delete({ cardId: otherDeck.cards[0].id }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects deletion of a nonexistent card', async () => {
      const caller = createCaller();
      await expect(
        caller.card.delete({ cardId: 'nonexistent' }),
      ).rejects.toThrow(/not found/i);
    });

    it('deleted card is no longer returned by listByDeck', async () => {
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
        include: { cards: true },
      });

      const caller = createCaller();
      await caller.card.delete({ cardId: deck.cards[0].id });

      const cards = await caller.card.listByDeck({ deckId: deck.id });
      expect(cards).toHaveLength(1);
      expect(cards[0].front).toBe('Q2');
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
