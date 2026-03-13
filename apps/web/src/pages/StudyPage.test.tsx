import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudyPage from './StudyPage';
import { trpc } from '@/lib/trpc';

// Mock tRPC hooks
vi.mock('@/lib/trpc', () => ({
  trpc: {
    deck: {
      getById: {
        useQuery: vi.fn(),
      },
    },
    study: {
      startSession: { useMutation: vi.fn() },
      submitAttempt: { useMutation: vi.fn() },
      finishSession: { useMutation: vi.fn() },
    },
  },
}));

const mockDeck = {
  id: 'deck-1',
  name: 'Test Deck',
  userId: 'user-1',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  cards: [
    {
      id: 'card-1',
      deckId: 'deck-1',
      front: 'What is 2+2?',
      back: '4',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'card-2',
      deckId: 'deck-1',
      front: 'Capital of France?',
      back: 'Paris',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

function renderStudyPage(deckId = 'deck-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
        <Routes>
          <Route path="/decks/:deckId/study" element={<StudyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupMocksWithStartSession(resultOverride?: 'correct' | 'incorrect') {
  vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
    data: mockDeck,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof trpc.deck.getById.useQuery>);

  vi.mocked(trpc.study.startSession.useMutation).mockImplementation(
    (opts?: { onSuccess?: (data: { id: string }) => void }) => {
      return {
        mutate: vi.fn(() => {
          opts?.onSuccess?.({ id: 'session-1' });
        }),
        mutateAsync: vi.fn(),
      } as unknown as ReturnType<typeof trpc.study.startSession.useMutation>;
    },
  );

  vi.mocked(trpc.study.submitAttempt.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn((args) => {
      return Promise.resolve({
        id: 'attempt-1',
        studySessionId: args.studySessionId,
        cardId: args.cardId,
        userAnswer: args.userAnswer,
        result: resultOverride ?? ('correct' as const),
        createdAt: new Date(),
      });
    }),
  } as unknown as ReturnType<typeof trpc.study.submitAttempt.useMutation>);

  vi.mocked(trpc.study.finishSession.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn((args) => {
      return Promise.resolve({
        id: args.id,
        endedAt: new Date(),
        userId: 'user-1',
        deckId: 'deck-1',
        startedAt: new Date(),
      });
    }),
  } as unknown as ReturnType<typeof trpc.study.finishSession.useMutation>);
}

function setupBasicMocks() {
  vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
    data: mockDeck,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof trpc.deck.getById.useQuery>);

  vi.mocked(trpc.study.startSession.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof trpc.study.startSession.useMutation>);

  vi.mocked(trpc.study.submitAttempt.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof trpc.study.submitAttempt.useMutation>);

  vi.mocked(trpc.study.finishSession.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof trpc.study.finishSession.useMutation>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StudyPage', () => {
  it('shows deck name and start button before studying', () => {
    setupBasicMocks();
    renderStudyPage();
    expect(
      screen.getByRole('heading', { name: /test deck/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start studying/i }),
    ).toBeInTheDocument();
  });

  it('shows card front and answer input after starting', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));

    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    // Correct answer should not be visible yet
    expect(screen.queryByTestId('correct-answer')).not.toBeInTheDocument();
  });

  it('shows correct result with question and answer on card', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '4');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Correct!');
    });
    // Card shows both question and correct answer
    const answerArea = screen.getByTestId('correct-answer');
    expect(answerArea).toHaveTextContent('What is 2+2?');
    expect(answerArea).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows incorrect result after submitting wrong answer', async () => {
    setupMocksWithStartSession('incorrect');

    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '5');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Incorrect');
    });
    const answerArea = screen.getByTestId('correct-answer');
    expect(answerArea).toHaveTextContent('4');
  });

  it('submits answer on Enter key press', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '4{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Correct!');
    });
  });

  it('advances to next card on Enter key during result phase', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '4');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Correct!');
    });

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('shows progress indicator during study', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('advances to next card after clicking Next', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '4');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('re-queues incorrect cards to the back of the deck', async () => {
    setupMocksWithStartSession('incorrect');
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));

    // Answer first card incorrectly
    await user.type(screen.getByRole('textbox'), 'wrong');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Incorrect');
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Should advance to second card
    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });

    // Answer second card incorrectly
    await user.type(screen.getByRole('textbox'), 'wrong');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Incorrect');
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    // First card should reappear (it was re-queued)
    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });
  });

  it('shows session complete after answering all cards', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    // Card 1
    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.type(screen.getByRole('textbox'), '4');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Card 2
    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });
    await user.type(screen.getByRole('textbox'), 'Paris');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /session complete/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/you studied all 2 cards/i)).toBeInTheDocument();
  });

  it('does not submit when answer is empty', async () => {
    setupMocksWithStartSession();
    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Should still be on the same card, no result shown
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(
      vi.mocked(trpc.study.submitAttempt.useMutation).mock.results[0]?.value
        .mutateAsync,
    ).not.toHaveBeenCalled();
  });

  it('shows error state when deck query fails', () => {
    setupBasicMocks();
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/error loading deck/i)).toBeInTheDocument();
  });

  it('shows empty deck message when deck has no cards', () => {
    setupBasicMocks();
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: { ...mockDeck, cards: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/this deck has no cards/i)).toBeInTheDocument();
  });

  it('shows loading state while deck is loading', () => {
    setupBasicMocks();
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/loading deck/i)).toBeInTheDocument();
  });
});
