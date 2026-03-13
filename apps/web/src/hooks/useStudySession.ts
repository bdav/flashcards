import { useCallback, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { type useCardQueue } from './useCardQueue';

type StudyState =
  | { phase: 'idle' }
  | { phase: 'answering' }
  | {
      phase: 'result';
      result: 'correct' | 'incorrect';
      userAnswer: string;
    }
  | { phase: 'complete' };

export function useStudySession(
  deckId: string | undefined,
  cardQueue: ReturnType<typeof useCardQueue>,
) {
  const [studyState, setStudyState] = useState<StudyState>({ phase: 'idle' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startSession = trpc.study.startSession.useMutation({
    onSuccess: (session) => {
      setError(null);
      setSessionId(session.id);
      setAnswerInput('');
      cardQueue.reset();
      setStudyState({ phase: 'answering' });
    },
    onError: () => {
      setError('Failed to start study session. Please try again.');
    },
  });

  const submitAttempt = trpc.study.submitAttempt.useMutation();
  const finishSession = trpc.study.finishSession.useMutation();

  function handleStart() {
    if (!deckId) return;
    startSession.mutate({ deckId });
  }

  async function handleSubmitAnswer() {
    if (studyState.phase !== 'answering' || !sessionId) return;
    if (!answerInput.trim()) return;

    try {
      setError(null);
      const card = cardQueue.currentCard;
      if (!card) return;

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

    const requeue = studyState.result === 'incorrect';
    const remainingAfterAdvance =
      cardQueue.queue.length - 1 + (requeue ? 1 : 0);

    if (remainingAfterAdvance === 0) {
      try {
        await finishSession.mutateAsync({ id: sessionId });
      } catch (err) {
        console.error('Failed to finish study session:', err);
      }
      cardQueue.advance(requeue);
      setStudyState({ phase: 'complete' });
    } else {
      cardQueue.advance(requeue);
      setAnswerInput('');
      setStudyState({ phase: 'answering' });
    }
  }, [studyState, sessionId, cardQueue, finishSession]);

  useEffect(() => {
    if (studyState.phase !== 'result') return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [studyState.phase, handleNext]);

  return {
    studyState,
    answerInput,
    setAnswerInput,
    error,
    handleStart,
    handleSubmitAnswer,
    handleNext,
  };
}
