import { useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CenteredPage } from '@/components/CenteredPage';
import { formatPercent } from '@/lib/format';

export default function DeckListPage() {
  const [newDeckName, setNewDeckName] = useState('');
  const utils = trpc.useUtils();
  const decksQuery = trpc.deck.list.useQuery();

  const createDeck = trpc.deck.create.useMutation({
    onSuccess: () => {
      utils.deck.list.invalidate();
    },
  });

  if (decksQuery.isLoading) {
    return (
      <CenteredPage centered>
        <p className="text-muted-foreground">Loading decks...</p>
      </CenteredPage>
    );
  }

  if (decksQuery.isError) {
    return (
      <CenteredPage centered>
        <p className="text-destructive">Error loading decks.</p>
      </CenteredPage>
    );
  }

  const decks = decksQuery.data ?? [];

  return (
    <CenteredPage>
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Your Decks</h1>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newDeckName.trim()) return;
            createDeck.mutate({ name: newDeckName.trim() });
            setNewDeckName('');
          }}
        >
          <Input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="Deck name"
            className="flex-1"
          />
          <Button type="submit" disabled={createDeck.isPending}>
            Create
          </Button>
        </form>

        {decks.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            No decks yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                to={`/decks/${deck.id}`}
                className="block rounded-md border px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{deck.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {deck.cardCount} cards
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {deck.totalAttempts > 0 && (
                      <p className="font-medium">
                        {formatPercent(deck.accuracy)}
                      </p>
                    )}
                    {deck.lastStudied && (
                      <p>
                        Last studied{' '}
                        {new Date(deck.lastStudied).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CenteredPage>
  );
}
