import { type ReactNode } from 'react';

interface DeckCardProps {
  stackCount: number;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DeckCard({
  stackCount,
  children,
  className,
  onClick,
}: DeckCardProps) {
  return (
    <div
      className={`relative w-full rounded-b-xl rounded-t-3xl border-border pt-3 ${className ?? ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {stackCount > 2 && (
        <div className="absolute inset-x-2 top-0 h-4 rounded-t-xl border border-b-0 border-inherit bg-white shadow-sm" />
      )}
      {stackCount > 1 && (
        <div className="absolute inset-x-1 top-1.5 h-4 rounded-t-xl border border-b-0 border-inherit bg-white shadow-sm" />
      )}
      <div className="relative flex aspect-3/2 w-full flex-col items-center justify-center rounded-xl border border-inherit bg-white p-4 shadow-md">
        {children}
      </div>
    </div>
  );
}
