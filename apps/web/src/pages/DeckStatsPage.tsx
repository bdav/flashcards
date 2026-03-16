import { useParams } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { CenteredPage } from '@/components/CenteredPage';
import { DeckHeader } from '@/components/DeckHeader';
import { StatCard } from '@/components/StatCard';
import { formatPercent } from '@/lib/format';

export default function DeckStatsPage() {
  const { deckId } = useParams<{ deckId: string }>();

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );
  const statsQuery = trpc.stats.deckStats.useQuery(
    { deckId: deckId ?? '' },
    { enabled: !!deckId },
  );

  const deckName = deckQuery.data?.name ?? 'Deck';

  if (statsQuery.isLoading || deckQuery.isLoading) {
    return (
      <CenteredPage centered>
        <p className="text-muted-foreground">Loading stats...</p>
      </CenteredPage>
    );
  }

  if (statsQuery.isError) {
    return (
      <CenteredPage centered>
        <p className="text-destructive">Error loading stats.</p>
      </CenteredPage>
    );
  }

  const stats = statsQuery.data;

  if (!stats || stats.totalAttempts === 0) {
    return (
      <CenteredPage centered>
        <h1 className="text-2xl font-bold">{deckName}</h1>
        <p className="mt-2 text-muted-foreground">
          No study data yet. Study this deck to see stats here.
        </p>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-2xl text-soft-foreground">
        <DeckHeader
          deckName={deckName}
          deckId={deckId ?? ''}
          activeTab="stats"
        />

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Attempts"
            value={String(stats.totalAttempts)}
          />
          <StatCard
            label="Cards Studied"
            value={String(stats.uniqueCardsStudied)}
          />
          <StatCard
            label="First-Try Accuracy"
            value={formatPercent(stats.firstTryAccuracy)}
          />
          <StatCard
            label="Overall Accuracy"
            value={formatPercent(stats.overallAccuracy)}
          />
        </div>

        {stats.cardStats.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Per-Card Breakdown</h2>
            <div className="mt-3 space-y-2">
              {stats.cardStats.map((card) => (
                <div
                  key={card.cardId}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {card.totalAttempts} attempts
                  </span>
                  <span className="text-sm font-medium">
                    {card.avgAttemptsToCorrect !== null
                      ? card.avgAttemptsToCorrect.toFixed(1)
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CenteredPage>
  );
}
