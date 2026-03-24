import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks in-app navigation and browser close/refresh when there are unsaved changes.
 * Returns a blocker object — pass it to <UnsavedChangesDialog> to render the prompt.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const blocker = useBlocker(isDirty);

  // Browser close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return blocker;
}
