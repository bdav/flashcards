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

      // Case-insensitive dedupe on front. Done in JS because SQLite doesn't
      // support Prisma's `mode: 'insensitive'`. On Postgres, use findFirst
      // with { mode: 'insensitive' } for DB-level filtering.
      const existingCards = await ctx.prisma.card.findMany({
        where: { deckId: input.deckId },
      });
      const duplicate = existingCards.find(
        (c) => c.front.toLowerCase() === input.front.toLowerCase(),
      );

      if (duplicate) {
        if (duplicate.back.toLowerCase() !== input.back.toLowerCase()) {
          return ctx.prisma.card.update({
            where: { id: duplicate.id },
            data: { back: input.back },
          });
        }
        return duplicate;
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

      // Dedupe within CSV on front (last occurrence wins)
      const csvByFront = new Map<string, { front: string; back: string }>();
      for (const card of result.cards) {
        csvByFront.set(card.front.toLowerCase(), card);
      }
      const uniqueCsvCards = [...csvByFront.values()];

      // Compare against existing cards in deck (case-insensitive on front).
      // Done in JS because SQLite doesn't support Prisma's `mode: 'insensitive'`.
      const existingCards = await ctx.prisma.card.findMany({
        where: { deckId: input.deckId },
        select: { id: true, front: true, back: true },
      });
      const existingByFront = new Map(
        existingCards.map((c) => [c.front.toLowerCase(), c]),
      );

      const toCreate: { front: string; back: string }[] = [];
      let updatedCount = 0;

      for (const card of uniqueCsvCards) {
        const existing = existingByFront.get(card.front.toLowerCase());
        if (!existing) {
          toCreate.push(card);
        } else if (existing.back.toLowerCase() !== card.back.toLowerCase()) {
          await ctx.prisma.card.update({
            where: { id: existing.id },
            data: { back: card.back },
          });
          updatedCount++;
        }
        // else: exact match on front+back, skip
      }

      if (toCreate.length > 0) {
        await ctx.prisma.card.createMany({
          data: toCreate.map((card) => ({
            deckId: input.deckId,
            front: card.front,
            back: card.back,
          })),
        });
      }

      return { importedCount: toCreate.length, updatedCount };
    }),
});
