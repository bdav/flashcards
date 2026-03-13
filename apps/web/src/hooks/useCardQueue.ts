import { useState, useCallback } from 'react';

type Card = { id: string; front: string; back: string };

export function useCardQueue(cards: Card[]) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [cardsStudied, setCardsStudied] = useState(0);

  const currentCard = queue[0] ?? null;

  const reset = useCallback(() => {
    setQueue([...cards]);
    setCardsStudied(0);
  }, [cards]);

  const advance = useCallback((requeue: boolean) => {
    setQueue((prev) => {
      const [current, ...remaining] = prev;
      if (requeue && current) {
        remaining.push(current);
      }
      return remaining;
    });
    setCardsStudied((prev) => prev + 1);
  }, []);

  return {
    queue,
    currentCard,
    cardsStudied,
    reset,
    advance,
  };
}
