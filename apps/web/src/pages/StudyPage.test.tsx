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

// Helpers to set up mock return values
let startSessionCallback: ((args: { deckId: string }) => void) | undefined;
let submitAttemptCallback:
  | ((args: { studySessionId: string; cardId: string; result: string }) => void)
  | undefined;
let finishSessionCallback: ((args: { id: string }) => void) | undefined;

function setupMocks() {
  startSessionCallback = undefined;
  submitAttemptCallback = undefined;
  finishSessionCallback = undefined;

  vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
    data: mockDeck,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof trpc.deck.getById.useQuery>);

  vi.mocked(trpc.study.startSession.useMutation).mockReturnValue({
    mutate: vi.fn((args: { deckId: string }) => {
      startSessionCallback?.(args);
    }),
    mutateAsync: vi.fn(),
  } as unknown as ReturnType<typeof trpc.study.startSession.useMutation>);

  vi.mocked(trpc.study.submitAttempt.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn((args) => {
      submitAttemptCallback?.(args);
      return Promise.resolve({
        id: 'attempt-1',
        ...args,
        createdAt: new Date(),
      });
    }),
  } as unknown as ReturnType<typeof trpc.study.submitAttempt.useMutation>);

  vi.mocked(trpc.study.finishSession.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn((args) => {
      finishSessionCallback?.(args);
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

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('StudyPage', () => {
  it('shows deck name and start button before studying', () => {
    renderStudyPage();
    expect(
      screen.getByRole('heading', { name: /test deck/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start studying/i }),
    ).toBeInTheDocument();
  });

  it('shows card front and hides answer initially after starting', async () => {
    // Make startSession invoke the onSuccess callback
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

    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));

    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.queryByTestId('answer')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reveal answer/i }),
    ).toBeInTheDocument();
  });

  it('shows the answer after clicking reveal', async () => {
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

    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));

    expect(screen.getByTestId('answer')).toHaveTextContent('4');
    expect(
      screen.getByRole('button', { name: /^correct$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^incorrect$/i }),
    ).toBeInTheDocument();
  });

  it('shows progress indicator during study', async () => {
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

    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('advances to next card after answering correct', async () => {
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

    const user = userEvent.setup();
    renderStudyPage();

    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    await user.click(screen.getByRole('button', { name: /^correct$/i }));

    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('shows session complete after answering all cards', async () => {
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

    const user = userEvent.setup();
    renderStudyPage();

    // Card 1
    await user.click(screen.getByRole('button', { name: /start studying/i }));
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    await user.click(screen.getByRole('button', { name: /^correct$/i }));

    // Card 2
    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    await user.click(screen.getByRole('button', { name: /^incorrect$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /session complete/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/you studied all 2 cards/i)).toBeInTheDocument();
  });

  it('shows error state when deck query fails', () => {
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/error loading deck/i)).toBeInTheDocument();
  });

  it('shows empty deck message when deck has no cards', () => {
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: { ...mockDeck, cards: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/this deck has no cards/i)).toBeInTheDocument();
  });

  it('shows loading state while deck is loading', () => {
    vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof trpc.deck.getById.useQuery>);

    renderStudyPage();
    expect(screen.getByText(/loading deck/i)).toBeInTheDocument();
  });
});
