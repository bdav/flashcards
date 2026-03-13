import { type ReactNode } from 'react';

interface CardStackProps {
  queueLength: number;
  children: ReactNode;
}

export function CardStack({ queueLength, children }: CardStackProps) {
  return (
    <div className="relative w-full max-w-md pt-3">
      {queueLength > 2 && (
        <div className="absolute inset-x-2 top-0 h-4 rounded-t-xl border-2 border-b-0 bg-white shadow-sm" />
      )}
      {queueLength > 1 && (
        <div className="absolute inset-x-1 top-1.5 h-4 rounded-t-xl border-2 border-b-0 bg-white shadow-sm" />
      )}
      <div className="relative flex aspect-3/2 w-full flex-col items-center justify-center rounded-xl border-2 bg-white p-8 shadow-md">
        {children}
      </div>
    </div>
  );
}
