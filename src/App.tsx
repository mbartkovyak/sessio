import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet, Navigate } from "react-router-dom";
import NavigationLoadingBar from "@/components/layout/NavigationLoadingBar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { useAutoRegisterPush } from "@/hooks/shared/useAutoRegisterPush";
import { useNativePush } from "@/hooks/shared/useNativePush";
import { useVisualViewport } from "@/hooks/shared/useVisualViewport";
import { useSentryPageContext } from "@/hooks/shared/useSentryPageContext";
import { lazy, Suspense, useEffect, ComponentType } from "react";
import { useLocation } from "react-router-dom";
import { SessioLoader } from "@/components/SessioLogo";
import PullToRefresh from "@/components/shared/PullToRefresh";

// Both hooks early-return on the wrong platform (useAutoRegisterPush skips
// on native, useNativePush skips on web). One device = one push path.
function PushRegistrar() { useAutoRegisterPush(); useNativePush(); return null; }
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
  useSentryPageContext();
  const { pathname } = useLocation();
  // Landing is light-themed and paints its own top area — the app's dark header strip doesn't belong there.
  const isLanding = pathname === '/' || pathname === '/welcome';
  return (
    <>
      {/* Persistent dark strip behind the fixed header — prevents light bg flash between route transitions */}
      {!isLanding && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[9] header-gradient rounded-b-2xl px-4 py-4" aria-hidden="true"><div className="h-5" /></div>
      )}
      <NavigationLoadingBar />
      <ScrollToTop />
      <RefreshOnResume />
      <PullToRefresh />
      <ErrorBoundary>
        <AuthProvider>
          <PushRegistrar />
          <PrefetchRoutes />
          <div className="relative z-[9]" style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}><Outlet /></div>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}

// Auth pages — static (critical path, always needed first)
import Landing from "./pages/auth/Landing";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthCallback from "./pages/auth/AuthCallback";

// Retry wrapper: auto-reloads on stale chunk errors after deploy
function lazyRetry(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch(() => {
      const key = 'chunk-retry';
      const last = sessionStorage.getItem(key);
      if (!last || Date.now() - Number(last) > 10_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // never resolves — page reloads
      }
      return Promise.reject(new Error('Failed to load page'));
    })
  );
}

// All other pages — lazy loaded
const Onboarding = lazyRetry(() => import("./pages/auth/Onboarding"));
const Questionnaire = lazyRetry(() => import("./pages/onboarding/Questionnaire"));
const JoinTraining = lazyRetry(() => import("./pages/shared/JoinTraining"));
const JoinSchool = lazyRetry(() => import("./pages/shared/JoinSchool"));
const NotFound = lazyRetry(() => import("./pages/shared/NotFound"));
const PrivacyPolicy = lazyRetry(() => import("./pages/shared/PrivacyPolicy"));
const TermsOfService = lazyRetry(() => import("./pages/shared/TermsOfService"));
const PlayerHome = lazyRetry(() => import("./pages/player/PlayerHome"));
const PlayerSearch = lazyRetry(() => import("./pages/player/PlayerSearch"));
const CoachPublicProfile = lazyRetry(() => import("./pages/player/CoachPublicProfile"));
const CoachSchedule = lazyRetry(() => import("./pages/player/CoachSchedule"));
const SchoolPublicProfile = lazyRetry(() => import("./pages/player/SchoolPublicProfile"));
const SchoolSchedule = lazyRetry(() => import("./pages/player/SchoolSchedule"));
const PlayerCalendar = lazyRetry(() => import("./pages/player/PlayerCalendar"));
const PlayerProfile = lazyRetry(() => import("./pages/player/PlayerProfile"));
const PlayerMessages = lazyRetry(() => import("./pages/player/PlayerMessages"));
const PlayerChat = lazyRetry(() => import("./pages/player/PlayerChat"));
const PlayerDirectChat = lazyRetry(() => import("./pages/player/PlayerDirectChat"));
const PlayerTrainingDetail = lazyRetry(() => import("./pages/player/PlayerTrainingDetail"));
const PlayerPasses = lazyRetry(() => import("./pages/player/PlayerPasses"));
const CoachHome = lazyRetry(() => import("./pages/coach/CoachHome"));
const CoachCalendar = lazyRetry(() => import("./pages/coach/CoachCalendar"));
const CoachTrainings = lazyRetry(() => import("./pages/coach/CoachTrainings"));
const CreateTraining = lazyRetry(() => import("./pages/coach/CreateTraining"));
const TrainingDetail = lazyRetry(() => import("./pages/coach/TrainingDetail"));
const SessionDetail = lazyRetry(() => import("./pages/coach/SessionDetail"));
const CoachProfileEditor = lazyRetry(() => import("./pages/coach/CoachProfileEditor"));
const CoachMessages = lazyRetry(() => import("./pages/coach/CoachMessages"));
const DirectChat = lazyRetry(() => import("./pages/coach/DirectChat"));
const CoachStats = lazyRetry(() => import("./pages/coach/CoachStats"));
const CoachPasses = lazyRetry(() => import("./pages/coach/CoachPasses"));
const SchoolCoaches = lazyRetry(() => import("./pages/coach/SchoolCoaches"));
const CoachAthletes = lazyRetry(() => import("./pages/coach/CoachAthletes"));
const SchoolProfileEditor = lazyRetry(() => import("./pages/school/SchoolProfileEditor"));

function LazyPage({ component: Component }: { component: React.LazyExoticComponent<any> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Component />
    </Suspense>
  );
}

function PrefetchRoutes() {
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile) return;
    // Opportunistic prefetch — swallow errors (stale chunks after deploy).
    // Actual navigation uses lazyRetry which handles reload.
    const noop = () => {};
    if (profile.role === 'player') {
      import('./pages/player/PlayerHome').catch(noop);
      import('./pages/player/PlayerSearch').catch(noop);
      import('./pages/player/PlayerCalendar').catch(noop);
      import('./pages/player/PlayerProfile').catch(noop);
      import('./pages/player/PlayerMessages').catch(noop);
    } else {
      import('./pages/coach/CoachHome').catch(noop);
      import('./pages/coach/CoachCalendar').catch(noop);
      import('./pages/coach/CoachTrainings').catch(noop);
      import('./pages/coach/CoachMessages').catch(noop);
      import('./pages/coach/CoachProfileEditor').catch(noop);
    }
  }, [profile?.role]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — data stays fresh, realtime + RefreshOnResume handle updates
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days — must be ≥ persister maxAge so rehydrated queries aren't gc'd
      refetchOnWindowFocus: false, // no refetch on tab switch
      retry: 1,                    // fail fast
    },
  },
});

// Persist the query cache to localStorage so cold starts hydrate instantly
// with last-known data while a background refetch confirms it. Lives across
// app launches; cleared on signOut() in AuthContext to prevent leaking the
// previous user's data into the next sign-in.
const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'sessio_query_cache',
});

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/sign-up" element={<SignUp />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={<LazyPage component={Onboarding} />} />
      <Route path="/onboarding/questionnaire" element={<LazyPage component={Questionnaire} />} />
      <Route path="/join/:inviteCode" element={<LazyPage component={JoinTraining} />} />
      <Route path="/join-school/:code" element={<LazyPage component={JoinSchool} />} />
      <Route path="/s/:id" element={<LazyPage component={SchoolPublicProfile} />} />
      <Route path="/s/:id/schedule" element={<LazyPage component={SchoolSchedule} />} />
      <Route path="/privacy" element={<LazyPage component={PrivacyPolicy} />} />
      <Route path="/terms" element={<LazyPage component={TermsOfService} />} />

      {/* Player routes */}
      <Route path="/player" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerHome} /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerSearch} /></ProtectedRoute>} />
      <Route path="/search/coach/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={CoachPublicProfile} /></ProtectedRoute>} />
      <Route path="/search/coach/:id/passes" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerPasses} /></ProtectedRoute>} />
      <Route path="/search/coach/:id/schedule" element={<ProtectedRoute requiredRole="player"><LazyPage component={CoachSchedule} /></ProtectedRoute>} />
      <Route path="/search/school/:id" element={<ProtectedRoute requiredRole="player"><LazyPage component={SchoolPublicProfile} /></ProtectedRoute>} />
      <Route path="/search/school/:id/passes" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerPasses} /></ProtectedRoute>} />
      <Route path="/s/:id/passes" element={<ProtectedRoute requiredRole="player"><LazyPage component={PlayerPasses} /></ProtectedRoute>} />
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
      <Route path="/coach/sessions/:id" element={<ProtectedRoute requiredRole="coach"><LazyPage component={SessionDetail} /></ProtectedRoute>} />
      <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachProfileEditor} /></ProtectedRoute>} />
      <Route path="/coach/stats" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachStats} /></ProtectedRoute>} />
      <Route path="/coach/passes" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachPasses} /></ProtectedRoute>} />
      <Route path="/coach/coaches" element={<ProtectedRoute requiredRole="coach"><LazyPage component={SchoolCoaches} /></ProtectedRoute>} />
      <Route path="/coach/athletes" element={<ProtectedRoute requiredRole="coach"><LazyPage component={CoachAthletes} /></ProtectedRoute>} />

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
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: queryPersister,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — older persisted entries are dropped on rehydration
      buster: 'v1',                // bump to invalidate every cache (e.g. after a schema change)
    }}
  >
    <TooltipProvider>
      <Toaster />
      <RouterProvider router={router} />
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
