import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'coaching' | 'school';

const SchoolViewContext = createContext<{
  view: ViewMode;
  setView: (v: ViewMode) => void;
}>({ view: 'coaching', setView: () => {} });

export function SchoolViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>(() => {
    return (localStorage.getItem('sessio_view') as ViewMode) || 'coaching';
  });

  function handleSetView(v: ViewMode) {
    setView(v);
    localStorage.setItem('sessio_view', v);
  }

  return (
    <SchoolViewContext.Provider value={{ view, setView: handleSetView }}>
      {children}
    </SchoolViewContext.Provider>
  );
}

export const useSchoolView = () => useContext(SchoolViewContext);
