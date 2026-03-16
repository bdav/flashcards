import { publicProcedure, router } from './trpc.js';
import { cardRouter } from './card.js';
import { deckRouter } from './deck.js';
import { studyRouter } from './study.js';
import { statsRouter } from './stats.js';

export { publicProcedure };

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { ok: true };
  }),
  card: cardRouter,
  deck: deckRouter,
  study: studyRouter,
  stats: statsRouter,
});
