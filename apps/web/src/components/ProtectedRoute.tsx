import { Navigate, Outlet } from 'react-router-dom';
import { trpc } from '@/lib/trpc';

export function ProtectedRoute() {
  const { data, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
