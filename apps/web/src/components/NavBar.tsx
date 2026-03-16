import { Link } from 'react-router-dom';
import { Home, BarChart3 } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="flex items-center gap-4 px-8 py-4">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-soft-foreground"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
        Home
      </Link>
      <Link
        to="/stats"
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-soft-foreground"
      >
        <BarChart3 className="h-4 w-4" />
        Stats
      </Link>
    </nav>
  );
}
