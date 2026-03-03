import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
