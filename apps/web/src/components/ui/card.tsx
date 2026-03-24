import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface rounded-xl border border-border-light shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}
