import { Link, useParams } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, CornerDownLeft } from 'lucide-react';
import { CardStack } from '@/components/CardStack';
import { CenteredPage } from '@/components/CenteredPage';
import { StudySkeleton } from '@/components/PageSkeleton';
import { useCardQueue } from '@/hooks/useCardQueue';
import { useStudySession } from '@/hooks/useStudySession';
import { DeckHeader } from '@/components/DeckHeader';
import { formatPercent } from '@/lib/format';

const answerInputClasses =
  'h-auto flex-1 rounded-none border-0 border-b-2 border-white/40 bg-transparent py-2 text-center text-3xl font-bold uppercase tracking-wide text-white shadow-none focus-visible:ring-0 md:text-3xl placeholder:text-white/30';

const navButtonClasses =
  'absolute top-1/2 h-16 w-16 -translate-y-1/2 active:translate-y-[-50%] text-white/50 disabled:opacity-40';

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
    history,
    handleStart,
    handleSubmitAnswer,
    handleNext,
    handleBack,
    handleForward,
    canGoBack,
    reviewEntry,
  } = useStudySession(deckId, cardQueue);

  if (deckQuery.isLoading) {
    return <StudySkeleton />;
  }

  if (deckQuery.isError || !deck) {
    return (
      <CenteredPage centered>
        <p className="text-destructive">Error loading deck.</p>
      </CenteredPage>
    );
  }

  if (cards.length === 0) {
    return (
      <CenteredPage centered>
        <h1 className="text-2xl font-bold text-white">{deck.name}</h1>
        <p className="mt-4 text-white/60">This deck has no cards.</p>
        <Link
          to={`/decks/${deckId}/cards`}
          className="mt-2 text-white/80 underline hover:text-white"
        >
          Add cards
        </Link>
      </CenteredPage>
    );
  }

  if (studyState.phase === 'idle') {
    return (
      <CenteredPage>
        <DeckHeader
          deckName={deck.name}
          deckId={deckId ?? ''}
          activeTab="study"
        />
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {error && <p className="mb-2 text-destructive">{error}</p>}
          <CardStack
            queueLength={cards.length}
            className="animate-pulse-halo-border cursor-pointer"
            onClick={handleStart}
          >
            <p className="text-3xl font-bold text-white">
              {cards.length} cards
            </p>
            <p className="mt-4 text-lg text-white/70">Start studying</p>
          </CardStack>
          <div className="mt-6 w-full max-w-md">
            <div className="py-2 text-3xl">&nbsp;</div>
          </div>
        </div>
      </CenteredPage>
    );
  }

  if (studyState.phase === 'complete') {
    const correctCount = history.filter((h) => h.result === 'correct').length;
    const incorrectCount = history.filter(
      (h) => h.result === 'incorrect',
    ).length;

    // First-try accuracy: for each unique card, check if the first attempt was correct
    const firstAttemptByCard = new Map<string, 'correct' | 'incorrect'>();
    for (const entry of history) {
      if (!firstAttemptByCard.has(entry.card.id)) {
        firstAttemptByCard.set(entry.card.id, entry.result);
      }
    }
    const firstTryCorrect = [...firstAttemptByCard.values()].filter(
      (r) => r === 'correct',
    ).length;
    const firstTryAccuracy =
      firstAttemptByCard.size > 0
        ? firstTryCorrect / firstAttemptByCard.size
        : 0;

    return (
      <CenteredPage>
        <DeckHeader
          deckName={deck.name}
          deckId={deckId ?? ''}
          activeTab="study"
        />
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-white">Session complete!</h2>
          <p className="mt-2 text-white/60">
            You studied all {cards.length} cards.
          </p>
          <div className="mt-4 flex gap-6 text-lg">
            <span className="font-semibold text-green-400">
              {correctCount} correct
            </span>
            <span className="font-semibold text-red-400">
              {incorrectCount} incorrect
            </span>
          </div>
          <p className="mt-2 text-white/60">
            First-try accuracy: {formatPercent(firstTryAccuracy)}
          </p>
          <Button className="mt-6" onClick={handleStart}>
            Study again
          </Button>
        </div>
      </CenteredPage>
    );
  }

  const currentCard = cardQueue.currentCard;
  const isReviewing = studyState.phase === 'reviewing';

  // Determine what to show on the card
  const displayCard = isReviewing ? reviewEntry?.card : currentCard;
  const displayResult =
    isReviewing && reviewEntry
      ? reviewEntry
      : studyState.phase === 'result'
        ? { result: studyState.result, userAnswer: studyState.userAnswer }
        : null;

  return (
    <CenteredPage>
      <DeckHeader
        deckName={deck.name}
        deckId={deckId ?? ''}
        activeTab="study"
      />

      {error && <p className="mb-4 text-destructive">{error}</p>}

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="relative w-full max-w-md">
          <CardStack
            queueLength={cardQueue.queue.length}
            progress={
              isReviewing
                ? undefined
                : `${cardQueue.cardsStudied + 1} / ${cardQueue.cardsStudied + cardQueue.queue.length}`
            }
          >
            {studyState.phase === 'answering' && displayCard && (
              <p className="text-center text-3xl font-bold uppercase tracking-wide text-white">
                {displayCard.front}
              </p>
            )}
            {(studyState.phase === 'result' || isReviewing) &&
              displayCard &&
              displayResult && (
                <div
                  className="text-center text-white"
                  data-testid="correct-answer"
                >
                  <p className="text-sm uppercase tracking-wide text-white/50">
                    {displayCard.front}
                  </p>
                  <p className="mt-2 text-3xl font-bold uppercase tracking-wide text-white">
                    {displayCard.back}
                  </p>
                  <p
                    className={`mt-4 text-lg font-semibold ${
                      displayResult.result === 'correct'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                    data-testid="result"
                  >
                    {displayResult.result === 'correct'
                      ? 'Correct!'
                      : 'Incorrect'}
                  </p>
                </div>
              )}
          </CardStack>

          <Button
            onClick={handleBack}
            disabled={!canGoBack}
            variant="ghost"
            size="icon"
            aria-label="Previous"
            className={`-left-20 ${navButtonClasses}`}
          >
            <ChevronLeft className="size-14" />
          </Button>

          <Button
            onClick={
              isReviewing
                ? handleForward
                : studyState.phase === 'result'
                  ? handleNext
                  : undefined
            }
            disabled={studyState.phase === 'answering'}
            variant="ghost"
            size="icon"
            aria-label="Next"
            className={`-right-20 ${navButtonClasses} ${studyState.phase !== 'answering' ? 'animate-pulse-halo' : ''}`}
          >
            <ChevronRight className="size-14" />
          </Button>
        </div>

        <div className="mt-6 w-full max-w-md">
          {studyState.phase === 'answering' && (
            <form
              className="relative w-full"
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
                disabled={!answerInput.trim()}
                className={`absolute right-0 top-1/2 -translate-y-1/2 active:translate-y-[-50%] text-white/50 disabled:opacity-40 ${answerInput.trim() ? 'animate-pulse-halo' : ''}`}
              >
                <CornerDownLeft className="size-7" />
              </Button>
            </form>
          )}

          {(studyState.phase === 'result' || isReviewing) && displayResult && (
            <p className="py-2 text-center text-3xl font-bold uppercase tracking-wide text-white">
              {displayResult.userAnswer}
            </p>
          )}
        </div>
      </div>
    </CenteredPage>
  );
}
