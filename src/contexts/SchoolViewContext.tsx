import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'coaching' | 'school';

const SchoolViewContext = createContext<{
  view: ViewMode;
  setView: (v: ViewMode) => void;
}>({ view: 'coaching', setView: () => {} });

export function SchoolViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>('coaching');
  return (
    <SchoolViewContext.Provider value={{ view, setView }}>
      {children}
    </SchoolViewContext.Provider>
  );
}

export const useSchoolView = () => useContext(SchoolViewContext);
