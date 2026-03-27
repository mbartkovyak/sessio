import type { ReactNode } from 'react';

interface PageHeaderProps {
  children: ReactNode;
  /** Use shrink-0 instead of sticky (for full-screen layouts like chat) */
  inline?: boolean;
  className?: string;
}

export default function PageHeader({ children, inline, className }: PageHeaderProps) {
  return (
    <header className={`${inline ? 'shrink-0' : 'sticky top-0 z-10'} header-gradient ${className ?? ''}`}>
      {children}
    </header>
  );
}
