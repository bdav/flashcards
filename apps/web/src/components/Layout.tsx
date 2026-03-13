import { Link, Outlet } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ showHome = false }: { showHome?: boolean }) {
  return (
    <>
      {showHome && (
        <div className="fixed left-4 top-4 z-50">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/" aria-label="Home">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      )}
      <Outlet />
    </>
  );
}
