import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './ProtectedRoute';
import { trpc } from '@/lib/trpc';

vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      me: { useQuery: vi.fn() },
    },
  },
}));

function renderWithRoute(initialEntry = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isLoading: false,
    } as unknown as ReturnType<typeof trpc.auth.me.useQuery>);

    renderWithRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: { user: null },
      isLoading: false,
    } as unknown as ReturnType<typeof trpc.auth.me.useQuery>);

    renderWithRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading state while checking auth', () => {
    vi.mocked(trpc.auth.me.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof trpc.auth.me.useQuery>);

    renderWithRoute();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
