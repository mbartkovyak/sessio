import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet } from "react-router-dom";
import NavigationLoadingBar from "@/components/layout/NavigationLoadingBar";
import InstallPWA from "@/components/layout/InstallPWA";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAutoRegisterPush } from "@/hooks/shared/useAutoRegisterPush";
import { useVisualViewport } from "@/hooks/shared/useVisualViewport";
import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SessioLoader } from "@/components/SessioLogo";

function PushRegistrar() { useAutoRegisterPush(); return null; }
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
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
  useVisualViewport();
  return (
    <>
      <NavigationLoadingBar />
      <ScrollToTop />
      <RefreshOnResume />
      <InstallPWA />
      <ErrorBoundary>
        <AuthProvider>
          <PushRegistrar />
          <PrefetchRoutes />
          <Outlet />
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

// Auth pages — static (critical path, always needed first)
import Landing from "./pages/auth/Landing";
import Auth from "./pages/auth/Auth";
import AuthCallback from "./pages/auth/AuthCallback";

// All other pages — lazy loaded
const Onboarding = lazy(() => import("./pages/auth/Onboarding"));
const JoinTraining = lazy(() => import("./pages/shared/JoinTraining"));
const JoinSchool = lazy(() => import("./pages/shared/JoinSchool"));
const NotFound = lazy(() => import("./pages/shared/NotFound"));
const PlayerHome = lazy(() => import("./pages/player/PlayerHome"));
const PlayerSearch = lazy(() => import("./pages/player/PlayerSearch"));
const CoachPublicProfile = lazy(() => import("./pages/player/CoachPublicProfile"));
const SchoolPublicProfile = lazy(() => import("./pages/player/SchoolPublicProfile"));
const PlayerCalendar = lazy(() => import("./pages/player/PlayerCalendar"));
const PlayerProfile = lazy(() => import("./pages/player/PlayerProfile"));
const PlayerMessages = lazy(() => import("./pages/player/PlayerMessages"));
const PlayerChat = lazy(() => import("./pages/player/PlayerChat"));
const PlayerDirectChat = lazy(() => import("./pages/player/PlayerDirectChat"));
const PlayerTrainingDetail = lazy(() => import("./pages/player/PlayerTrainingDetail"));
const CoachHome = lazy(() => import("./pages/coach/CoachHome"));
const CoachCalendar = lazy(() => import("./pages/coach/CoachCalendar"));
const CoachTrainings = lazy(() => import("./pages/coach/CoachTrainings"));
const CreateTraining = lazy(() => import("./pages/coach/CreateTraining"));
const TrainingDetail = lazy(() => import("./pages/coach/TrainingDetail"));
const CoachProfileEditor = lazy(() => import("./pages/coach/CoachProfileEditor"));
const CoachMessages = lazy(() => import("./pages/coach/CoachMessages"));
const DirectChat = lazy(() => import("./pages/coach/DirectChat"));
const CoachStats = lazy(() => import("./pages/coach/CoachStats"));
const SchoolProfileEditor = lazy(() => import("./pages/school/SchoolProfileEditor"));

function LazyPage({ component: Component }: { component: React.LazyExoticComponent<any> }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SessioLoader />
      </div>
    }>
      <Component />
    </Suspense>
  );
}

function PrefetchRoutes() {
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile) return;
    if (profile.role === 'player') {
      import('./pages/player/PlayerHome');
      import('./pages/player/PlayerSearch');
      import('./pages/player/PlayerCalendar');
      import('./pages/player/PlayerProfile');
      import('./pages/player/PlayerMessages');
    } else {
      import('./pages/coach/CoachHome');
      import('./pages/coach/CoachCalendar');
      import('./pages/coach/CoachTrainings');
      import('./pages/coach/CoachMessages');
      import('./pages/coach/CoachProfileEditor');
    }
  }, [profile?.role]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — data stays fresh, realtime + RefreshOnResume handle updates
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
      <Route path="/onboarding" element={<LazyPage component={Onboarding} />} />
      <Route path="/join/:inviteCode" element={<LazyPage component={JoinTraining} />} />
      <Route path="/join-school/:code" element={<LazyPage component={JoinSchool} />} />
      <Route path="/s/:id" element={<LazyPage component={SchoolPublicProfile} />} />

      {/* Player routes */}
      <Route path="/player" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerHome} /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerSearch} /></ProtectedRoute>} />
      <Route path="/search/coach/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={CoachPublicProfile} /></ProtectedRoute>} />
      <Route path="/search/school/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={SchoolPublicProfile} /></ProtectedRoute>} />
      <Route path="/player/messages" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerMessages} /></ProtectedRoute>} />
      <Route path="/player/messages/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerChat} /></ProtectedRoute>} />
      <Route path="/player/dm/:userId" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerDirectChat} /></ProtectedRoute>} />
      <Route path="/player/training/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerTrainingDetail} /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerCalendar} /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerProfile} /></ProtectedRoute>} />

      {/* Coach routes */}
      <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachHome} /></ProtectedRoute>} />
      <Route path="/coach/calendar" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachCalendar} /></ProtectedRoute>} />
      <Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachMessages} /></ProtectedRoute>} />
      <Route path="/coach/dm/:userId" element={<ProtectedRoute requiredRole="coach"><LazyPage component={DirectChat} /></ProtectedRoute>} />
      <Route path="/coach/trainings" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachTrainings} /></ProtectedRoute>} />
      <Route path="/coach/trainings/new" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CreateTraining} /></ProtectedRoute>} />
      <Route path="/coach/trainings/:id" element={<ProtectedRoute requiredRole="coach"><LazyPage component={TrainingDetail} /></ProtectedRoute>} />
      <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachProfileEditor} /></ProtectedRoute>} />
      <Route path="/coach/stats" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachStats} /></ProtectedRoute>} />

      {/* School routes */}
      <Route path="/school/profile" element={<ProtectedRoute requiredRole="school_owner"><LazyPage component={SchoolProfileEditor} /></ProtectedRoute>} />

      {/* Legacy redirect support */}
      <Route path="/player/dashboard" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerHome} /></ProtectedRoute>} />
      <Route path="/coach/dashboard" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachHome} /></ProtectedRoute>} />

      <Route path="*" element={<LazyPage component={NotFound} />} />
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
