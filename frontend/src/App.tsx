import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useShopfloorStore } from './context/shopfloorStore';
import { useWebSocket } from './hooks/useWebSocket';
import { getWsUrl } from './config';

// Layout & Views
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitoring from './pages/Monitoring';
import WorkOrders from './pages/WorkOrders';
import Schedule from './pages/Schedule';
import Operator from './pages/Operator';
import Quality from './pages/Quality';
import Inventory from './pages/Inventory';
import MaterialManagement from './pages/MaterialManagement';
import Recipes from './pages/Recipes';
import Equipment from './pages/Equipment';
import Compliance from './pages/Compliance';
import Help from './pages/Help';
import AdminPanel from './pages/AdminPanel';
import TrackTrace from './pages/TrackTrace';
import SuperAdminSettings from './pages/SuperAdminSettings';

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
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
