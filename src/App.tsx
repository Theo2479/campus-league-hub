import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import ChatPage from "./pages/ChatPage";

// Referee Pages
import RefereeDashboard from "./pages/referee/RefereeDashboard";
import RefereeAvailability from "./pages/referee/RefereeAvailability";
import RefereeGames from "./pages/referee/RefereeGames";

// Captain Pages
import CaptainDashboard from "./pages/captain/CaptainDashboard";
import CaptainFixtures from "./pages/captain/CaptainFixtures";
import FriendlyMarket from "./pages/captain/FriendlyMarket";


// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApprovals from "./pages/admin/AdminApprovals";
import ManageGames from "./pages/admin/ManageGames";
import TeamManagement from "./pages/admin/TeamManagement";
import LeagueManagement from "./pages/admin/LeagueManagement";
import PitchManagement from "./pages/admin/PitchManagement";
import RefereeManagement from "./pages/admin/RefereeManagement";
import CaptainManagement from "./pages/admin/CaptainManagement";
import EmergencyControl from "./pages/admin/EmergencyControl";
import AdminAllocation from "./pages/admin/AdminAllocation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Login - redirects if already authenticated */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            <Navigate to={`/${user.role === 'captain' ? 'captain' : user.role}`} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Referee Routes */}
      <Route
        path="/referee"
        element={
          <ProtectedRoute allowedRoles={['referee']}>
            <RefereeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referee/availability"
        element={
          <ProtectedRoute allowedRoles={['referee']}>
            <RefereeAvailability />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referee/games"
        element={
          <ProtectedRoute allowedRoles={['referee']}>
            <RefereeGames />
          </ProtectedRoute>
        }
      />

      {/* Captain Routes */}
      <Route
        path="/captain"
        element={
          <ProtectedRoute allowedRoles={['captain']}>
            <CaptainDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/captain/fixtures"
        element={
          <ProtectedRoute allowedRoles={['captain']}>
            <CaptainFixtures />
          </ProtectedRoute>
        }
      />
      <Route
        path="/captain/friendlies"
        element={
          <ProtectedRoute allowedRoles={['captain']}>
            <FriendlyMarket />
          </ProtectedRoute>
        }
      />


      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leagues"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <LeagueManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pitches"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PitchManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/referees"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RefereeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/captains"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CaptainManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/games"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageGames />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TeamManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminApprovals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/emergency"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmergencyControl />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/allocation"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAllocation />
          </ProtectedRoute>
        }
      />

      {/* Common Routes */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
