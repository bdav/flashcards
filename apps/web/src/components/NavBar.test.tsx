import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavBar } from './NavBar';
import { trpc } from '@/lib/trpc';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn(() => ({
      auth: { me: { invalidate: vi.fn() } },
    })),
    auth: {
      logout: { useMutation: vi.fn() },
    },
  },
}));

function renderNavBar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupMocks() {
  vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof trpc.auth.logout.useMutation>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('NavBar', () => {
  it('renders Home link pointing to /', () => {
    renderNavBar();

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders Stats link pointing to /stats', () => {
    renderNavBar();

    const statsLink = screen.getByRole('link', { name: /stats/i });
    expect(statsLink).toHaveAttribute('href', '/stats');
  });

  it('renders a Log out button', () => {
    renderNavBar();

    expect(
      screen.getByRole('button', { name: /log out/i }),
    ).toBeInTheDocument();
  });

  it('calls logout mutation when Log out is clicked', async () => {
    const mockMutate = vi.fn();
    vi.mocked(trpc.auth.logout.useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof trpc.auth.logout.useMutation>);

    const user = userEvent.setup();
    renderNavBar();

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(mockMutate).toHaveBeenCalled();
  });
});
