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

// Referee Pages
import RefereeDashboard from "./pages/referee/RefereeDashboard";
import RefereeAvailability from "./pages/referee/RefereeAvailability";
import RefereeGames from "./pages/referee/RefereeGames";

// Captain Pages
import CaptainDashboard from "./pages/captain/CaptainDashboard";
import CaptainFixtures from "./pages/captain/CaptainFixtures";
import FriendlyMarket from "./pages/captain/FriendlyMarket";
import SubmitScores from "./pages/captain/SubmitScores";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApprovals from "./pages/admin/AdminApprovals";
import EmergencyControl from "./pages/admin/EmergencyControl";

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
      <Route
        path="/captain/scores"
        element={
          <ProtectedRoute allowedRoles={['captain']}>
            <SubmitScores />
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
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
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
