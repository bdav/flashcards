import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  healthCheck: t.procedure.query(() => {
    return { ok: true };
  }),
});
