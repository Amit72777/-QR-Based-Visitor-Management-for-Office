/**
 * App.js — root component.
 *
 * v2 changes:
 *   - Wrapped in ThemeProvider (dark/light mode)
 *   - Added routes: /profile, /branches, /audit
 *   - Guards are redirected to /scan, everyone else to /dashboard
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth }    from './context/AuthContext';
import { ThemeProvider }            from './context/ThemeContext';
import ProtectedRoute               from './components/ProtectedRoute';
import Navbar                       from './components/Navbar';

import LoginPage        from './pages/LoginPage';
import VisitorFormPage  from './pages/VisitorFormPage';
import QRDisplayPage    from './pages/QRDisplayPage';
import ScannerPage      from './pages/ScannerPage';
import DashboardPage    from './pages/DashboardPage';
import UsersPage        from './pages/UsersPage';
import ProfilePage      from './pages/ProfilePage';
import BranchesPage     from './pages/BranchesPage';
import AuditPage        from './pages/AuditPage';



// Smart home redirect based on role
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.user_role === 'guard') return <Navigate to="/scan" replace />;
  return <Navigate to="/dashboard" replace />;
};

const Unauthorized = () => (
  <div style={{ textAlign: 'center', padding: '80px 24px' }}>
    <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
    <h2 style={{ fontSize: 24, marginBottom: 8 }}>Access Denied</h2>
    <p style={{ color: 'var(--muted)' }}>You don't have permission to view this page.</p>
  </div>
);

// Shared layout wrapper — renders navbar above the page content
const Layout = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

const AppRoutes = () => (
  <Routes>
    {/* ── Public routes (no auth needed) ─────────────────────── */}
    <Route path="/login"            element={<LoginPage />} />
    <Route path="/register-visitor" element={<VisitorFormPage />} />
    <Route path="/qr-display"       element={<QRDisplayPage />} />

    {/* ── All logged-in users ─────────────────────────────────── */}
    <Route path="/register" element={
      <Layout><ProtectedRoute><VisitorFormPage /></ProtectedRoute></Layout>
    } />

    <Route path="/profile" element={
      <Layout><ProtectedRoute><ProfilePage /></ProtectedRoute></Layout>
    } />

    {/* ── Guard + above ──────────────────────────────────────── */}
    <Route path="/scan" element={
      <Layout>
        <ProtectedRoute roles={['guard', 'admin', 'super_admin']}>
          <ScannerPage />
        </ProtectedRoute>
      </Layout>
    } />

    {/* ── Admin + super_admin ─────────────────────────────────── */}
    <Route path="/dashboard" element={
      <Layout>
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <DashboardPage />
        </ProtectedRoute>
      </Layout>
    } />

    {/* ── Super admin only ────────────────────────────────────── */}
    <Route path="/users" element={
      <Layout>
        <ProtectedRoute roles={['super_admin']}>
          <UsersPage />
        </ProtectedRoute>
      </Layout>
    } />

    <Route path="/branches" element={
      <Layout>
        <ProtectedRoute roles={['super_admin']}>
          <BranchesPage />
        </ProtectedRoute>
      </Layout>
    } />

    <Route path="/audit" element={
      <Layout>
        <ProtectedRoute roles={['super_admin']}>
          <AuditPage />
        </ProtectedRoute>
      </Layout>
    } />

    {/* ── Fallbacks ───────────────────────────────────────────── */}
    <Route path="/unauthorized" element={<Layout><Unauthorized /></Layout>} />
    <Route path="/"             element={<HomeRedirect />} />
    <Route path="*"             element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
