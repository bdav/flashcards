import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';

type Card = { id: string; front: string; back: string };

type StudyState =
  | { phase: 'idle' }
  | { phase: 'answering' }
  | {
      phase: 'result';
      result: 'correct' | 'incorrect';
      userAnswer: string;
    }
  | { phase: 'complete' };

const answerInputClasses =
  'h-auto flex-1 rounded-none border-0 border-b-2 border-border py-2 text-center text-3xl font-bold uppercase tracking-wide shadow-none focus-visible:ring-0 md:text-3xl';

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [studyState, setStudyState] = useState<StudyState>({
    phase: 'idle',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [cardsStudied, setCardsStudied] = useState(0);

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );

  const startSession = trpc.study.startSession.useMutation({
    onSuccess: (session) => {
      setError(null);
      setSessionId(session.id);
      setAnswerInput('');
      setStudyQueue([...cards]);
      setCardsStudied(0);
      setStudyState({ phase: 'answering' });
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

  async function handleSubmitAnswer() {
    if (studyState.phase !== 'answering' || !sessionId) return;
    if (!answerInput.trim()) return;

    try {
      setError(null);
      const card = studyQueue[0];
      const attempt = await submitAttempt.mutateAsync({
        studySessionId: sessionId,
        cardId: card.id,
        userAnswer: answerInput,
      });

      setStudyState({
        phase: 'result',
        result: attempt.result,
        userAnswer: answerInput,
      });
    } catch {
      setError('Failed to submit answer. Please try again.');
    }
  }

  const handleNext = useCallback(async () => {
    if (studyState.phase !== 'result' || !sessionId) return;

    const currentCard = studyQueue[0];
    const remaining = studyQueue.slice(1);

    // Re-queue incorrect cards to the back
    if (studyState.result === 'incorrect') {
      remaining.push(currentCard);
    }

    setCardsStudied((prev) => prev + 1);

    if (remaining.length === 0) {
      try {
        await finishSession.mutateAsync({ id: sessionId });
      } catch (err) {
        console.error('Failed to finish study session:', err);
      }
      setStudyState({ phase: 'complete' });
    } else {
      setStudyQueue(remaining);
      setAnswerInput('');
      setStudyState({ phase: 'answering' });
    }
  }, [studyState, sessionId, studyQueue, finishSession]);

  useEffect(() => {
    if (studyState.phase !== 'result') return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [studyState.phase, handleNext]);

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

  const currentCard = studyQueue[0];

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <h1 className="text-lg font-bold">{deck.name}</h1>
        <span className="text-muted-foreground">
          {cardsStudied + 1} of {cardsStudied + studyQueue.length}
        </span>
      </div>

      {error && <p className="mb-4 text-destructive">{error}</p>}

      <div className="relative w-full max-w-md pt-3">
        {studyQueue.length > 2 && (
          <div className="absolute inset-x-2 top-0 h-4 rounded-t-xl border-2 border-b-0 bg-white shadow-sm" />
        )}
        {studyQueue.length > 1 && (
          <div className="absolute inset-x-1 top-1.5 h-4 rounded-t-xl border-2 border-b-0 bg-white shadow-sm" />
        )}
        <div className="relative flex aspect-3/2 w-full flex-col items-center justify-center rounded-xl border-2 bg-white p-8 shadow-md">
          {studyState.phase === 'answering' && (
            <p className="text-center text-3xl font-bold uppercase tracking-wide">
              {currentCard.front}
            </p>
          )}
          {studyState.phase === 'result' && (
            <div className="text-center" data-testid="correct-answer">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                {currentCard.front}
              </p>
              <p className="mt-2 text-3xl font-bold uppercase tracking-wide">
                {currentCard.back}
              </p>
              <p
                className={`mt-4 text-lg font-semibold ${
                  studyState.result === 'correct'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
                data-testid="result"
              >
                {studyState.result === 'correct' ? 'Correct!' : 'Incorrect'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-6 w-full max-w-md">
        {studyState.phase === 'answering' && (
          <form
            className="w-full"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitAnswer();
            }}
          >
            <Input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              autoFocus
              className={answerInputClasses}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Submit"
              className="absolute -right-12 top-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </form>
        )}

        {studyState.phase === 'result' && (
          <>
            <Input
              type="text"
              value={studyState.userAnswer}
              readOnly
              className={answerInputClasses}
            />
            <Button
              onClick={handleNext}
              variant="ghost"
              size="icon"
              aria-label="Next"
              className="absolute -right-12 top-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
