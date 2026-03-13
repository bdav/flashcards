import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from './trpc.js';

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
        result: z.enum(['correct', 'incorrect']),
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

      const existing = await ctx.prisma.cardAttempt.findFirst({
        where: {
          studySessionId: input.studySessionId,
          cardId: input.cardId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Attempt already submitted for this card in this session',
        });
      }

      return ctx.prisma.cardAttempt.create({
        data: {
          studySessionId: input.studySessionId,
          cardId: input.cardId,
          result: input.result,
        },
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
        include: { attempts: true },
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
