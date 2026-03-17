import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from './trpc.js';
import { parseCsv } from '../services/csvParser.js';

export const cardRouter = router({
  create: protectedProcedure
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

  update: protectedProcedure
    .input(
      z
        .object({
          cardId: z.string(),
          front: z.string().trim().min(1).optional(),
          back: z.string().trim().min(1).optional(),
        })
        .refine((d) => d.front !== undefined || d.back !== undefined, {
          message: 'At least one of front or back must be provided',
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        include: { deck: { select: { userId: true } } },
      });

      if (!card || card.deck.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found',
        });
      }

      return ctx.prisma.card.update({
        where: { id: input.cardId },
        data: {
          ...(input.front !== undefined && { front: input.front }),
          ...(input.back !== undefined && { back: input.back }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ cardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.card.findUnique({
        where: { id: input.cardId },
        include: { deck: { select: { userId: true } } },
      });

      if (!card || card.deck.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found',
        });
      }

      await ctx.prisma.card.delete({
        where: { id: input.cardId },
      });

      return { success: true };
    }),

  listByDeck: protectedProcedure
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

  importCsv: protectedProcedure
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
