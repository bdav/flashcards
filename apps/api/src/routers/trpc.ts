import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from '../context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Procedure that requires an authenticated user.
 * Throws UNAUTHORIZED if no valid session is present.
 * Narrows ctx.userId from `string | null` to `string`.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // narrowed to string
    },
  });
});
