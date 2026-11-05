import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useShopfloorStore } from './context/shopfloorStore';
import { useWebSocket } from './hooks/useWebSocket';
import { getWsUrl } from './config';
import Layout from './components/Layout';
import Login from './pages/Login';

// Lazy-loaded Views for Bundle Optimization & Fast Initial Page Load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Operator = lazy(() => import('./pages/Operator'));
const Quality = lazy(() => import('./pages/Quality'));
const Inventory = lazy(() => import('./pages/Inventory'));
const MaterialManagement = lazy(() => import('./pages/MaterialManagement'));
const Recipes = lazy(() => import('./pages/Recipes'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Help = lazy(() => import('./pages/Help'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TrackTrace = lazy(() => import('./pages/TrackTrace'));
const SuperAdminSettings = lazy(() => import('./pages/SuperAdminSettings'));

// Sleek Industrial Loading Spinner during module chunk fetch
function ModuleLoader() {
  return (
    <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 rounded-full border-2 border-[#174A7C]/20 border-t-[#174A7C] animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
        Loading Module...
      </p>
    </div>
  );
}

// Route protector for secure JWT access
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useShopfloorStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route protector for SUPER_ADMIN and ADMIN roles
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useShopfloorStore((state) => state.user);
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  // Start listening to backend WebSocket channels for status changes and scrap warnings
  useWebSocket(getWsUrl());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<ModuleLoader />}>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="monitoring" element={<Monitoring />} />
                    <Route path="work-orders" element={<WorkOrders />} />
                    <Route path="schedule" element={<Schedule />} />
                    <Route path="operator" element={<Operator />} />
                    <Route path="quality" element={<Quality />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="material-management" element={<MaterialManagement />} />
                    <Route path="recipes" element={<Recipes />} />
                    <Route path="equipment" element={<Equipment />} />
                    <Route path="compliance" element={<Compliance />} />
                    <Route path="trace/:tab?" element={<TrackTrace />} />
                    <Route path="help/:tab?" element={<Help />} />
                    <Route path="help" element={<Help />} />
                    <Route path="admin/:tab?" element={<AdminPanel />} />
                    <Route path="admin" element={<AdminPanel />} />
                    <Route path="super-admin" element={<SuperAdminRoute><SuperAdminSettings /></SuperAdminRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
