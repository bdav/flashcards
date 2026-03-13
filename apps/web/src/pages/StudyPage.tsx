import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type StudyState =
  | { phase: 'idle' }
  | { phase: 'answering'; cardIndex: number }
  | {
      phase: 'result';
      cardIndex: number;
      result: 'correct' | 'incorrect';
      userAnswer: string;
    }
  | { phase: 'complete' };

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [studyState, setStudyState] = useState<StudyState>({
    phase: 'idle',
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );

  const startSession = trpc.study.startSession.useMutation({
    onSuccess: (session) => {
      setError(null);
      setSessionId(session.id);
      setAnswerInput('');
      setStudyState({ phase: 'answering', cardIndex: 0 });
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
      const card = cards[studyState.cardIndex];
      const attempt = await submitAttempt.mutateAsync({
        studySessionId: sessionId,
        cardId: card.id,
        userAnswer: answerInput,
      });

      setStudyState({
        phase: 'result',
        cardIndex: studyState.cardIndex,
        result: attempt.result,
        userAnswer: answerInput,
      });
    } catch {
      setError('Failed to submit answer. Please try again.');
    }
  }

  async function handleNext() {
    if (studyState.phase !== 'result' || !sessionId) return;

    const nextIndex = studyState.cardIndex + 1;
    if (nextIndex >= cards.length) {
      try {
        await finishSession.mutateAsync({ id: sessionId });
      } catch (err) {
        console.error('Failed to finish study session:', err);
      }
      setStudyState({ phase: 'complete' });
    } else {
      setAnswerInput('');
      setStudyState({ phase: 'answering', cardIndex: nextIndex });
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

  const { cardIndex } = studyState;
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

        {studyState.phase === 'answering' && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitAnswer();
            }}
          >
            <Input
              type="text"
              placeholder="Type your answer..."
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="mt-2">
              Submit
            </Button>
          </form>
        )}

        {studyState.phase === 'result' && (
          <div className="mt-4">
            <p
              className={`text-lg font-semibold ${
                studyState.result === 'correct'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
              data-testid="result"
            >
              {studyState.result === 'correct' ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your answer: {studyState.userAnswer}
            </p>
            <p className="mt-1 text-lg" data-testid="correct-answer">
              Answer: {currentCard.back}
            </p>
            <Button className="mt-4" onClick={handleNext}>
              Next
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
