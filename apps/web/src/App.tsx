import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Assistant } from "./pages/Assistant";
import { Knowledge } from "./pages/Knowledge";
import { Incidents } from "./pages/Incidents";
import { IncidentDetail } from "./pages/IncidentDetail";
import { AnalyticsPage } from "./pages/Analytics";
import { IoT } from "./pages/IoT";
import { AuditPage } from "./pages/Audit";
import { UsersPage } from "./pages/Users";

function Guard({ children, min = "staff" }: { children: React.ReactNode; min?: string }) {
  const { user, loading } = useAuth();
  const rank: Record<string, number> = { staff: 1, chef: 2, manager: 3, admin: 4 };
  if (loading) return <p style={{ padding: 40 }}>Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (rank[user.role] < rank[min]) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user && !loading ? <Navigate to="/" /> : <Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/iot" element={<IoT />} />
        <Route
          path="/analytics"
          element={
            <Guard min="manager">
              <AnalyticsPage />
            </Guard>
          }
        />
        <Route
          path="/audit"
          element={
            <Guard min="manager">
              <AuditPage />
            </Guard>
          }
        />
        <Route
          path="/users"
          element={
            <Guard min="admin">
              <UsersPage />
            </Guard>
          }
        />
      </Route>
    </Routes>
  );
}
