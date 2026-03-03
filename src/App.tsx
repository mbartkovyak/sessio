import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavigationLoadingBar from "@/components/NavigationLoadingBar";
import InstallPWA from "@/components/InstallPWA";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import CoachDashboard from "./pages/CoachDashboard";
import CoachGroups from "./pages/CoachGroups";
import CoachProfile from "./pages/CoachProfile";
import CoachNotifications from "./pages/CoachNotifications";
import CreateGroup from "./pages/CreateGroup";
import GroupDetail from "./pages/GroupDetail";
import SessionDetail from "./pages/SessionDetail";
import PlayerDashboard from "./pages/PlayerDashboard";
import PlayerNotifications from "./pages/PlayerNotifications";
import CoachMessages from "./pages/CoachMessages";
import PlayerMessages from "./pages/PlayerMessages";
import GroupChat from "./pages/GroupChat";
import PlayerProfile from "./pages/PlayerProfile";
import PlayerSpots from "./pages/PlayerSpots";
import JoinGroup from "./pages/JoinGroup";
import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/coach/dashboard" element={<ProtectedRoute requiredRole="coach"><CoachDashboard /></ProtectedRoute>} />
            <Route path="/coach/groups" element={<ProtectedRoute requiredRole="coach"><CoachGroups /></ProtectedRoute>} />
            <Route path="/coach/groups/new" element={<ProtectedRoute requiredRole="coach"><CreateGroup /></ProtectedRoute>} />
            <Route path="/coach/group/:id" element={<ProtectedRoute requiredRole="coach"><GroupDetail /></ProtectedRoute>} />
            <Route path="/coach/session/:id" element={<ProtectedRoute requiredRole="coach"><SessionDetail /></ProtectedRoute>} />
            <Route path="/coach/notifications" element={<ProtectedRoute requiredRole="coach"><CoachNotifications /></ProtectedRoute>} />
            <Route path="/coach/profile" element={<ProtectedRoute requiredRole="coach"><CoachProfile /></ProtectedRoute>} />
            <Route path="/player/dashboard" element={<ProtectedRoute requiredRole="player"><PlayerDashboard /></ProtectedRoute>} />
            <Route path="/player/notifications" element={<ProtectedRoute requiredRole="player"><PlayerNotifications /></ProtectedRoute>} />
            <Route path="/player/profile" element={<ProtectedRoute requiredRole="player"><PlayerProfile /></ProtectedRoute>} />
            <Route path="/player/spots" element={<ProtectedRoute requiredRole="player"><PlayerSpots /></ProtectedRoute>} />
            <Route path="/coach/messages" element={<ProtectedRoute requiredRole="coach"><CoachMessages /></ProtectedRoute>} />
            <Route path="/coach/messages/:groupId" element={<ProtectedRoute requiredRole="coach"><GroupChat /></ProtectedRoute>} />
            <Route path="/player/messages" element={<ProtectedRoute requiredRole="player"><PlayerMessages /></ProtectedRoute>} />
            <Route path="/player/messages/:groupId" element={<ProtectedRoute requiredRole="player"><GroupChat /></ProtectedRoute>} />
            <Route path="/join/:inviteCode" element={<JoinGroup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
