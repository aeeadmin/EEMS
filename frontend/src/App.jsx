import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Auth Pages
import PortalChoice from './pages/auth/PortalChoice';
import AdminLogin from './pages/auth/AdminLogin';
import ManagerLogin from './pages/auth/ManagerLogin';
import UserLogin from './pages/auth/UserLogin';
import UserDashboard from './pages/auth/UserDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeDetails from './pages/admin/EmployeeDetails';
import Requests from './pages/admin/Requests';
import ManagerDetails from './pages/admin/ManagerDetails';
import AdminDetails from './pages/admin/AdminDetails';
import UpcomingRetirement from './pages/admin/UpcomingRetirement';
import Notifications from './pages/admin/Notifications';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import AdminDbEditor from './pages/admin/AdminDbEditor';
import AwarenessMail from './pages/admin/AwarenessMail';

// Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerEmployeeDetails from './pages/manager/ManagerEmployeeDetails';
import RequestStatus from './pages/manager/RequestStatus';
import ManagerNotifications from './pages/manager/ManagerNotifications';
import ManagerSettings from './pages/manager/ManagerSettings';

// Loading spinner
import LoadingSpinner from './components/common/LoadingSpinner';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect role mismatch to their correct home
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}

function AnonymousRoute({ children }) {
  const { user, loading, logout } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!loading && !hasChecked.current) {
      hasChecked.current = true;
      if (user) {
        logout();
      }
    }
  }, [loading, user, logout]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return children;
}

export default function App() {
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return (
    <Routes>
      {/* Choice Landing page */}
      <Route path="/" element={
        <AnonymousRoute>
          <PortalChoice />
        </AnonymousRoute>
      } />

      {/* Split Logins */}
      <Route path="/admin/login" element={
        <AnonymousRoute>
          <AdminLogin />
        </AnonymousRoute>
      } />
      <Route path="/manager/login" element={
        <AnonymousRoute>
          <ManagerLogin />
        </AnonymousRoute>
      } />
      <Route path="/user/login" element={
        <AnonymousRoute>
          <UserLogin />
        </AnonymousRoute>
      } />

      {/* User dashboard */}
      <Route path="/user/dashboard" element={
        <ProtectedRoute allowedRoles={['USER']}>
          <UserDashboard />
        </ProtectedRoute>
      } />

      {/* Admin Protected Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/employees" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <EmployeeDetails />
        </ProtectedRoute>
      } />
      <Route path="/admin/requests" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Requests />
        </ProtectedRoute>
      } />
      <Route path="/admin/managers" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <ManagerDetails />
        </ProtectedRoute>
      } />
      <Route path="/admin/admins" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDetails />
        </ProtectedRoute>
      } />
      <Route path="/admin/retirements" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <UpcomingRetirement />
        </ProtectedRoute>
      } />
      <Route path="/admin/notifications" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Notifications />
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/admin/awareness" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AwarenessMail />
        </ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AuditLogs />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/admin/db-editor" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDbEditor />
        </ProtectedRoute>
      } />

      {/* Manager Protected Routes */}
      <Route path="/manager/dashboard" element={
        <ProtectedRoute allowedRoles={['MANAGER']}>
          <ManagerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/manager/employees" element={
        <ProtectedRoute allowedRoles={['MANAGER']}>
          <ManagerEmployeeDetails />
        </ProtectedRoute>
      } />
      <Route path="/manager/requests" element={
        <ProtectedRoute allowedRoles={['MANAGER']}>
          <RequestStatus />
        </ProtectedRoute>
      } />
      <Route path="/manager/notifications" element={
        <ProtectedRoute allowedRoles={['MANAGER']}>
          <ManagerNotifications />
        </ProtectedRoute>
      } />
      <Route path="/manager/settings" element={
        <ProtectedRoute allowedRoles={['MANAGER']}>
          <ManagerSettings />
        </ProtectedRoute>
      } />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
