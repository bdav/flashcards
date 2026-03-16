import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';
import { type AttemptResult } from '@prisma/client';

interface Attempt {
  studySessionId: string;
  cardId: string;
  attemptNumber: number;
  result: AttemptResult;
}

interface PerCardStats {
  cardId: string;
  totalAttempts: number;
  avgAttemptsToCorrect: number | null;
}

/**
 * Computes per-card stats from a list of attempts, scoped per session.
 * Groups by (sessionId, cardId), then averages attempts-to-correct across sessions.
 */
function computePerCardStats(attempts: Attempt[]): {
  perCard: PerCardStats[];
  firstTryAccuracy: number;
  uniqueCardsStudied: number;
} {
  // Group attempts by (sessionId, cardId)
  const bySessionCard = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const key = `${attempt.studySessionId}:${attempt.cardId}`;
    const existing = bySessionCard.get(key);
    if (existing) {
      existing.push(attempt);
    } else {
      bySessionCard.set(key, [attempt]);
    }
  }

  // First-try accuracy: for each (session, card) pair, was attempt #1 correct?
  let firstTryCorrect = 0;
  let totalFirstTries = 0;
  for (const [, sessionCardAttempts] of bySessionCard) {
    totalFirstTries++;
    const first = sessionCardAttempts.reduce((min, a) =>
      a.attemptNumber < min.attemptNumber ? a : min,
    );
    if (first.result === 'correct') {
      firstTryCorrect++;
    }
  }
  const firstTryAccuracy =
    totalFirstTries === 0 ? 0 : firstTryCorrect / totalFirstTries;

  // Per-card: average attempts-to-correct across sessions
  const byCard = new Map<string, number[]>();
  for (const [key, sessionCardAttempts] of bySessionCard) {
    const cardId = key.split(':')[1];
    const sorted = [...sessionCardAttempts].sort(
      (a, b) => a.attemptNumber - b.attemptNumber,
    );
    const firstCorrectIdx = sorted.findIndex((a) => a.result === 'correct');
    const attemptsToCorrect =
      firstCorrectIdx === -1 ? null : firstCorrectIdx + 1;

    if (!byCard.has(cardId)) {
      byCard.set(cardId, []);
    }
    if (attemptsToCorrect !== null) {
      byCard.get(cardId)!.push(attemptsToCorrect);
    }
  }

  const perCard = Array.from(byCard.entries()).map(
    ([cardId, attemptsToCorrectList]) => {
      const totalCardAttempts = attempts.filter(
        (a) => a.cardId === cardId,
      ).length;
      const avg =
        attemptsToCorrectList.length === 0
          ? null
          : attemptsToCorrectList.reduce((sum, n) => sum + n, 0) /
            attemptsToCorrectList.length;
      return {
        cardId,
        totalAttempts: totalCardAttempts,
        avgAttemptsToCorrect: avg,
      };
    },
  );

  return { perCard, firstTryAccuracy, uniqueCardsStudied: byCard.size };
}

const MAX_WEAK_CARDS = 10;

export const statsRouter = router({
  deckStats: publicProcedure
    .input(z.object({ deckId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deck = await ctx.prisma.deck.findUnique({
        where: { id: input.deckId, userId: ctx.userId },
      });

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      const attempts = await ctx.prisma.cardAttempt.findMany({
        where: {
          studySession: {
            deckId: input.deckId,
            userId: ctx.userId,
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (attempts.length === 0) {
        return {
          totalAttempts: 0,
          uniqueCardsStudied: 0,
          firstTryAccuracy: 0,
          overallAccuracy: 0,
          cardStats: [],
        };
      }

      const totalAttempts = attempts.length;
      const totalCorrect = attempts.filter(
        (a) => a.result === 'correct',
      ).length;
      const overallAccuracy = totalCorrect / totalAttempts;

      const { perCard, firstTryAccuracy, uniqueCardsStudied } =
        computePerCardStats(attempts);

      // Fetch card front text for the per-card breakdown
      const cardIds = perCard.map((c) => c.cardId);
      const cards =
        cardIds.length > 0
          ? await ctx.prisma.card.findMany({
              where: { id: { in: cardIds } },
              select: { id: true, front: true },
            })
          : [];
      const cardMap = new Map(cards.map((c) => [c.id, c.front]));

      return {
        totalAttempts,
        uniqueCardsStudied,
        firstTryAccuracy,
        overallAccuracy,
        cardStats: perCard.map((c) => ({
          ...c,
          front: cardMap.get(c.cardId) ?? '',
        })),
      };
    }),

  overallStats: publicProcedure.query(async ({ ctx }) => {
    // TODO: Add pagination or date-range filtering for users with large attempt histories
    const attempts = await ctx.prisma.cardAttempt.findMany({
      where: {
        studySession: {
          userId: ctx.userId,
        },
      },
      include: {
        studySession: { select: { deckId: true } },
      },
    });

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        totalCorrect: 0,
        overallAccuracy: 0,
        deckCount: 0,
        weakCards: [] as {
          cardId: string;
          front: string;
          deckId: string;
          avgAttemptsToCorrect: number;
        }[],
      };
    }

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.filter((a) => a.result === 'correct').length;
    const overallAccuracy = totalCorrect / totalAttempts;
    const deckIds = new Set(attempts.map((a) => a.studySession.deckId));

    const { perCard } = computePerCardStats(attempts);

    // Get card details for weak cards (avgAttemptsToCorrect > 1)
    const weakCardCandidates = perCard
      .filter(
        (c) => c.avgAttemptsToCorrect !== null && c.avgAttemptsToCorrect > 1,
      )
      .sort((a, b) => {
        const diff = b.avgAttemptsToCorrect! - a.avgAttemptsToCorrect!;
        if (diff !== 0) return diff;
        return a.cardId.localeCompare(b.cardId);
      })
      .slice(0, MAX_WEAK_CARDS);

    // Fetch card context (front text, deckId) for the weak cards
    const weakCardIds = weakCardCandidates.map((c) => c.cardId);
    const cards =
      weakCardIds.length > 0
        ? await ctx.prisma.card.findMany({
            where: { id: { in: weakCardIds } },
            select: { id: true, front: true, deckId: true },
          })
        : [];
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    const weakCards = weakCardCandidates.map((c) => {
      const card = cardMap.get(c.cardId);
      return {
        cardId: c.cardId,
        front: card?.front ?? '',
        deckId: card?.deckId ?? '',
        avgAttemptsToCorrect: c.avgAttemptsToCorrect!,
      };
    });

    return {
      totalAttempts,
      totalCorrect,
      overallAccuracy,
      deckCount: deckIds.size,
      weakCards,
    };
  }),
});
