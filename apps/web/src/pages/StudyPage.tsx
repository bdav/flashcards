import { useParams, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight } from 'lucide-react';
import { CardStack } from '@/components/CardStack';
import { useCardQueue } from '@/hooks/useCardQueue';
import { useStudySession } from '@/hooks/useStudySession';

const answerInputClasses =
  'h-auto flex-1 rounded-none border-0 border-b-2 border-border py-2 text-center text-3xl font-bold uppercase tracking-wide shadow-none focus-visible:ring-0 md:text-3xl';

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>();

  const deckQuery = trpc.deck.getById.useQuery(
    { id: deckId ?? '' },
    { enabled: !!deckId },
  );

  const deck = deckQuery.data;
  const cards = deck?.cards ?? [];

  const cardQueue = useCardQueue(cards);
  const {
    studyState,
    answerInput,
    setAnswerInput,
    error,
    handleStart,
    handleSubmitAnswer,
    handleNext,
  } = useStudySession(deckId, cardQueue);

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

  const currentCard = cardQueue.currentCard;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <h1 className="text-lg font-bold">{deck.name}</h1>
        <span className="text-muted-foreground">
          {cardQueue.cardsStudied + 1} of{' '}
          {cardQueue.cardsStudied + cardQueue.queue.length}
        </span>
      </div>

      {error && <p className="mb-4 text-destructive">{error}</p>}

      <CardStack queueLength={cardQueue.queue.length}>
        {studyState.phase === 'answering' && currentCard && (
          <p className="text-center text-3xl font-bold uppercase tracking-wide">
            {currentCard.front}
          </p>
        )}
        {studyState.phase === 'result' && currentCard && (
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
      </CardStack>

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
