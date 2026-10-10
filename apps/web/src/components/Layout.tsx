import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Bot, ClipboardList, Gauge, LayoutDashboard, LogOut, Radio, ScrollText, Users } from "lucide-react";
import { useAuth } from "../lib/auth";

const links = [
  { to: "/", label: "Board", icon: LayoutDashboard, min: "staff" },
  { to: "/assistant", label: "Assistant", icon: Bot, min: "staff" },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen, min: "staff" },
  { to: "/incidents", label: "Incidents", icon: ClipboardList, min: "staff" },
  { to: "/iot", label: "Sensors (sim)", icon: Radio, min: "staff" },
  { to: "/analytics", label: "Intelligence", icon: Gauge, min: "manager" },
  { to: "/audit", label: "Audit", icon: ScrollText, min: "manager" },
  { to: "/users", label: "People", icon: Users, min: "admin" },
];

const rank: Record<string, number> = { staff: 1, chef: 2, manager: 3, admin: 4 };

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="nav">
        <div className="brand">
          <small>Organizational memory</small>
          <h1>RestaurantOps</h1>
        </div>
        {links
          .filter((l) => rank[user?.role ?? "staff"] >= rank[l.min])
          .map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>
              <l.icon size={16} /> {l.label}
            </NavLink>
          ))}
        <div className="nav-foot">
          <strong>{user?.name}</strong>
          <span>
            {user?.role} · {user?.department}
          </span>
          <button className="linkish" onClick={() => logout()}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
