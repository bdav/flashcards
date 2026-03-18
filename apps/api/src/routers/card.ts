import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from './trpc.js';

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

      return ctx.prisma.$transaction(async (tx) => {
        await tx.cardAttempt.deleteMany({
          where: { cardId: input.cardId },
        });

        return tx.card.update({
          where: { id: input.cardId },
          data: {
            ...(input.front !== undefined && { front: input.front }),
            ...(input.back !== undefined && { back: input.back }),
          },
        });
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

  importCards: protectedProcedure
    .input(
      z.object({
        deckId: z.string(),
        new: z.array(
          z.object({
            front: z.string().trim().min(1),
            back: z.string().trim().min(1),
          }),
        ),
        update: z.array(
          z.object({
            cardId: z.string(),
            back: z.string().trim().min(1),
          }),
        ),
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

      // Validate that all update cards belong to this deck
      if (input.update.length > 0) {
        const updateIds = input.update.map((c) => c.cardId);
        const existingCards = await ctx.prisma.card.findMany({
          where: { id: { in: updateIds } },
        });
        const existingByDeck = new Set(
          existingCards
            .filter((c) => c.deckId === input.deckId)
            .map((c) => c.id),
        );
        for (const id of updateIds) {
          if (!existingByDeck.has(id)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Card does not belong to this deck',
            });
          }
        }
      }

      return ctx.prisma.$transaction(async (tx) => {
        // Create new cards
        if (input.new.length > 0) {
          await tx.card.createMany({
            data: input.new.map((card) => ({
              deckId: input.deckId,
              front: card.front,
              back: card.back,
            })),
          });
        }

        // Update existing cards and reset their attempts
        if (input.update.length > 0) {
          await tx.cardAttempt.deleteMany({
            where: { cardId: { in: input.update.map((c) => c.cardId) } },
          });
        }
        for (const card of input.update) {
          await tx.card.update({
            where: { id: card.cardId },
            data: { back: card.back },
          });
        }

        return {
          createdCount: input.new.length,
          updatedCount: input.update.length,
        };
      });
    }),
});
