import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Bot, ClipboardList, Gauge, LayoutDashboard, LogOut, Radio, ScrollText, Users, ChefHat } from "lucide-react";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/", label: "Live Station", icon: LayoutDashboard, min: "staff" },
  { to: "/assistant", label: "Operations Copilot", icon: Bot, min: "staff" },
  { to: "/knowledge", label: "Knowledge Vault", icon: BookOpen, min: "staff" },
  { to: "/incidents", label: "Incident Log", icon: ClipboardList, min: "staff" },
  { to: "/iot", label: "Telemetry & Probes", icon: Radio, min: "staff" },
  { to: "/analytics", label: "Intelligence", icon: Gauge, min: "manager" },
  { to: "/audit", label: "Audit Trail", icon: ScrollText, min: "manager" },
  { to: "/users", label: "Team & Access", icon: Users, min: "admin" },
];

const rank: Record<string, number> = { staff: 1, chef: 2, manager: 3, admin: 4 };

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="nav">
        <div className="brand">
          <div className="brand-badge">Kitchen Intelligence</div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--copper-gradient)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(224, 122, 56, 0.4)",
              }}
            >
              <ChefHat size={22} />
            </div>
            <h1>RestaurantOps</h1>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links
            .filter((l) => rank[user?.role ?? "staff"] >= rank[l.min])
            .map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"}>
                <l.icon size={17} /> {l.label}
              </NavLink>
            ))}
        </div>

        <div className="nav-foot">
          <div className="row space" style={{ alignItems: "center" }}>
            <div>
              <strong>{user?.name}</strong>
              <span>
                {user?.role} · {user?.department}
              </span>
            </div>
            <span className="badge sage" style={{ textTransform: "capitalize" }}>
              Active
            </span>
          </div>
          <button className="linkish" onClick={() => logout()}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
