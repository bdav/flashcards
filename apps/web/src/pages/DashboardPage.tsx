import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

const SEED_DECK_ID = 'seed-deck-world-capitals';

export default function DashboardPage() {
  const deckQuery = trpc.deck.getById.useQuery({ id: SEED_DECK_ID });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Flashcards</h1>

      {deckQuery.data && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">{deckQuery.data.name}</h2>
          <p className="text-muted-foreground">
            {deckQuery.data.cards.length} cards
          </p>
          <div className="mt-2 flex gap-2">
            <Button asChild>
              <Link to={`/decks/${SEED_DECK_ID}/study`}>Study</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/stats">Stats</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
