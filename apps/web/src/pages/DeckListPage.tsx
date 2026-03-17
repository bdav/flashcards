import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CenteredPage } from '@/components/CenteredPage';
import { DeckListSkeleton } from '@/components/PageSkeleton';
import { DeckCard } from '@/components/DeckCard';
import { formatPercent } from '@/lib/format';

export default function DeckListPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const utils = trpc.useUtils();
  const decksQuery = trpc.deck.list.useQuery();

  const createDeck = trpc.deck.create.useMutation({
    onSuccess: () => {
      utils.deck.list.invalidate();
      setIsCreating(false);
      setNewDeckName('');
    },
    onError: () => {
      toast.error('Failed to create deck');
    },
  });

  if (decksQuery.isLoading) {
    return <DeckListSkeleton />;
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
      <div className="w-full max-w-4xl text-white">
        <h1 className="text-2xl font-bold">Your Decks</h1>

        {decks.length === 0 && !isCreating ? (
          <p className="mt-6 text-white/60">
            No decks yet. Create one to get started.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
          {/* Create new deck card */}
          {isCreating ? (
            <DeckCard stackCount={0}>
              <form
                className="flex w-full flex-col items-center gap-3 px-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newDeckName.trim()) return;
                  createDeck.mutate({ name: newDeckName.trim() });
                }}
              >
                <Input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Deck name"
                  autoFocus
                  className="text-center"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createDeck.isPending}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreating(false);
                      setNewDeckName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DeckCard>
          ) : (
            <DeckCard
              stackCount={0}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-10 w-10 text-white/60" />
              <p className="mt-2 text-sm font-medium text-white/60">New Deck</p>
            </DeckCard>
          )}

          {/* Deck tiles */}
          {decks.map((deck) => (
            <Link
              key={deck.id}
              to={`/decks/${deck.id}`}
              className="block transition-shadow hover:shadow-lg"
            >
              <DeckCard stackCount={Math.min(deck.cardCount, 3)}>
                <p className="text-center text-lg font-bold uppercase tracking-wide text-white">
                  {deck.name}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {deck.cardCount} cards
                </p>
                {deck.totalAttempts > 0 && (
                  <p className="mt-2 text-sm font-medium text-white/80">
                    {formatPercent(deck.accuracy)}
                  </p>
                )}
                {deck.lastStudied && (
                  <p className="mt-0.5 text-xs text-white/50">
                    Last studied{' '}
                    {new Date(deck.lastStudied).toLocaleDateString()}
                  </p>
                )}
              </DeckCard>
            </Link>
          ))}
        </div>
      </div>
    </CenteredPage>
  );
}
