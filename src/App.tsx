import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet } from "react-router-dom";
import NavigationLoadingBar from "@/components/layout/NavigationLoadingBar";
import InstallPWA from "@/components/layout/InstallPWA";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAutoRegisterPush } from "@/hooks/shared/useAutoRegisterPush";
import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export const ScrollContainerContext = createContext<React.RefObject<HTMLDivElement | null>>({ current: null });

function PushRegistrar() { useAutoRegisterPush(); return null; }
function ScrollToTop() {
  const { pathname } = useLocation();
  const scrollRef = useContext(ScrollContainerContext);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function RefreshOnResume() {
  useEffect(() => {
    let lastRefresh = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh < 10_000) return; // throttle: skip if < 10s since last refresh
      lastRefresh = now;
      queryClient.invalidateQueries();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
  return null;
}

function RootLayout() {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <ScrollContainerContext.Provider value={scrollRef}>
      <NavigationLoadingBar />
      <ScrollToTop />
      <RefreshOnResume />
      <InstallPWA />
      <div className="h-[100dvh] flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <PushRegistrar />
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
              <Outlet />
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </div>
    </ScrollContainerContext.Provider>
  );
}

// Auth pages
import Landing from "./pages/auth/Landing";
import Auth from "./pages/auth/Auth";
import AuthCallback from "./pages/auth/AuthCallback";
import Onboarding from "./pages/auth/Onboarding";

// Shared pages
import JoinTraining from "./pages/shared/JoinTraining";
import JoinSchool from "./pages/shared/JoinSchool";
import NotFound from "./pages/shared/NotFound";

// Player pages
import PlayerHome from "./pages/player/PlayerHome";
import PlayerSearch from "./pages/player/PlayerSearch";
import CoachPublicProfile from "./pages/player/CoachPublicProfile";
import SchoolPublicProfile from "./pages/player/SchoolPublicProfile";
import PlayerCalendar from "./pages/player/PlayerCalendar";
import PlayerProfile from "./pages/player/PlayerProfile";
import PlayerMessages from "./pages/player/PlayerMessages";
import PlayerChat from "./pages/player/PlayerChat";
import PlayerDirectChat from "./pages/player/PlayerDirectChat";

// Coach pages
import CoachHome from "./pages/coach/CoachHome";
import CoachCalendar from "./pages/coach/CoachCalendar";
import CoachTrainings from "./pages/coach/CoachTrainings";
import CreateTraining from "./pages/coach/CreateTraining";
import TrainingDetail from "./pages/coach/TrainingDetail";
import CoachProfileEditor from "./pages/coach/CoachProfileEditor";
import CoachMessages from "./pages/coach/CoachMessages";
import DirectChat from "./pages/coach/DirectChat";

// School pages
import SchoolDashboard from "./pages/school/SchoolDashboard";
import SchoolCalendar from "./pages/school/SchoolCalendar";
import SchoolCoaches from "./pages/school/SchoolCoaches";
import SchoolProfileEditor from "./pages/school/SchoolProfileEditor";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 min — data stays fresh, no refetch on mount
      gcTime: 10 * 60 * 1000,     // 10 min — keep unused cache in memory
      refetchOnWindowFocus: false, // mobile PWA: no refetch on tab switch
      retry: 1,                    // fail fast
    },
  },
});

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/join/:inviteCode" element={<JoinTraining />} />
      <Route path="/join-school/:code" element={<JoinSchool />} />
      <Route path="/s/:id" element={<SchoolPublicProfile />} />

      {/* Player routes */}
      <Route path="/player" element={<ProtectedRoute requiredRole="player"><PlayerHome /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute requiredRole="player"><PlayerSearch /></ProtectedRoute>} />
      <Route path="/search/coach/:id" element={<ProtectedRoute requiredRole="player"><CoachPublicProfile /></ProtectedRoute>} />
      <Route path="/search/school/:id" element={<ProtectedRoute requiredRole="player"><SchoolPublicProfile /></ProtectedRoute>} />
      <Route path="/player/messages" element={<ProtectedRoute requiredRole="player"><PlayerMessages /></ProtectedRoute>} />
      <Route path="/player/messages/:id" element={<ProtectedRoute requiredRole="player"><PlayerChat /></ProtectedRoute>} />
      <Route path="/player/dm/:userId" element={<ProtectedRoute requiredRole="player"><PlayerDirectChat /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requiredRole="player"><PlayerCalendar /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute requiredRole="player"><PlayerProfile /></ProtectedRoute>} />

      {/* Coach routes */}
      <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><CoachHome /></ProtectedRoute>} />
      <Route path="/coach/calendar" element={<ProtectedRoute requiredRole="coach"><CoachCalendar /></ProtectedRoute>} />
      <Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><CoachMessages /></ProtectedRoute>} />
      <Route path="/coach/dm/:userId" element={<ProtectedRoute requiredRole="coach"><DirectChat /></ProtectedRoute>} />
      <Route path="/coach/trainings" element={<ProtectedRoute requiredRole="coach"><CoachTrainings /></ProtectedRoute>} />
      <Route path="/coach/trainings/new" element={<ProtectedRoute requiredRole="coach"><CreateTraining /></ProtectedRoute>} />
      <Route path="/coach/trainings/:id" element={<ProtectedRoute requiredRole="coach"><TrainingDetail /></ProtectedRoute>} />
      <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><CoachProfileEditor /></ProtectedRoute>} />

      {/* School routes */}
      <Route path="/school" element={<ProtectedRoute requiredRole="school_owner"><SchoolDashboard /></ProtectedRoute>} />
      <Route path="/school/calendar" element={<ProtectedRoute requiredRole="school_owner"><SchoolCalendar /></ProtectedRoute>} />
      <Route path="/school/coaches" element={<ProtectedRoute requiredRole="school_owner"><SchoolCoaches /></ProtectedRoute>} />
      <Route path="/school/profile" element={<ProtectedRoute requiredRole="school_owner"><SchoolProfileEditor /></ProtectedRoute>} />

      {/* Legacy redirect support */}
      <Route path="/player/dashboard" element={<ProtectedRoute requiredRole="player"><PlayerHome /></ProtectedRoute>} />
      <Route path="/coach/dashboard" element={<ProtectedRoute requiredRole="coach"><CoachHome /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Route>
  )
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
