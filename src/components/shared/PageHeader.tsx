import { type ReactNode, useRef, useState, useEffect } from 'react';

interface PageHeaderProps {
  children: ReactNode;
  /** Use shrink-0 instead of fixed (for full-screen layouts like chat) */
  inline?: boolean;
  className?: string;
}

export default function PageHeader({ children, inline, className }: PageHeaderProps) {
  const ref = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (inline || !ref.current) return;
    const el = ref.current;
    setHeight(el.getBoundingClientRect().height);
    const obs = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    obs.observe(el);
    return () => obs.disconnect();
  }, [inline]);

  if (inline) {
    return (
      <header className={`shrink-0 header-gradient ${className ?? ''}`}>
        {children}
      </header>
    );
  }

  const hasRounded = className?.includes('rounded-b');

  return (
    <>
      <header
        ref={ref}
        className={`fixed left-0 right-0 z-10 header-gradient ${className ?? ''}`}
        style={{ top: 'var(--vv-offset, 0px)', ...(hasRounded ? { borderBottom: 'none' } : {}) }}
      >
        {children}
      </header>
      {height > 0 && <div style={{ height }} aria-hidden="true" />}
    </>
  );
}
