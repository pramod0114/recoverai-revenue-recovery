import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { RecoveryCasesPage } from './pages/RecoveryCasesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { InterventionsPage } from './pages/InterventionsPage';
import { RevenueAnalyticsPage } from './pages/RevenueAnalyticsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AiActivityPage } from './pages/AiActivityPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { RecoveryPoliciesPage } from './pages/admin/RecoveryPoliciesPage';
import { SystemConfigurationPage } from './pages/admin/SystemConfigurationPage';
import { AccessRestricted } from './components/common/AccessRestricted';

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center text-[#667085] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading RecoverAI Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function AdminRoute({ element, pageName }: { element: React.ReactElement; pageName: string }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return <AccessRestricted requiredRole="ADMIN" pageName={pageName} />;
  }
  return element;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/recovery" element={<RecoveryCasesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/interventions" element={<InterventionsPage />} />
            <Route path="/analytics" element={<RevenueAnalyticsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/ai-activity" element={<AiActivityPage />} />
            <Route path="/audit" element={<AuditLogsPage />} />
            <Route path="/system-health" element={<SystemHealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Admin-only Routes */}
            <Route
              path="/admin/users"
              element={<AdminRoute element={<UserManagementPage />} pageName="User Management" />}
            />
            <Route
              path="/admin/policies"
              element={<AdminRoute element={<RecoveryPoliciesPage />} pageName="Recovery Policies" />}
            />
            <Route
              path="/admin/configuration"
              element={<AdminRoute element={<SystemConfigurationPage />} pageName="System Configuration" />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
