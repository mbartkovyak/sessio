import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationLoadingBar() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(60), 80);
    const t2 = setTimeout(() => setProgress(90), 200);
    const t3 = setTimeout(() => {
      setProgress(100);
      const t4 = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t4);
    }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 z-[100] h-0.5 pointer-events-none" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
