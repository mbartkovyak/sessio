import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavigationLoadingBar from "@/components/NavigationLoadingBar";
import InstallPWA from "@/components/InstallPWA";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

// Join flow
import JoinTraining from "./pages/JoinTraining";

// Player pages
import PlayerHome from "./pages/player/PlayerHome";
import PlayerSearch from "./pages/player/PlayerSearch";
import CoachPublicProfile from "./pages/player/CoachPublicProfile";
import SchoolPublicProfile from "./pages/player/SchoolPublicProfile";
import PlayerCalendar from "./pages/player/PlayerCalendar";
import PlayerProfile from "./pages/player/PlayerProfile";

// Coach pages
import CoachHome from "./pages/coach/CoachHome";
import CoachCalendar from "./pages/coach/CoachCalendar";
import CoachTrainings from "./pages/coach/CoachTrainings";
import CreateTraining from "./pages/coach/CreateTraining";
import TrainingDetail from "./pages/coach/TrainingDetail";
import CoachProfileEditor from "./pages/coach/CoachProfileEditor";

// School pages
import SchoolDashboard from "./pages/school/SchoolDashboard";
import SchoolCalendar from "./pages/school/SchoolCalendar";
import SchoolCoaches from "./pages/school/SchoolCoaches";
import SchoolProfileEditor from "./pages/school/SchoolProfileEditor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NavigationLoadingBar />
        <InstallPWA />
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/join/:inviteCode" element={<JoinTraining />} />

            {/* Player routes */}
            <Route path="/player" element={<ProtectedRoute requiredRole="player"><PlayerHome /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute requiredRole="player"><PlayerSearch /></ProtectedRoute>} />
            <Route path="/search/coach/:id" element={<ProtectedRoute requiredRole="player"><CoachPublicProfile /></ProtectedRoute>} />
            <Route path="/search/school/:id" element={<ProtectedRoute requiredRole="player"><SchoolPublicProfile /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute requiredRole="player"><PlayerCalendar /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requiredRole="player"><PlayerProfile /></ProtectedRoute>} />

            {/* Coach routes */}
            <Route path="/coach" element={<ProtectedRoute requiredRole="coach"><CoachHome /></ProtectedRoute>} />
            <Route path="/coach/calendar" element={<ProtectedRoute requiredRole="coach"><CoachCalendar /></ProtectedRoute>} />
            <Route path="/coach/trainings" element={<ProtectedRoute requiredRole="coach"><CoachTrainings /></ProtectedRoute>} />
            <Route path="/coach/trainings/new" element={<ProtectedRoute requiredRole="coach"><CreateTraining /></ProtectedRoute>} />
            <Route path="/coach/trainings/:id" element={<ProtectedRoute requiredRole="coach"><TrainingDetail /></ProtectedRoute>} />
            <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><CoachProfileEditor /></ProtectedRoute>} />

            {/* School routes */}
            <Route path="/school" element={<ProtectedRoute requiredRole="coach"><SchoolDashboard /></ProtectedRoute>} />
            <Route path="/school/calendar" element={<ProtectedRoute requiredRole="coach"><SchoolCalendar /></ProtectedRoute>} />
            <Route path="/school/coaches" element={<ProtectedRoute requiredRole="coach"><SchoolCoaches /></ProtectedRoute>} />
            <Route path="/school/profile" element={<ProtectedRoute requiredRole="coach"><SchoolProfileEditor /></ProtectedRoute>} />

            {/* Legacy redirect support */}
            <Route path="/player/dashboard" element={<ProtectedRoute requiredRole="player"><PlayerHome /></ProtectedRoute>} />
            <Route path="/coach/dashboard" element={<ProtectedRoute requiredRole="coach"><CoachHome /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
