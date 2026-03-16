import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from './trpc.js';
import { parseCsv } from '../services/csvParser.js';

export const cardRouter = router({
  create: publicProcedure
    .input(
      z.object({
        deckId: z.string(),
        front: z.string().trim().min(1),
        back: z.string().trim().min(1),
      }),
    )
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

      return ctx.prisma.card.create({
        data: {
          deckId: input.deckId,
          front: input.front,
          back: input.back,
        },
      });
    }),

  listByDeck: publicProcedure
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

      return ctx.prisma.card.findMany({
        where: { deckId: input.deckId },
        orderBy: { createdAt: 'asc' },
      });
    }),

  importCsv: publicProcedure
    .input(
      z.object({
        deckId: z.string(),
        csvContent: z.string(),
      }),
    )
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

      const result = parseCsv(input.csvContent);

      if (!result.ok) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error,
        });
      }

      await ctx.prisma.card.createMany({
        data: result.cards.map((card) => ({
          deckId: input.deckId,
          front: card.front,
          back: card.back,
        })),
      });

      return { importedCount: result.cards.length };
    }),
});
