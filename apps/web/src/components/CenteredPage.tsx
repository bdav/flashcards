import { type ReactNode } from 'react';

interface CenteredPageProps {
  children: ReactNode;
  centered?: boolean;
}

export function CenteredPage({
  children,
  centered = false,
}: CenteredPageProps) {
  return (
    <main
      className={`flex min-h-screen flex-col items-center px-4 py-8 ${centered ? 'justify-center' : ''}`}
    >
      {children}
    </main>
  );
}
