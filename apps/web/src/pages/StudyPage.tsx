import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

type StudyState =
  | { phase: 'idle' }
  | { phase: 'studying'; cardIndex: number; revealed: boolean }
  | { phase: 'complete' };

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [studyState, setStudyState] = useState<StudyState>({
    phase: 'idle',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );

  const startSession = trpc.study.startSession.useMutation({
    onSuccess: (session) => {
      setError(null);
      setSessionId(session.id);
      setStudyState({ phase: 'studying', cardIndex: 0, revealed: false });
    },
    onError: () => {
      setError('Failed to start study session. Please try again.');
    },
  });

  const submitAttempt = trpc.study.submitAttempt.useMutation();
  const finishSession = trpc.study.finishSession.useMutation();

  const deck = deckQuery.data;
  const cards = deck?.cards ?? [];

  function handleStart() {
    if (!deckId) return;
    startSession.mutate({ deckId });
  }

  async function handleAnswer(result: 'correct' | 'incorrect') {
    if (studyState.phase !== 'studying' || !sessionId) return;

    try {
      setError(null);
      const card = cards[studyState.cardIndex];
      await submitAttempt.mutateAsync({
        studySessionId: sessionId,
        cardId: card.id,
        result,
      });

      const nextIndex = studyState.cardIndex + 1;
      if (nextIndex >= cards.length) {
        await finishSession.mutateAsync({ id: sessionId });
        setStudyState({ phase: 'complete' });
      } else {
        setStudyState({
          phase: 'studying',
          cardIndex: nextIndex,
          revealed: false,
        });
      }
    } catch {
      setError('Failed to submit answer. Please try again.');
    }
  }

  if (deckQuery.isLoading) {
    return <p>Loading deck...</p>;
  }

  if (deckQuery.isError || !deck) {
    return <p>Error loading deck.</p>;
  }

  if (cards.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <p className="mt-4">This deck has no cards.</p>
      </main>
    );
  }

  if (studyState.phase === 'idle') {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <p className="mt-2 text-muted-foreground">{cards.length} cards</p>
        {error && <p className="mt-2 text-destructive">{error}</p>}
        <Button className="mt-4" onClick={handleStart}>
          Start studying
        </Button>
      </main>
    );
  }

  if (studyState.phase === 'complete') {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Session complete!</h1>
        <p className="mt-2">
          You studied all {cards.length} cards in {deck.name}.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleStart}>Study again</Button>
          <Button variant="outline" asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { cardIndex, revealed } = studyState;
  const currentCard = cards[cardIndex];

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <span className="text-muted-foreground">
          {cardIndex + 1} of {cards.length}
        </span>
      </div>

      {error && <p className="mb-4 text-destructive">{error}</p>}

      <div className="rounded-lg border p-6">
        <p className="text-lg font-medium">{currentCard.front}</p>

        {!revealed ? (
          <Button
            className="mt-4"
            onClick={() => setStudyState({ ...studyState, revealed: true })}
          >
            Reveal answer
          </Button>
        ) : (
          <>
            <p className="mt-4 text-lg" data-testid="answer">
              {currentCard.back}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => handleAnswer('correct')}>Correct</Button>
              <Button
                variant="destructive"
                onClick={() => handleAnswer('incorrect')}
              >
                Incorrect
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
