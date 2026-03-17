import { type ReactNode } from 'react';
import { CenteredPage } from '@/components/CenteredPage';

export function ErrorMessage({ action }: { action: ReactNode }) {
  return (
    <CenteredPage centered>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-4">{action}</div>
    </CenteredPage>
  );
}
