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

    it('returns existing card when front and back both match', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'What is 2+2?', back: '4' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const card = await caller.card.create({
        deckId: deck.id,
        front: 'What is 2+2?',
        back: '4',
      });

      expect(card.id).toBe(deck.cards[0].id);
      expect(card.back).toBe('4');

      const cards = await caller.card.listByDeck({ deckId: deck.id });
      expect(cards).toHaveLength(1);
    });

    it('updates existing card back when front matches with different answer', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'What is 2+2?', back: '5' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const card = await caller.card.create({
        deckId: deck.id,
        front: 'What is 2+2?',
        back: '4',
      });

      expect(card.id).toBe(deck.cards[0].id);
      expect(card.back).toBe('4');

      const cards = await caller.card.listByDeck({ deckId: deck.id });
      expect(cards).toHaveLength(1);
      expect(cards[0].back).toBe('4');
    });

    it('dedupes case-insensitively on front', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Test Deck',
          userId,
          cards: { create: [{ front: 'Hello', back: 'World' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const card = await caller.card.create({
        deckId: deck.id,
        front: 'hello',
        back: 'world',
      });

      expect(card.id).toBe(deck.cards[0].id);

      const cards = await caller.card.listByDeck({ deckId: deck.id });
      expect(cards).toHaveLength(1);
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

  describe('importCards', () => {
    it('creates new cards on the deck', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      const result = await caller.card.importCards({
        deckId: deck.id,
        new: [
          { front: 'Capital of France', back: 'Paris' },
          { front: '2 + 2', back: '4' },
        ],
        update: [],
      });

      expect(result.createdCount).toBe(2);
      expect(result.updatedCount).toBe(0);

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

    it('updates existing cards back text', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Import Deck',
          userId,
          cards: { create: [{ front: 'Capital of France', back: 'Lyon' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const result = await caller.card.importCards({
        deckId: deck.id,
        new: [],
        update: [{ cardId: deck.cards[0].id, back: 'Paris' }],
      });

      expect(result.createdCount).toBe(0);
      expect(result.updatedCount).toBe(1);

      const cards = await prisma.card.findMany({
        where: { deckId: deck.id },
      });
      expect(cards).toHaveLength(1);
      expect(cards[0].back).toBe('Paris');
    });

    it('handles mixed new and update in one call', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Import Deck',
          userId,
          cards: { create: [{ front: 'Existing Q', back: 'Old A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const result = await caller.card.importCards({
        deckId: deck.id,
        new: [{ front: 'New Q', back: 'New A' }],
        update: [{ cardId: deck.cards[0].id, back: 'Updated A' }],
      });

      expect(result.createdCount).toBe(1);
      expect(result.updatedCount).toBe(1);

      const cards = await prisma.card.findMany({
        where: { deckId: deck.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(cards).toHaveLength(2);
      expect(cards[0].back).toBe('Updated A');
      expect(cards[1].front).toBe('New Q');
    });

    it('rejects when deck not found', async () => {
      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: 'nonexistent',
          new: [{ front: 'Q', back: 'A' }],
          update: [],
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects when deck not owned by user', async () => {
      const otherDeck = await prisma.deck.create({
        data: { name: 'Other Deck', userId: otherUserId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: otherDeck.id,
          new: [{ front: 'Q', back: 'A' }],
          update: [],
        }),
      ).rejects.toThrow(/not found/i);
    });

    it('rejects update for a card not belonging to the deck', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'My Deck', userId },
      });
      const otherDeck = await prisma.deck.create({
        data: {
          name: 'Other Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: deck.id,
          new: [],
          update: [{ cardId: otherDeck.cards[0].id, back: 'Hacked' }],
        }),
      ).rejects.toThrow(/card.*does not belong|not found/i);
    });

    it('rejects empty front in new cards', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: deck.id,
          new: [{ front: '', back: 'A' }],
          update: [],
        }),
      ).rejects.toThrow();
    });

    it('rejects empty back in new cards', async () => {
      const deck = await prisma.deck.create({
        data: { name: 'Import Deck', userId },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: deck.id,
          new: [{ front: 'Q', back: '' }],
          update: [],
        }),
      ).rejects.toThrow();
    });

    it('rejects empty back in update cards', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Import Deck',
          userId,
          cards: { create: [{ front: 'Q', back: 'A' }] },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      await expect(
        caller.card.importCards({
          deckId: deck.id,
          new: [],
          update: [{ cardId: deck.cards[0].id, back: '' }],
        }),
      ).rejects.toThrow();
    });

    it('returns correct createdCount and updatedCount', async () => {
      const deck = await prisma.deck.create({
        data: {
          name: 'Import Deck',
          userId,
          cards: {
            create: [
              { front: 'Q1', back: 'Old A1' },
              { front: 'Q2', back: 'Old A2' },
            ],
          },
        },
        include: { cards: true },
      });

      const caller = createCaller();
      const result = await caller.card.importCards({
        deckId: deck.id,
        new: [
          { front: 'Q3', back: 'A3' },
          { front: 'Q4', back: 'A4' },
          { front: 'Q5', back: 'A5' },
        ],
        update: [
          { cardId: deck.cards[0].id, back: 'New A1' },
          { cardId: deck.cards[1].id, back: 'New A2' },
        ],
      });

      expect(result.createdCount).toBe(3);
      expect(result.updatedCount).toBe(2);
    });
  });
});
