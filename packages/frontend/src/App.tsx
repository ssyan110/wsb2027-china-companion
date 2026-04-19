import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { useAppStore } from './stores/app.store';
import { useAuthStore } from './stores/auth.store';
import type { RoleType } from '@wsb/shared';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import QrDisplay from './pages/QrDisplay';
import FamilyWallet from './pages/FamilyWallet';
import Itinerary from './pages/Itinerary';
import Notifications from './pages/Notifications';
import ToolkitHub from './pages/ToolkitHub';
import TaxiCard from './pages/TaxiCard';
import Phrasebook from './pages/Phrasebook';
import CurrencyConverter from './pages/CurrencyConverter';
import EmergencyInfo from './pages/EmergencyInfo';
import StaffScanner from './pages/StaffScanner';
import StaffRescue from './pages/StaffRescue';
import AdminDashboard from './pages/AdminDashboard';
import AdminTravelers from './pages/AdminTravelers';
import AdminGroups from './pages/AdminGroups';
import AdminEvents from './pages/AdminEvents';
import AdminDispatch from './pages/AdminDispatch';
import AdminNotifications from './pages/AdminNotifications';
import AdminAudit from './pages/AdminAudit';
import AdminMasterList from './pages/AdminMasterList';

// Ops Panel
import { OpsLayout } from './components/ops/OpsLayout';
import { OpsMasterTable } from './pages/ops/OpsMasterTable';
import { OpsRooms } from './pages/ops/OpsRooms';
import { OpsFlights } from './pages/ops/OpsFlights';
import { OpsEvents } from './pages/ops/OpsEvents';
import { OpsAuditLog } from './pages/ops/OpsAuditLog';
import { OpsLogin } from './pages/ops/OpsLogin';

export function App() {
  const setOnline = useAppStore((s) => s.setOnline);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const [autoLoginDone, setAutoLoginDone] = useState(false);

  // Auto-login disabled in production — users pick from Quick Login tab
  // To re-enable for local dev, uncomment the block below
  /*
  useEffect(() => {
    if (isAuthenticated || autoLoginDone) return;
    const demoUserId = 'f0000001-0000-0000-0000-000000000001';
    fetch(`/api/v1/dev/login/${demoUserId}`)
      .then((res) => res.json())
      .then((data: { session_token: string; traveler_id: string; role_type: string }) => {
        login(data.session_token, data.traveler_id, data.role_type as RoleType);
        setAutoLoginDone(true);
      })
      .catch(() => setAutoLoginDone(true));
  }, [isAuthenticated, autoLoginDone, login]);
  */

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [setOnline]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QrDisplay />} />
        <Route path="/family" element={<FamilyWallet />} />
        <Route path="/itinerary" element={<Itinerary />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/toolkit" element={<ToolkitHub />} />
        <Route path="/toolkit/taxi" element={<TaxiCard />} />
        <Route path="/toolkit/phrasebook" element={<Phrasebook />} />
        <Route path="/toolkit/currency" element={<CurrencyConverter />} />
        <Route path="/toolkit/emergency" element={<EmergencyInfo />} />
        <Route path="/staff/scan" element={<StaffScanner />} />
        <Route path="/staff/rescue" element={<StaffRescue />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/travelers" element={<AdminTravelers />} />
        <Route path="/admin/groups" element={<AdminGroups />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/dispatch" element={<AdminDispatch />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/admin/master-list" element={<AdminMasterList />} />
      </Route>

      {/* Ops Panel route tree */}
      <Route path="/ops/login" element={<OpsLogin />} />
      <Route path="/ops" element={<OpsLayout />}>
        <Route index element={<Navigate to="/ops/travelers" replace />} />
        <Route path="travelers" element={<OpsMasterTable />} />
        <Route path="rooms" element={<OpsRooms />} />
        <Route path="flights" element={<OpsFlights />} />
        <Route path="events" element={<OpsEvents />} />
        <Route path="audit" element={<OpsAuditLog />} />
      </Route>
    </Routes>
  );
}
