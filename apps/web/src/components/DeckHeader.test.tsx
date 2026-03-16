import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeckHeader } from './DeckHeader';

function renderDeckHeader(
  deckName: string,
  deckId: string,
  activeTab: 'study' | 'stats',
) {
  return render(
    <MemoryRouter>
      <DeckHeader deckName={deckName} deckId={deckId} activeTab={activeTab} />
    </MemoryRouter>,
  );
}

describe('DeckHeader', () => {
  it('renders the deck name as a heading', () => {
    renderDeckHeader('World Capitals', 'deck-1', 'study');

    expect(
      screen.getByRole('heading', { name: /world capitals/i }),
    ).toBeInTheDocument();
  });

  it('renders Study and Stats tabs', () => {
    renderDeckHeader('World Capitals', 'deck-1', 'study');

    expect(screen.getByRole('tab', { name: /study/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stats/i })).toBeInTheDocument();
  });

  it('passes activeTab to DeckTabs', () => {
    renderDeckHeader('World Capitals', 'deck-1', 'stats');

    expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /study/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});
