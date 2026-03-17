import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { AppProviders } from './providers';
import { router } from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </AppProviders>
    </ErrorBoundary>
  );
}
