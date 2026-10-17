import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { OpportunitiesDirectory } from './pages/OpportunitiesDirectory';
import { OpportunityDetail } from './pages/OpportunityDetail';
import { Profile } from './pages/Profile';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { TeamsDirectory } from './pages/TeamsDirectory';
import { TeamDetail } from './pages/TeamDetail';
import { PersonalDashboard } from './pages/PersonalDashboard';
import { AmbassadorCoordinator } from './pages/AmbassadorCoordinator';
import { Recommendations } from './pages/Recommendations';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, role } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/opportunities" replace />} />
          <Route path="/opportunities" element={<OpportunitiesDirectory />} />
          <Route path="/opportunities/:id" element={<OpportunityDetail />} />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <PersonalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <TeamsDirectory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <TeamDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Recommendations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['ambassador', 'coordinator']}>
                <AmbassadorCoordinator />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/opportunities" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CampusForge · BuildAP@theGnaN Mentorship Final Challenge · MVP</span>
          <span className="text-[11px] text-slate-400">Deterministic Rule-based Matching & Real-time Edge Enforcement</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
