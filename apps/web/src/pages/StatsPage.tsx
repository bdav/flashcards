import { trpc } from '@/lib/trpc';
import { CenteredPage } from '@/components/CenteredPage';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function StatsPage() {
  const statsQuery = trpc.stats.overallStats.useQuery();

  if (statsQuery.isLoading) {
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

  if (!stats) {
    return null;
  }

  if (stats.totalAttempts === 0) {
    return (
      <CenteredPage centered>
        <h1 className="text-2xl font-bold">Stats</h1>
        <p className="mt-2 text-muted-foreground">
          No study data yet. Study a deck to see your stats here.
        </p>
      </CenteredPage>
    );
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Stats</h1>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Attempts"
            value={String(stats.totalAttempts)}
          />
          <StatCard label="Correct" value={String(stats.totalCorrect)} />
          <StatCard
            label="Accuracy"
            value={formatPercent(stats.overallAccuracy)}
          />
          <StatCard label="Decks Studied" value={String(stats.deckCount)} />
        </div>

        {stats.weakCards.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Needs Work</h2>
            <p className="text-sm text-muted-foreground">
              Cards that take multiple attempts to get right
            </p>
            <div className="mt-3 space-y-2">
              {stats.weakCards.map((card) => (
                <div
                  key={card.cardId}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <span className="text-sm">{card.front}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.avgAttemptsToCorrect.toFixed(1)}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-4 py-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
