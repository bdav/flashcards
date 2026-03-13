import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { type PrismaClient } from '@prisma/client';
import { createTestPrisma } from './test-helpers.js';
import { appRouter } from './routers/index.js';

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

// Test data references
let userId: string;
let deckId: string;
let cardIds: string[];

beforeAll(async () => {
  const testDb = createTestPrisma();
  prisma = testDb.prisma;
  cleanup = testDb.cleanup;

  // Seed test data: a user with a deck and cards
  const user = await prisma.user.create({
    data: {
      email: 'study-test@example.com',
      passwordHash: 'fakehash',
    },
  });
  userId = user.id;

  const deck = await prisma.deck.create({
    data: {
      name: 'Test Study Deck',
      userId: user.id,
      cards: {
        create: [
          { front: 'Capital of France', back: 'Paris' },
          { front: 'Capital of Japan', back: 'Tokyo' },
          { front: 'Capital of Brazil', back: 'Brasília' },
        ],
      },
    },
    include: { cards: true },
  });
  deckId = deck.id;
  cardIds = deck.cards.map((c) => c.id);
});

afterAll(async () => {
  await cleanup();
});

function createCaller() {
  return appRouter.createCaller({ prisma, userId });
}

describe('deckRouter.getById', () => {
  it('returns the deck with its cards', async () => {
    const caller = createCaller();
    const deck = await caller.deck.getById({ id: deckId });

    expect(deck.id).toBe(deckId);
    expect(deck.name).toBe('Test Study Deck');
    expect(deck.cards).toHaveLength(3);
    expect(deck.cards[0].front).toBe('Capital of France');
  });

  it('throws NOT_FOUND for a nonexistent deck', async () => {
    const caller = createCaller();
    await expect(caller.deck.getById({ id: 'nonexistent-id' })).rejects.toThrow(
      /not found/i,
    );
  });

  it('throws NOT_FOUND for a deck owned by another user', async () => {
    const otherUser = await prisma.user.create({
      data: { email: 'other-user@example.com', passwordHash: 'fakehash' },
    });
    const otherDeck = await prisma.deck.create({
      data: { name: 'Other Deck', userId: otherUser.id },
    });

    const caller = createCaller();
    await expect(caller.deck.getById({ id: otherDeck.id })).rejects.toThrow(
      /not found/i,
    );
  });
});

describe('studyRouter', () => {
  describe('startSession', () => {
    it('creates a StudySession record', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      expect(session.id).toBeDefined();
      expect(session.deckId).toBe(deckId);
      expect(session.userId).toBe(userId);
      expect(session.endedAt).toBeNull();
    });

    it('throws NOT_FOUND for a nonexistent deck', async () => {
      const caller = createCaller();
      await expect(
        caller.study.startSession({ deckId: 'nonexistent-deck' }),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('submitAttempt', () => {
    it('stores a correct attempt', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      const attempt = await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[0],
        result: 'correct',
      });

      expect(attempt.id).toBeDefined();
      expect(attempt.studySessionId).toBe(session.id);
      expect(attempt.cardId).toBe(cardIds[0]);
      expect(attempt.result).toBe('correct');
    });

    it('rejects duplicate attempt for same card in same session', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[0],
        result: 'correct',
      });

      await expect(
        caller.study.submitAttempt({
          studySessionId: session.id,
          cardId: cardIds[0],
          result: 'incorrect',
        }),
      ).rejects.toThrow(/already submitted/i);
    });

    it('rejects attempt on a finished session', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });
      await caller.study.finishSession({ id: session.id });

      await expect(
        caller.study.submitAttempt({
          studySessionId: session.id,
          cardId: cardIds[0],
          result: 'correct',
        }),
      ).rejects.toThrow(/already finished/i);
    });

    it('stores an incorrect attempt', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      const attempt = await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[1],
        result: 'incorrect',
      });

      expect(attempt.result).toBe('incorrect');
    });
  });

  describe('finishSession', () => {
    it('sets endedAt on the session', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      const finished = await caller.study.finishSession({ id: session.id });

      expect(finished.endedAt).not.toBeNull();
      expect(finished.id).toBe(session.id);
    });

    it('throws BAD_REQUEST when session is already finished', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });
      await caller.study.finishSession({ id: session.id });

      await expect(
        caller.study.finishSession({ id: session.id }),
      ).rejects.toThrow(/already finished/i);
    });
  });

  describe('getSession', () => {
    it('returns session with its attempts', async () => {
      const caller = createCaller();
      const session = await caller.study.startSession({ deckId });

      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[0],
        result: 'correct',
      });
      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[1],
        result: 'incorrect',
      });

      const fetched = await caller.study.getSession({ id: session.id });

      expect(fetched.id).toBe(session.id);
      expect(fetched.attempts).toHaveLength(2);
      expect(fetched.attempts[0].result).toBe('correct');
      expect(fetched.attempts[1].result).toBe('incorrect');
    });

    it('throws NOT_FOUND for a nonexistent session', async () => {
      const caller = createCaller();
      await expect(
        caller.study.getSession({ id: 'nonexistent-id' }),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('full study flow', () => {
    it('start -> submit all cards -> finish -> getSession shows everything', async () => {
      const caller = createCaller();

      const session = await caller.study.startSession({ deckId });

      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[0],
        result: 'correct',
      });
      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[1],
        result: 'incorrect',
      });
      await caller.study.submitAttempt({
        studySessionId: session.id,
        cardId: cardIds[2],
        result: 'correct',
      });

      const finished = await caller.study.finishSession({ id: session.id });
      expect(finished.endedAt).not.toBeNull();

      const fetched = await caller.study.getSession({ id: session.id });
      expect(fetched.attempts).toHaveLength(3);
      expect(fetched.endedAt).not.toBeNull();

      const correctCount = fetched.attempts.filter(
        (a) => a.result === 'correct',
      ).length;
      expect(correctCount).toBe(2);
    });
  });
});
