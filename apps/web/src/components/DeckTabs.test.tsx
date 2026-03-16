import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeckTabs } from './DeckTabs';

function renderDeckTabs(deckId: string, activeTab: 'study' | 'stats') {
  return render(
    <MemoryRouter>
      <DeckTabs deckId={deckId} activeTab={activeTab} />
    </MemoryRouter>,
  );
}

describe('DeckTabs', () => {
  it('renders Study and Stats tabs', () => {
    renderDeckTabs('deck-1', 'study');

    expect(screen.getByRole('tab', { name: /study/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stats/i })).toBeInTheDocument();
  });

  it('links Study tab to /decks/:deckId', () => {
    renderDeckTabs('deck-1', 'study');

    expect(screen.getByRole('tab', { name: /study/i })).toHaveAttribute(
      'href',
      '/decks/deck-1',
    );
  });

  it('links Stats tab to /decks/:deckId/stats', () => {
    renderDeckTabs('deck-1', 'stats');

    expect(screen.getByRole('tab', { name: /stats/i })).toHaveAttribute(
      'href',
      '/decks/deck-1/stats',
    );
  });

  it('marks Study tab as active when activeTab is study', () => {
    renderDeckTabs('deck-1', 'study');

    const studyTab = screen.getByRole('tab', { name: /study/i });
    const statsTab = screen.getByRole('tab', { name: /stats/i });

    expect(studyTab).toHaveAttribute('aria-selected', 'true');
    expect(statsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('marks Stats tab as active when activeTab is stats', () => {
    renderDeckTabs('deck-1', 'stats');

    const studyTab = screen.getByRole('tab', { name: /study/i });
    const statsTab = screen.getByRole('tab', { name: /stats/i });

    expect(studyTab).toHaveAttribute('aria-selected', 'false');
    expect(statsTab).toHaveAttribute('aria-selected', 'true');
  });
});
