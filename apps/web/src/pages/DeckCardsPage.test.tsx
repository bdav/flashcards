import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeckCardsPage from './DeckCardsPage';
import { trpc } from '@/lib/trpc';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      card: { listByDeck: { invalidate: vi.fn() } },
      deck: { list: { invalidate: vi.fn() }, getById: { invalidate: vi.fn() } },
    })),
    deck: {
      getById: { useQuery: vi.fn() },
      update: { useMutation: vi.fn() },
      delete: { useMutation: vi.fn() },
    },
    card: {
      listByDeck: { useQuery: vi.fn() },
      create: { useMutation: vi.fn() },
      update: { useMutation: vi.fn() },
      delete: { useMutation: vi.fn() },
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

const defaultMutationReturn = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

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
    ...defaultMutationReturn,
  } as unknown as ReturnType<typeof trpc.card.importCsv.useMutation>);

  vi.mocked(trpc.card.update.useMutation).mockReturnValue({
    ...defaultMutationReturn,
  } as unknown as ReturnType<typeof trpc.card.update.useMutation>);

  vi.mocked(trpc.card.delete.useMutation).mockReturnValue({
    ...defaultMutationReturn,
  } as unknown as ReturnType<typeof trpc.card.delete.useMutation>);

  vi.mocked(trpc.deck.update.useMutation).mockReturnValue({
    ...defaultMutationReturn,
  } as unknown as ReturnType<typeof trpc.deck.update.useMutation>);

  vi.mocked(trpc.deck.delete.useMutation).mockReturnValue({
    ...defaultMutationReturn,
  } as unknown as ReturnType<typeof trpc.deck.delete.useMutation>);
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

  it('renders edit and delete buttons for each card', () => {
    setupMocks();
    renderDeckCardsPage();

    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    // Card-level delete buttons (excludes "Delete Deck" which has different text)
    const cardDeleteButtons = screen.getAllByRole('button', {
      name: /^delete$/i,
    });
    expect(editButtons).toHaveLength(2);
    expect(cardDeleteButtons).toHaveLength(2);
  });

  it('enters edit mode when edit button is clicked', async () => {
    setupMocks();
    const user = userEvent.setup();
    renderDeckCardsPage();

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    const frontInput = screen.getByDisplayValue('Capital of France');
    const backInput = screen.getByDisplayValue('Paris');
    expect(frontInput).toBeInTheDocument();
    expect(backInput).toBeInTheDocument();
    // Inline card save button appears (in addition to "Save Changes" for deck)
    const saveButtons = screen.getAllByRole('button', { name: /^save$/i });
    expect(saveButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls update mutation when save is clicked', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.update.useMutation).mockReturnValue({
      ...defaultMutationReturn,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof trpc.card.update.useMutation>);

    const user = userEvent.setup();
    renderDeckCardsPage();

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    const frontInput = screen.getByDisplayValue('Capital of France');
    await user.clear(frontInput);
    await user.type(frontInput, 'Capital of Italy');

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    // First save button is the inline card save
    await user.click(saveButtons[0]);

    expect(mockMutate).toHaveBeenCalledWith({
      cardId: 'card-1',
      front: 'Capital of Italy',
      back: 'Paris',
    });
  });

  it('cancels edit and restores original values', async () => {
    setupMocks();
    const user = userEvent.setup();
    renderDeckCardsPage();

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    const frontInput = screen.getByDisplayValue('Capital of France');
    await user.clear(frontInput);
    await user.type(frontInput, 'Something else');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.getByText('Capital of France')).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue('Something else'),
    ).not.toBeInTheDocument();
  });

  it('calls delete mutation when delete is confirmed', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.delete.useMutation).mockReturnValue({
      ...defaultMutationReturn,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof trpc.card.delete.useMutation>);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderDeckCardsPage();

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith({ cardId: 'card-1' });
  });

  it('does not delete when confirmation is cancelled', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.card.delete.useMutation).mockReturnValue({
      ...defaultMutationReturn,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof trpc.card.delete.useMutation>);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    renderDeckCardsPage();

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('renders deck edit form with name and description', () => {
    setupMocks();
    renderDeckCardsPage();

    expect(
      screen.getByRole('heading', { name: /deck settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/deck name/i)).toHaveValue('World Capitals');
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('calls deck update mutation when deck name is changed', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.deck.update.useMutation).mockReturnValue({
      ...defaultMutationReturn,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof trpc.deck.update.useMutation>);

    const user = userEvent.setup();
    renderDeckCardsPage();

    const nameInput = screen.getByLabelText(/deck name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'European Capitals');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      id: 'deck-1',
      name: 'European Capitals',
    });
  });

  it('calls deck delete and navigates home when confirmed', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.deck.delete.useMutation).mockImplementation(
      (opts?: { onSuccess?: () => void }) => {
        return {
          ...defaultMutationReturn,
          mutate: vi.fn((...args: unknown[]) => {
            mockMutate(...args);
            opts?.onSuccess?.();
          }),
        } as unknown as ReturnType<typeof trpc.deck.delete.useMutation>;
      },
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderDeckCardsPage();

    await user.click(screen.getByRole('button', { name: /delete deck/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('delete'),
    );
    expect(mockMutate).toHaveBeenCalledWith({ id: 'deck-1' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('does not delete deck when confirmation is cancelled', async () => {
    setupMocks();
    const mockMutate = vi.fn();
    vi.mocked(trpc.deck.delete.useMutation).mockReturnValue({
      ...defaultMutationReturn,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof trpc.deck.delete.useMutation>);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    renderDeckCardsPage();

    await user.click(screen.getByRole('button', { name: /delete deck/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
