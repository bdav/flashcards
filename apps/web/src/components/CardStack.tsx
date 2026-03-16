import { type ReactNode } from 'react';

interface CardStackProps {
  queueLength: number;
  children: ReactNode;
  progress?: string;
  className?: string;
  onClick?: () => void;
}

export function CardStack({
  queueLength,
  children,
  progress,
  className,
  onClick,
}: CardStackProps) {
  return (
    <div
      className={`relative w-full max-w-md rounded-b-xl rounded-t-3xl border-border pt-3 ${className ?? ''}`}
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
      {queueLength > 2 && (
        <div className="absolute inset-x-2 top-0 h-4 rounded-t-xl border border-b-0 border-inherit bg-white shadow-sm" />
      )}
      {queueLength > 1 && (
        <div className="absolute inset-x-1 top-1.5 h-4 rounded-t-xl border border-b-0 border-inherit bg-white shadow-sm" />
      )}
      <div className="relative flex aspect-3/2 w-full flex-col items-center justify-center rounded-xl border border-inherit bg-white p-8 shadow-md">
        {children}
        {progress && (
          <span className="absolute bottom-3 right-4 text-xs text-soft-muted-foreground">
            {progress}
          </span>
        )}
      </div>
    </div>
  );
}
