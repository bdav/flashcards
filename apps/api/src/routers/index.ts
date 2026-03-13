import { publicProcedure, router } from './trpc.js';
import { deckRouter } from './deck.js';
import { studyRouter } from './study.js';

export { publicProcedure };

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { ok: true };
  }),
  deck: deckRouter,
  study: studyRouter,
});
