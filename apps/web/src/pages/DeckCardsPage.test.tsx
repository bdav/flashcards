import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeckCardsPage from './DeckCardsPage';
import { trpc } from '@/lib/trpc';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      card: { listByDeck: { invalidate: vi.fn() } },
    })),
    deck: {
      getById: { useQuery: vi.fn() },
    },
    card: {
      listByDeck: { useQuery: vi.fn() },
      create: { useMutation: vi.fn() },
      importCsv: { useMutation: vi.fn() },
    },
  },
}));

const mockCards = [
  {
    id: 'card-1',
    deckId: 'deck-1',
    front: 'Capital of France',
    back: 'Paris',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'card-2',
    deckId: 'deck-1',
    front: 'Capital of Germany',
    back: 'Berlin',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
];

function renderDeckCardsPage(deckId = 'deck-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards`]}>
        <Routes>
          <Route path="/decks/:deckId/cards" element={<DeckCardsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupMocks(overrides?: {
  cards?: typeof mockCards | [];
  deckLoading?: boolean;
  cardsLoading?: boolean;
  deckError?: boolean;
}) {
  vi.mocked(trpc.deck.getById.useQuery).mockReturnValue({
    data: overrides?.deckError
      ? undefined
      : { id: 'deck-1', name: 'World Capitals', cards: [] },
    isLoading: overrides?.deckLoading ?? false,
    isError: overrides?.deckError ?? false,
  } as ReturnType<typeof trpc.deck.getById.useQuery>);

  vi.mocked(trpc.card.listByDeck.useQuery).mockReturnValue({
    data: overrides?.cards ?? mockCards,
    isLoading: overrides?.cardsLoading ?? false,
    isError: false,
  } as ReturnType<typeof trpc.card.listByDeck.useQuery>);

  vi.mocked(trpc.card.create.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof trpc.card.create.useMutation>);

  vi.mocked(trpc.card.importCsv.useMutation).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof trpc.card.importCsv.useMutation>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeckCardsPage', () => {
  it('renders card table with existing cards', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(screen.getByText('Capital of France')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Capital of Germany')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('shows card count in heading', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(screen.getByText(/all cards \(2\)/i)).toBeInTheDocument();
  });

  it('renders empty state when deck has no cards', () => {
    setupMocks({ cards: [] });
    renderDeckCardsPage();

    expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setupMocks({ deckLoading: true });
    renderDeckCardsPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when deck fails to load', () => {
    setupMocks({ deckError: true });
    renderDeckCardsPage();

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('renders add-card form with front and back inputs', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(screen.getByPlaceholderText('Front')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('calls create mutation when add-card form is submitted', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.create.useMutation).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof trpc.card.create.useMutation>);

    const user = userEvent.setup();
    renderDeckCardsPage();

    await user.type(screen.getByPlaceholderText('Front'), 'Capital of Spain');
    await user.type(screen.getByPlaceholderText('Back'), 'Madrid');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      deckId: 'deck-1',
      front: 'Capital of Spain',
      back: 'Madrid',
    });
  });

  it('does not submit add-card form with empty fields', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.create.useMutation).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof trpc.card.create.useMutation>);

    const user = userEvent.setup();
    renderDeckCardsPage();

    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('renders CSV file input', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(screen.getByTestId('csv-file-input')).toBeInTheDocument();
  });

  it('calls importCsv mutation when CSV file is uploaded', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.importCsv.useMutation).mockImplementation(() => {
      return {
        mutate: mockMutate,
        mutateAsync: vi.fn(),
        isPending: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof trpc.card.importCsv.useMutation>;
    });

    const user = userEvent.setup();
    renderDeckCardsPage();

    const csvContent = 'front,back\nCapital of Spain,Madrid\n';
    const file = new File([csvContent], 'cards.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('csv-file-input');

    await user.upload(fileInput, file);

    // FileReader is async, wait for the mutate call
    await vi.waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        deckId: 'deck-1',
        csvContent,
      });
    });
  });

  it('shows success message after CSV import', async () => {
    setupMocks();
    let onSuccessCallback:
      | ((data: { importedCount: number }) => void)
      | undefined;
    vi.mocked(trpc.card.importCsv.useMutation).mockImplementation(
      (opts?: { onSuccess?: (data: { importedCount: number }) => void }) => {
        onSuccessCallback = opts?.onSuccess;
        return {
          mutate: vi.fn(() => {
            onSuccessCallback?.({ importedCount: 3 });
          }),
          mutateAsync: vi.fn(),
          isPending: false,
          isError: false,
          error: null,
        } as unknown as ReturnType<typeof trpc.card.importCsv.useMutation>;
      },
    );

    const user = userEvent.setup();
    renderDeckCardsPage();

    const file = new File(['front,back\na,b\n'], 'cards.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByTestId('csv-file-input'), file);

    await vi.waitFor(() => {
      expect(screen.getByText(/imported 3 cards/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for bad CSV input', async () => {
    setupMocks();
    vi.mocked(trpc.card.importCsv.useMutation).mockImplementation(
      (opts?: { onError?: (err: { message: string }) => void }) => {
        return {
          mutate: vi.fn(() => {
            opts?.onError?.({
              message: 'CSV must have "front" and "back" headers',
            });
          }),
          mutateAsync: vi.fn(),
          isPending: false,
          isError: false,
          error: null,
        } as unknown as ReturnType<typeof trpc.card.importCsv.useMutation>;
      },
    );

    const user = userEvent.setup();
    renderDeckCardsPage();

    const file = new File(['bad,headers\na,b\n'], 'cards.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByTestId('csv-file-input'), file);

    await vi.waitFor(() => {
      expect(
        screen.getByText('CSV must have "front" and "back" headers'),
      ).toBeInTheDocument();
    });
  });

  it('renders deck header with Cards tab active', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(
      screen.getByRole('heading', { name: /world capitals/i }),
    ).toBeInTheDocument();
    const cardsTab = screen.getByRole('tab', { name: /cards/i });
    expect(cardsTab).toHaveAttribute('aria-selected', 'true');
  });
});
