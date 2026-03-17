import { useRouteError, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ErrorMessage';

export function RouteErrorFallback() {
  const error = useRouteError();
  console.error('Route error:', error);

  return (
    <ErrorMessage
      action={
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      }
    />
  );
}
