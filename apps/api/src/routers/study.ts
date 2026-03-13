import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';
import { gradeAnswer } from '../services/answerGrader.js';

export const studyRouter = router({
  startSession: publicProcedure
    .input(z.object({ deckId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deck = await ctx.prisma.deck.findUnique({
        where: { id: input.deckId, userId: ctx.userId },
      });

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      return ctx.prisma.studySession.create({
        data: {
          userId: ctx.userId,
          deckId: input.deckId,
        },
      });
    }),

  submitAttempt: publicProcedure
    .input(
      z.object({
        studySessionId: z.string(),
        cardId: z.string(),
        userAnswer: z.string().min(1, 'Answer cannot be empty'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.studySession.findUnique({
        where: { id: input.studySessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      if (session.endedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session already finished',
        });
      }

      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
      });

      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found',
        });
      }

      if (card.deckId !== session.deckId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Card does not belong to this session's deck",
        });
      }

      const result = gradeAnswer(input.userAnswer, card.back);

      // Wrap count + create in a transaction to prevent race conditions on attemptNumber
      return ctx.prisma.$transaction(async (tx) => {
        const previousAttempts = await tx.cardAttempt.count({
          where: {
            studySessionId: input.studySessionId,
            cardId: input.cardId,
          },
        });

        return tx.cardAttempt.create({
          data: {
            studySessionId: input.studySessionId,
            cardId: input.cardId,
            userAnswer: input.userAnswer,
            result,
            attemptNumber: previousAttempts + 1,
          },
        });
      });
    }),

  finishSession: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.studySession.findUnique({
        where: { id: input.id },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      if (session.endedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session already finished',
        });
      }

      return ctx.prisma.studySession.update({
        where: { id: input.id },
        data: { endedAt: new Date() },
      });
    }),

  getSession: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.studySession.findUnique({
        where: { id: input.id },
        include: { attempts: { orderBy: { createdAt: 'asc' } } },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Study session not found',
        });
      }

      return session;
    }),
});
